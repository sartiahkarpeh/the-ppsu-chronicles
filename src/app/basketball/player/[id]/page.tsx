'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import type { BasketballPlayer, BasketballTeam, BasketballGame } from '@/types/basketball';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import LazyImage from '@/components/basketball/LazyImage';

export default function PlayerDetailPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();

    const [player, setPlayer] = useState<BasketballPlayer | null>(null);
    const [team, setTeam] = useState<BasketballTeam | null>(null);
    const [recentGames, setRecentGames] = useState<BasketballGame[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const unsubscribePlayer = onSnapshot(doc(db, 'basketball_players', id), async (docSnap) => {
            if (docSnap.exists()) {
                const playerData = { id: docSnap.id, ...docSnap.data() } as BasketballPlayer;
                setPlayer(playerData);

                // Fetch team
                if (playerData.teamId) {
                    const teamDoc = await getDoc(doc(db, 'basketball_teams', playerData.teamId));
                    if (teamDoc.exists()) {
                        setTeam({ id: teamDoc.id, ...teamDoc.data() } as BasketballTeam);
                    }

                    // Fetch some recent games involving this team to show schedule context
                    const qGames1 = query(collection(db, 'basketball_games'), where('homeTeamId', '==', playerData.teamId));
                    const qGames2 = query(collection(db, 'basketball_games'), where('awayTeamId', '==', playerData.teamId));

                    const [g1, g2] = await Promise.all([getDocs(qGames1), getDocs(qGames2)]);
                    const allGames = [...g1.docs, ...g2.docs].map(d => ({ id: d.id, ...d.data() } as BasketballGame));

                    // Simple sort descending by date and limit
                    allGames.sort((a, b) => {
                        const dateA = typeof a.date === 'string' ? new Date(a.date).getTime() : (a.date as any).toDate?.().getTime() || 0;
                        const dateB = typeof b.date === 'string' ? new Date(b.date).getTime() : (b.date as any).toDate?.().getTime() || 0;
                        return dateB - dateA;
                    });

                    setRecentGames(allGames.slice(0, 5));
                }
            }
            setLoading(false);
        });

        return () => unsubscribePlayer();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center pt-24 animate-pulse px-4">
                <div className="w-full max-w-7xl h-64 bg-neutral-900 rounded-3xl mb-8 border border-neutral-800"></div>
                <div className="w-full max-w-7xl h-96 bg-neutral-900 rounded-3xl border border-neutral-800"></div>
            </div>
        );
    }

    if (!player) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
                <h1 className="text-3xl font-display font-bold">Player Not Found</h1>
                <button onClick={() => router.back()} className="mt-4 text-orange-500 hover:text-orange-400 font-medium">
                    ← Go Back
                </button>
            </div>
        );
    }

    const { stats } = player;

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans">
            {/* Hero Profile Section */}
            <div className="relative bg-black w-full overflow-hidden border-b border-neutral-800">

                {/* Abstract Background Element based on Team Color */}
                <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{ background: team?.primaryColor ? `radial-gradient(circle at right top, ${team.primaryColor}, transparent 50%)` : 'none' }}
                ></div>

                <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 lg:py-16 relative z-10">
                    <button onClick={() => router.back()} className="mb-8 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-semibold tracking-wider uppercase">Back</span>
                    </button>

                    <div className="flex flex-col md:flex-row items-center md:items-end gap-8 md:gap-12">
                        {/* Player Headshot */}
                        <div className="w-48 h-48 md:w-64 md:h-64 rounded-full border-4 border-neutral-800 bg-neutral-900 overflow-hidden shrink-0 relative shadow-2xl">
                            {player.headshot ? (
                                <LazyImage src={player.headshot} alt={player.name} fill className="!object-cover object-top" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-7xl font-bold font-display text-neutral-700">
                                    {player.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}

                            {/* Team Logo Badge */}
                            {team?.logo && (
                                <Link href={`/basketball/team/${team.id}`} className="absolute bottom-4 right-4 w-16 h-16 bg-white rounded-full border-4 border-neutral-900 p-2 z-20 hover:scale-110 transition-transform cursor-pointer overflow-hidden">
                                    <div className="relative w-full h-full">
                                        <LazyImage src={team.logo} alt={team.abbreviation} fill className="!object-contain" />
                                    </div>
                                </Link>
                            )}
                        </div>

                        {/* Player Info */}
                        <div className="text-center md:text-left flex-1">
                            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                                <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tight leading-none">
                                    {player.name.split(' ')[0]} <br className="hidden md:block" />
                                    <span className="text-orange-500">{player.name.split(' ').slice(1).join(' ')}</span>
                                </h1>
                                <span className="text-6xl md:text-8xl font-black font-mono text-neutral-800 self-center md:self-auto drop-shadow-sm">#{player.number}</span>
                            </div>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-6 mt-6 md:mt-4 text-base font-medium font-mono text-neutral-400">
                                <div className="flex flex-col">
                                    <span className="text-xs uppercase tracking-widest text-neutral-600">Position</span>
                                    <span className="text-white text-lg">{player.position}</span>
                                </div>
                                <div className="w-px h-8 bg-neutral-800 hidden md:block"></div>
                                {player.height && (
                                    <>
                                        <div className="flex flex-col">
                                            <span className="text-xs uppercase tracking-widest text-neutral-600">Height</span>
                                            <span className="text-white text-lg">{player.height}</span>
                                        </div>
                                        <div className="w-px h-8 bg-neutral-800 hidden md:block"></div>
                                    </>
                                )}
                                {player.weight && (
                                    <>
                                        <div className="flex flex-col">
                                            <span className="text-xs uppercase tracking-widest text-neutral-600">Weight</span>
                                            <span className="text-white text-lg">{player.weight}</span>
                                        </div>
                                        <div className="w-px h-8 bg-neutral-800 hidden md:block"></div>
                                    </>
                                )}
                                {team && (
                                    typeof team.name === 'string' && (
                                        <Link href={`/basketball/team/${team.id}`} className="flex flex-col hover:text-orange-500 transition-colors cursor-pointer">
                                            <span className="text-xs uppercase tracking-widest text-neutral-600">Team</span>
                                            <span className="text-white text-lg font-sans font-bold group-hover:text-orange-500">{team.name}</span>
                                        </Link>
                                    )
                                )}
                            </div>

                            {/* Status Flags */}
                            {player.status !== 'active' && (
                                <div className="mt-6 flex justify-center md:justify-start">
                                    <div className={`px-4 py-2 rounded-lg border flex flex-col gap-1 items-start text-left ${player.status === 'out' ? 'bg-red-900/20 border-red-500/30 text-red-500' : 'bg-yellow-900/20 border-yellow-500/30 text-yellow-500'}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold uppercase tracking-wider text-sm flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full animate-pulse ${player.status === 'out' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                                                {player.status}
                                            </span>
                                        </div>
                                        {player.injuryDescription && (
                                            <span className="text-sm opacity-80">{player.injuryDescription}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {/* Stats & Bio Base Layout */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* Main Content (Stats) */}
                <div className="lg:col-span-8 space-y-12">

                    {/* Season Averages Row */}
                    <div>
                        <h2 className="text-2xl font-display font-bold uppercase tracking-tighter mb-6 flex items-center gap-4">
                            Season Stats
                            <div className="h-px flex-1 bg-neutral-800"></div>
                        </h2>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-4xl font-mono font-black text-white">{stats?.pointsPerGame || '0.0'}</span>
                                <span className="text-neutral-500 text-sm font-bold uppercase tracking-widest mt-2">PPG</span>
                            </div>
                            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-4xl font-mono font-black text-white">{stats?.reboundsPerGame || '0.0'}</span>
                                <span className="text-neutral-500 text-sm font-bold uppercase tracking-widest mt-2">RPG</span>
                            </div>
                            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-4xl font-mono font-black text-white">{stats?.assistsPerGame || '0.0'}</span>
                                <span className="text-neutral-500 text-sm font-bold uppercase tracking-widest mt-2">APG</span>
                            </div>
                            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-4xl font-mono font-black text-white">{stats?.gamesPlayed || '0'}</span>
                                <span className="text-neutral-500 text-sm font-bold uppercase tracking-widest mt-2">GP</span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Adv Stats Table */}
                    <div>
                        <h2 className="text-2xl font-display font-bold uppercase tracking-tighter mb-6 flex items-center gap-4">
                            Advanced Metrics
                            <div className="h-px flex-1 bg-neutral-800"></div>
                        </h2>

                        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
                            <table className="w-full text-left font-mono">
                                <thead>
                                    <tr className="bg-black/50 text-neutral-500 text-xs uppercase tracking-widest border-b border-neutral-800">
                                        <th className="p-4 font-medium">Metric</th>
                                        <th className="p-4 font-medium text-right">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800/50 text-sm">
                                    <tr className="hover:bg-neutral-800/20">
                                        <td className="p-4 text-neutral-300">Blocks Per Game (BPG)</td>
                                        <td className="p-4 text-white text-right font-bold">{stats?.blocksPerGame || '0.0'}</td>
                                    </tr>
                                    <tr className="hover:bg-neutral-800/20">
                                        <td className="p-4 text-neutral-300">Steals Per Game (SPG)</td>
                                        <td className="p-4 text-white text-right font-bold">{stats?.stealsPerGame || '0.0'}</td>
                                    </tr>
                                    <tr className="hover:bg-neutral-800/20">
                                        <td className="p-4 text-neutral-300">Turnovers Per Game (TOPG)</td>
                                        <td className="p-4 text-white text-right font-bold">{stats?.turnoversPerGame || '0.0'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* Sidebar (Bio & Team/Schedule) */}
                <div className="lg:col-span-4 space-y-12">

                    {/* Bio Block */}
                    <div>
                        <h2 className="text-xl font-display font-bold uppercase tracking-tighter mb-6">Player Bio</h2>
                        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
                            {player.bio ? (
                                <p className="text-neutral-300 text-sm leading-relaxed">{player.bio}</p>
                            ) : (
                                <p className="text-neutral-600 text-sm italic">No biography provided for this player.</p>
                            )}
                        </div>
                    </div>

                    {/* Team Latest Form (just displaying team's last games as proxy) */}
                    {team && (
                        <div>
                            <h2 className="text-xl font-display font-bold uppercase tracking-tighter mb-6">Team Recent Games</h2>
                            <div className="space-y-3">
                                {recentGames.map(game => {
                                    const isHome = game.homeTeamId === team.id;
                                    const oppId = isHome ? game.awayTeamId : game.homeTeamId;
                                    const teamScore = isHome ? game.homeScore : game.awayScore;
                                    const oppScore = isHome ? game.awayScore : game.homeScore;
                                    const isWin = teamScore > oppScore;
                                    const isFinal = game.status === 'ft';

                                    return (
                                        <Link href={`/basketball/game/${game.id}`} key={game.id} className="block bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-2xl p-4 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isFinal ? (isWin ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500') : 'bg-neutral-800 text-neutral-400'}`}>
                                                        {isFinal ? (isWin ? 'W' : 'L') : '-'}
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-white uppercase tracking-wider flex gap-1">
                                                            <span className="text-neutral-500">{isHome ? 'vs' : '@'}</span>
                                                            <span className="truncate max-w-[100px]">{oppId.substring(0, 4)}...</span> {/* A proper lookup for abbreviation would be better, but saving queries here */}
                                                        </span>
                                                        <span className="text-xs text-neutral-500 mt-0.5">{game.status === 'scheduled' ? 'Upcoming' : game.status.toUpperCase()}</span>
                                                    </div>
                                                </div>
                                                <div className="font-mono font-bold text-lg text-white">
                                                    {isFinal ? `${teamScore} - ${oppScore}` : 'TBD'}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                                {recentGames.length === 0 && (
                                    <div className="text-neutral-600 text-sm italic py-2">No recent games found.</div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

            </div>
        </div>
    );
}
