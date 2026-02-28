'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { StreamSession } from '@/types/streamTypes';
import type { BasketballGame, BasketballTeam } from '@/types/basketball';
import { Trash2, ExternalLink, Video, Clock, Users, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
}

export default function StreamHistoryPage() {
    const [streams, setStreams] = useState<StreamSession[]>([]);
    const [games, setGames] = useState<Map<string, BasketballGame>>(new Map());
    const [teams, setTeams] = useState<Map<string, BasketballTeam>>(new Map());
    const [loading, setLoading] = useState(true);

    // Fetch streams
    useEffect(() => {
        const q = query(collection(db, 'basketball_streams'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as StreamSession));
            setStreams(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // Fetch games referenced by streams
    useEffect(() => {
        const gameIds = [...new Set(streams.map(s => s.gameId))];
        if (gameIds.length === 0) return;

        const unsubs: (() => void)[] = [];
        gameIds.forEach(gameId => {
            const unsub = onSnapshot(doc(db, 'basketball_games', gameId), (snap) => {
                if (snap.exists()) {
                    const gameData = { id: snap.id, ...snap.data() } as BasketballGame;
                    setGames(prev => new Map(prev).set(gameId, gameData));

                    // Also fetch teams
                    [gameData.homeTeamId, gameData.awayTeamId].forEach(teamId => {
                        if (!teams.has(teamId)) {
                            const teamUnsub = onSnapshot(doc(db, 'basketball_teams', teamId), (tSnap) => {
                                if (tSnap.exists()) {
                                    setTeams(prev => new Map(prev).set(teamId, { id: tSnap.id, ...tSnap.data() } as BasketballTeam));
                                }
                            });
                            unsubs.push(teamUnsub);
                        }
                    });
                }
            });
            unsubs.push(unsub);
        });

        return () => unsubs.forEach(u => u());
    }, [streams]);

    const handleDelete = async (streamId: string) => {
        if (!confirm('Delete this stream record? This cannot be undone.')) return;
        try {
            await deleteDoc(doc(db, 'basketball_streams', streamId));
            toast.success('Stream record deleted');
        } catch (error) {
            console.error('Error deleting stream:', error);
            toast.error('Failed to delete stream record');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'live':
                return <span className="px-2.5 py-1 bg-red-900/30 text-red-400 rounded-full text-xs font-bold animate-pulse">LIVE</span>;
            case 'ended':
                return <span className="px-2.5 py-1 bg-green-900/30 text-green-400 rounded-full text-xs font-bold">COMPLETED</span>;
            default:
                return <span className="px-2.5 py-1 bg-neutral-700 text-neutral-400 rounded-full text-xs font-bold">IDLE</span>;
        }
    };

    const getGameMatchup = (gameId: string) => {
        const game = games.get(gameId);
        if (!game) return 'Loading...';

        const homeTeam = teams.get(game.homeTeamId);
        const awayTeam = teams.get(game.awayTeamId);

        return `${awayTeam?.abbreviation || 'AWAY'} @ ${homeTeam?.abbreviation || 'HOME'}`;
    };

    const getStreamDuration = (stream: StreamSession): string => {
        if (!stream.startedAt || !stream.endedAt) return '—';
        const start = stream.startedAt instanceof Timestamp ? stream.startedAt.toDate() : new Date(stream.startedAt);
        const end = stream.endedAt instanceof Timestamp ? stream.endedAt.toDate() : new Date(stream.endedAt);
        const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
        return formatDuration(seconds);
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-black dark:text-white">Stream History</h1>
                    <p className="text-black dark:text-gray-400">Past and active live video streams.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-600/10 border border-purple-600/20 rounded-xl">
                    <Video className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-bold text-purple-500">{streams.length} Total Streams</span>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Game</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Date</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Status</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Duration</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Peak Viewers</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300">Resolution</th>
                                <th className="px-6 py-4 font-semibold text-black dark:text-gray-300 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading streams...</td></tr>
                            ) : streams.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Video className="w-10 h-10 text-neutral-600" />
                                        <span className="text-gray-500">No streams recorded yet</span>
                                        <span className="text-gray-600 text-sm">Start a live stream from any game to see it here</span>
                                    </div>
                                </td></tr>
                            ) : (
                                streams.map(stream => {
                                    const startDate = stream.startedAt
                                        ? (stream.startedAt instanceof Timestamp ? stream.startedAt.toDate() : new Date(stream.startedAt))
                                        : null;

                                    return (
                                        <tr key={stream.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {getGameMatchup(stream.gameId)}
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono mt-0.5">
                                                    {stream.gameId.slice(0, 8)}...
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {startDate ? format(startDate, 'MMM d, yyyy') : '—'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {startDate ? format(startDate, 'h:mm a') : ''}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(stream.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-white">
                                                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                                                    {getStreamDuration(stream)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-white">
                                                    <Users className="w-3.5 h-3.5 text-gray-500" />
                                                    {stream.viewerPeak}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-mono text-gray-500">
                                                    {stream.resolution || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {stream.recordingUrl && (
                                                        <a
                                                            href={stream.recordingUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                            title="View Recording"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(stream.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
