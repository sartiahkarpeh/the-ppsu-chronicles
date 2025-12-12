'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Radio, MonitorPlay, Clock, ChevronRight, Camera } from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Fixture } from '@/types/fixtureTypes';
import type { Team } from '@/types/afcon';
import type { StreamRoom } from '@/types/signalingTypes';
import dayjs from 'dayjs';

export default function BroadcastSelectPage() {
    const router = useRouter();
    const [fixtures, setFixtures] = useState<Fixture[]>([]);
    const [teams, setTeams] = useState<Map<string, Team>>(new Map());
    const [rooms, setRooms] = useState<Map<string, StreamRoom>>(new Map());
    const [loading, setLoading] = useState(true);

    // Fetch teams
    useEffect(() => {
        const fetchTeams = async () => {
            const q = query(collection(db, 'afcon_teams'), orderBy('name'));
            const snapshot = await getDocs(q);
            const teamsMap = new Map<string, Team>();
            snapshot.docs.forEach(doc => {
                teamsMap.set(doc.id, { id: doc.id, ...doc.data() } as Team);
            });
            setTeams(teamsMap);
        };
        fetchTeams();
    }, []);

    // Subscribe to live/upcoming fixtures
    useEffect(() => {
        const q = query(
            collection(db, 'fixtures'),
            where('status', 'in', ['live', 'ht', 'upcoming']),
            orderBy('kickoffDateTime', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fixturesData = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                const homeTeam = teams.get(data.homeTeamId);
                const awayTeam = teams.get(data.awayTeamId);

                return {
                    id: docSnap.id,
                    ...data,
                    homeTeamName: homeTeam?.name || 'TBD',
                    homeTeamLogoUrl: homeTeam?.flag_url || homeTeam?.crest_url || '',
                    awayTeamName: awayTeam?.name || 'TBD',
                    awayTeamLogoUrl: awayTeam?.flag_url || awayTeam?.crest_url || '',
                } as Fixture;
            });
            setFixtures(fixturesData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [teams]);

    // Subscribe to broadcast rooms
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'broadcast_rooms'), (snapshot) => {
            const roomsMap = new Map<string, StreamRoom>();
            snapshot.docs.forEach(doc => {
                roomsMap.set(doc.id, doc.data() as StreamRoom);
            });
            setRooms(roomsMap);
        });

        return () => unsubscribe();
    }, []);

    const getConnectedCameras = (fixtureId: string): number => {
        const room = rooms.get(fixtureId);
        if (!room?.cameras) return 0;
        return Object.values(room.cameras).filter(Boolean).length;
    };

    const isLive = (fixtureId: string): boolean => {
        const room = rooms.get(fixtureId);
        return room?.isLive || false;
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="px-4 py-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                            <MonitorPlay className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Broadcast Dashboard</h1>
                            <p className="text-sm text-gray-500">Manage camera feeds & live streaming</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="px-4 py-4">
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {fixtures.filter(f => f.status === 'live' || f.status === 'ht').length}
                        </p>
                        <p className="text-xs text-gray-500">Live Matches</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
                        <p className="text-2xl font-bold text-green-600">
                            {Array.from(rooms.values()).reduce((acc, room) =>
                                acc + Object.values(room.cameras || {}).filter(Boolean).length, 0
                            )}
                        </p>
                        <p className="text-xs text-gray-500">Cameras Online</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
                        <p className="text-2xl font-bold text-red-500">
                            {Array.from(rooms.values()).filter(r => r.isLive).length}
                        </p>
                        <p className="text-xs text-gray-500">Broadcasting</p>
                    </div>
                </div>
            </div>

            {/* Fixtures List */}
            <div className="px-4 pb-8">
                <h2 className="text-sm text-gray-500 uppercase tracking-wider mb-3 font-medium">Select Match to Broadcast</h2>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : fixtures.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <MonitorPlay className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No live or upcoming matches</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {fixtures.map((fixture) => {
                            const connectedCameras = getConnectedCameras(fixture.id);
                            const broadcasting = isLive(fixture.id);

                            return (
                                <motion.button
                                    key={fixture.id}
                                    onClick={() => router.push(`/admin/afcon25/broadcast/${fixture.id}`)}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 hover:border-purple-500/50 transition-all flex items-center gap-4"
                                >
                                    {/* Match Info */}
                                    <div className="flex-1 text-left">
                                        <div className="flex items-center gap-2 mb-2">
                                            {broadcasting && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded-full text-xs text-white font-bold">
                                                    <Radio className="w-3 h-3" />
                                                    LIVE
                                                </span>
                                            )}
                                            {fixture.status === 'live' || fixture.status === 'ht' ? (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded-full text-xs text-red-600 dark:text-red-400">
                                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                                    {fixture.status === 'live' ? 'MATCH LIVE' : 'HT'}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full text-xs text-blue-600 dark:text-blue-400">
                                                    <Clock className="w-3 h-3" />
                                                    {dayjs(fixture.kickoffDateTime instanceof Timestamp ? fixture.kickoffDateTime.toDate() : fixture.kickoffDateTime).format('HH:mm')}
                                                </span>
                                            )}
                                            {connectedCameras > 0 && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full text-xs text-green-600 dark:text-green-400">
                                                    <Camera className="w-3 h-3" />
                                                    {connectedCameras} cam{connectedCameras !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                {fixture.homeTeamLogoUrl && (
                                                    <img src={fixture.homeTeamLogoUrl} alt="" className="w-8 h-8 object-contain" />
                                                )}
                                                <span className="text-gray-900 dark:text-white font-medium">{fixture.homeTeamName}</span>
                                            </div>
                                            <span className="text-gray-400">vs</span>
                                            <div className="flex items-center gap-2">
                                                {fixture.awayTeamLogoUrl && (
                                                    <img src={fixture.awayTeamLogoUrl} alt="" className="w-8 h-8 object-contain" />
                                                )}
                                                <span className="text-gray-900 dark:text-white font-medium">{fixture.awayTeamName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </motion.button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="px-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                    <h3 className="text-sm text-purple-900 dark:text-purple-100 font-medium mb-2">📺 Quick Start</h3>
                    <ol className="text-xs text-purple-700 dark:text-purple-300 space-y-1 list-decimal list-inside">
                        <li>Have smartphones open camera app: <code className="bg-purple-200 dark:bg-purple-800 px-1 rounded">/admin/afcon25/camera</code></li>
                        <li>Each phone selects a Camera ID (1-4) and the same match</li>
                        <li>Click a match above to open the 4-camera dashboard</li>
                        <li>Click "Go Live" on any camera to broadcast it</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
