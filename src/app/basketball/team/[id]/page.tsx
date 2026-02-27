'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import type { BasketballTeam, BasketballPlayer, BasketballGame } from '@/types/basketball';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import LazyImage from '@/components/basketball/LazyImage';

export default function TeamDetailPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();

    const [team, setTeam] = useState<BasketballTeam | null>(null);
    const [players, setPlayers] = useState<BasketballPlayer[]>([]);
    const [games, setGames] = useState<BasketballGame[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter helpers
    const [activeTab, setActiveTab] = useState<'roster' | 'schedule'>('roster');

    useEffect(() => {
        if (!id) return;

        const unsubscribeTeam = onSnapshot(doc(db, 'basketball_teams', id), async (docSnap) => {
            if (docSnap.exists()) {
                const teamData = { id: docSnap.id, ...docSnap.data() } as BasketballTeam;
                setTeam(teamData);

                // Fetch Players
                const qPlayers = query(
                    collection(db, 'basketball_players'),
                    where('teamId', '==', id)
                );
                const pSnap = await getDocs(qPlayers);
                const pList = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as BasketballPlayer));
                // Sort by number
                pList.sort((a, b) => (a.number || 0) - (b.number || 0));
                setPlayers(pList);

                // Fetch Games (Home & Away)
                const qGames1 = query(collection(db, 'basketball_games'), where('homeTeamId', '==', id));
                const qGames2 = query(collection(db, 'basketball_games'), where('awayTeamId', '==', id));

                const [g1, g2] = await Promise.all([getDocs(qGames1), getDocs(qGames2)]);
                const allGames = [...g1.docs, ...g2.docs].map(d => ({ id: d.id, ...d.data() } as BasketballGame));

                // Sort ascending by date
                allGames.sort((a, b) => {
                    const dateA = typeof a.date === 'string' ? new Date(a.date).getTime() : (a.date as any).toDate?.().getTime() || 0;
                    const dateB = typeof b.date === 'string' ? new Date(b.date).getTime() : (b.date as any).toDate?.().getTime() || 0;
                    return dateA - dateB;
                });
                setGames(allGames);
            }
            setLoading(false);
        });

        return () => unsubscribeTeam();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center pt-24 animate-pulse px-4">
                <div className="w-full max-w-7xl h-80 bg-neutral-900 rounded-3xl mb-12 border border-neutral-800"></div>
                <div className="w-full max-w-7xl h-96 bg-neutral-900 rounded-3xl border border-neutral-800"></div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
                <h1 className="text-3xl font-display font-bold">Team Not Found</h1>
                <button onClick={() => router.back()} className="mt-4 text-orange-500 hover:text-orange-400 font-medium">
                    ← Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans">
            {/* Hero Profile Section */}
            <div className="relative bg-black w-full overflow-hidden border-b border-neutral-800">

                {/* Abstract Background Element based on Team Color */}
                <div
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{ background: team.primaryColor ? `radial-gradient(ellipse at bottom, ${team.primaryColor}, transparent 60%)` : 'none' }}
                ></div>

                <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 lg:py-16 relative z-10">
                    <button onClick={() => router.back()} className="mb-8 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-semibold tracking-wider uppercase">Back</span>
                    </button>

                    <div className="flex flex-col md:flex-row items-center md:items-end gap-8 md:gap-12">
                        {/* Team Logo */}
                        <div className="w-48 h-48 md:w-64 md:h-64 rounded-xl border-4 border-neutral-800 bg-neutral-900/50 backdrop-blur-sm overflow-hidden shrink-0 relative shadow-2xl p-6 flex items-center justify-center">
                            {team.logo ? (
                                <LazyImage src={team.logo} alt={team.abbreviation} fill className="!object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
                            ) : (
                                <div className="text-7xl font-bold font-display text-neutral-600">
                                    {team.abbreviation.toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Team Info */}
                        <div className="text-center md:text-left flex-1 w-full">
                            <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tight leading-none mb-4">
                                {team.name}
                            </h1>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8 mt-6">
                                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 flex flex-col items-center">
                                    <span className="text-3xl font-mono font-black text-white">{team.wins}</span>
                                    <span className="text-xs uppercase tracking-widest text-neutral-500 font-bold mt-1">Wins</span>
                                </div>
                                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 flex flex-col items-center">
                                    <span className="text-3xl font-mono font-black text-white">{team.losses}</span>
                                    <span className="text-xs uppercase tracking-widest text-neutral-500 font-bold mt-1">Losses</span>
                                </div>
                                {(team.wins > 0 || team.losses > 0) && (
                                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-4 flex flex-col items-center">
                                        <span className="text-3xl font-mono font-black text-white">.{((team.wins / (team.wins + team.losses)) * 1000).toFixed(0)}</span>
                                        <span className="text-xs uppercase tracking-widest text-neutral-500 font-bold mt-1">Win %</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Switcher Tabs */}
            <div className="border-b border-neutral-800 bg-black sticky top-16 md:top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('roster')}
                            className={`py-4 font-display font-bold uppercase tracking-widest text-sm transition-colors relative border-b-2 ${activeTab === 'roster' ? 'text-white border-orange-500' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}
                        >
                            Roster
                        </button>
                        <button
                            onClick={() => setActiveTab('schedule')}
                            className={`py-4 font-display font-bold uppercase tracking-widest text-sm transition-colors relative border-b-2 ${activeTab === 'schedule' ? 'text-white border-orange-500' : 'text-neutral-500 border-transparent hover:text-neutral-300'}`}
                        >
                            Schedule
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Contents */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">

                {/* Roster Tab */}
                {activeTab === 'roster' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {players.map(p => (
                                <Link href={`/basketball/player/${p.id}`} key={p.id} className="group flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(234,88,12,0.1)] transition-all">
                                    <div className="w-full aspect-[4/3] bg-neutral-800 relative overflow-hidden flex items-end justify-center">
                                        <span className="absolute top-4 left-4 text-4xl font-black font-mono text-white/20 select-none pointer-events-none z-10">#{p.number}</span>
                                        {p.headshot ? (
                                            <LazyImage src={p.headshot} alt={p.name} fill className="!object-cover object-top filter grayscale-[20%] group-hover:grayscale-0 transition-all duration-300" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-7xl font-bold font-display text-neutral-700">
                                                {p.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-center gap-2 mb-1">
                                            {p.status === 'injured' && <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">INJ</span>}
                                            {p.status === 'out' && <span className="bg-red-500/20 text-red-500 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">OUT</span>}
                                        </div>
                                        <h3 className="text-xl font-bold text-white uppercase tracking-tight group-hover:text-orange-400 transition-colors leading-tight">{p.name}</h3>
                                        <p className="text-neutral-400 font-mono text-sm mt-2">{p.position} • {p.height || 'N/A'}</p>
                                    </div>
                                </Link>
                            ))}

                            {players.length === 0 && (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-neutral-800 rounded-3xl text-neutral-500 font-medium">
                                    No players found on this roster.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Schedule Tab */}
                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left font-mono whitespace-nowrap">
                                <thead>
                                    <tr className="bg-black text-neutral-500 text-xs uppercase tracking-widest border-b border-neutral-800">
                                        <th className="p-6 font-medium">Date</th>
                                        <th className="p-6 font-medium">Opponent</th>
                                        <th className="p-6 font-medium">Result/Time</th>
                                        <th className="p-6 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800 text-sm font-medium">
                                    {games.map(game => {
                                        const isHome = game.homeTeamId === team.id;
                                        // A naive lookup for abbreviation, ideally we fetch opposing teams but standard UI avoids that N+1 issue usually by embedding or showing IDs
                                        const oppTeamId = isHome ? game.awayTeamId : game.homeTeamId;
                                        const oppTeamDisplay = oppTeamId.substring(0, 6).toUpperCase();

                                        const teamScore = isHome ? game.homeScore : game.awayScore;
                                        const oppScore = isHome ? game.awayScore : game.homeScore;
                                        const isWin = teamScore > oppScore;
                                        const isFinal = game.status === 'ft';

                                        const gameDate = typeof game.date === 'string' ? new Date(game.date) : (game.date as any).toDate?.() || new Date();

                                        return (
                                            <tr key={game.id} className="hover:bg-neutral-800/50 transition-colors">
                                                <td className="p-6 text-neutral-400">
                                                    {gameDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>
                                                <td className="p-6 text-white flex gap-2 items-center">
                                                    <span className="text-neutral-500 text-xs w-6">{isHome ? 'VS' : '@'}</span>
                                                    <span className="font-bold text-lg">{oppTeamDisplay}</span>
                                                </td>
                                                <td className="p-6">
                                                    {isFinal ? (
                                                        <div className="flex items-center gap-3">
                                                            <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${isWin ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                                {isWin ? 'W' : 'L'}
                                                            </span>
                                                            <span className="text-white font-bold">{teamScore} - {oppScore}</span>
                                                        </div>
                                                    ) : game.status === 'live' || game.status === 'ht' ? (
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-orange-500 animate-pulse font-bold text-xs">LIVE</span>
                                                            <span className="text-white font-bold">{teamScore} - {oppScore}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-neutral-500">{gameDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    )}
                                                </td>
                                                <td className="p-6 text-right">
                                                    <Link href={`/basketball/game/${game.id}`} className="text-xs uppercase tracking-widest text-orange-500 hover:text-white px-4 py-2 border border-orange-500/30 hover:border-white/30 rounded-full transition-all bg-orange-500/10 hover:bg-white/10">
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {games.length === 0 && (
                                <div className="py-12 text-center text-neutral-500 font-medium">
                                    No games scheduled.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
