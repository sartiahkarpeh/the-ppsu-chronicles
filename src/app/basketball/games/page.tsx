'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import type { BasketballGame, BasketballTeam } from '@/types/basketball';
import LazyImage from '@/components/basketball/LazyImage';
import { motion, AnimatePresence } from 'framer-motion';

export default function GamesPage() {
    const [games, setGames] = useState<BasketballGame[]>([]);
    const [teams, setTeams] = useState<Record<string, BasketballTeam>>({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'past'>('all');

    useEffect(() => {
        // Fetch teams to attach to games inline
        const unsubscribeTeams = onSnapshot(collection(db, 'basketball_teams'), (snap) => {
            const tMap: Record<string, BasketballTeam> = {};
            snap.docs.forEach(d => tMap[d.id] = { id: d.id, ...d.data() } as BasketballTeam);
            setTeams(tMap);
        });

        // Fetch games
        const qGames = query(collection(db, 'basketball_games'), orderBy('date', 'desc'));
        const unsubscribeGames = onSnapshot(qGames, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BasketballGame));
            setGames(fetched);
            setLoading(false);
        });

        return () => {
            unsubscribeTeams();
            unsubscribeGames();
        };
    }, []);

    const filteredGames = games.filter(game => {
        if (filter === 'all') return true;
        if (filter === 'live') return game.status === 'live' || game.status === 'ht';
        if (filter === 'upcoming') return game.status === 'scheduled';
        if (filter === 'past') return game.status === 'ft' || game.status === 'cancelled';
        return true;
    });

    const getStatusText = (status: string) => {
        switch (status) {
            case 'live': return 'LIVE';
            case 'ht': return 'HALFTIME';
            case 'ft': return 'FINAL';
            case 'scheduled': return 'UPCOMING';
            case 'cancelled': return 'CANCELLED';
            default: return status.toUpperCase();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center pt-24 animate-pulse px-4">
                <div className="w-full max-w-5xl h-12 bg-neutral-900 rounded-lg mb-12 border border-neutral-800"></div>
                <div className="w-full max-w-5xl space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-32 bg-neutral-900 rounded-3xl border border-neutral-800"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans py-12">
            <div className="max-w-5xl mx-auto px-4 md:px-8">
                <div className="mb-10 w-full text-center md:text-left border-b border-neutral-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl md:text-6xl font-display font-black uppercase tracking-tight text-white mb-2">
                            All <span className="text-orange-500">Games</span>
                        </h1>
                        <p className="text-neutral-400 font-mono text-sm uppercase tracking-widest">
                            League Schedule & Results
                        </p>
                    </div>

                    <div className="flex bg-neutral-900/50 p-1.5 rounded-full border border-neutral-800 self-center md:self-auto overflow-x-auto max-w-full">
                        {(['all', 'live', 'upcoming', 'past'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-6 py-2.5 rounded-full text-xs font-bold font-mono tracking-widest uppercase transition-all whitespace-nowrap ${filter === f
                                    ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)]'
                                    : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {filteredGames.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-16 text-neutral-500 font-mono bg-neutral-900/30 rounded-3xl border border-neutral-800 border-dashed"
                            >
                                No games found for this filter.
                            </motion.div>
                        ) : (
                            filteredGames.map((game) => {
                                const awayTeam = teams[game.awayTeamId];
                                const homeTeam = teams[game.homeTeamId];
                                const isFinal = game.status === 'ft';
                                const isLive = game.status === 'live' || game.status === 'ht';

                                const dateObj = typeof game.date === 'string' ? new Date(game.date) : (game.date as any).toDate?.() || new Date();

                                return (
                                    <motion.div
                                        key={game.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Link href={`/basketball/game/${game.id}`} className="block relative group">
                                            {/* Glow Effect */}
                                            {isLive && (
                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-[2rem] blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                                            )}

                                            <div className="relative bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors duration-300 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-xl">

                                                {/* Status / Date Segment (Left/Top) */}
                                                <div className="w-full md:w-32 flex flex-col items-center md:items-start text-center md:text-left shrink-0 pb-4 md:pb-0 border-b md:border-b-0 md:border-r border-neutral-800 md:pr-6">
                                                    {isLive ? (
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                                            <span className="text-red-500 font-bold uppercase tracking-widest text-xs">LIVE - Q{game.period}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-neutral-500 font-bold uppercase tracking-widest text-xs mb-1">
                                                            {getStatusText(game.status)}
                                                        </span>
                                                    )}
                                                    <span className="text-white font-mono text-sm md:text-base font-medium">{dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                    {!isFinal && !isLive && (
                                                        <span className="text-neutral-400 font-mono text-sm">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    )}
                                                </div>

                                                {/* Matchup Segment (Center/Main) */}
                                                <div className="flex-1 flex items-center justify-between w-full">

                                                    {/* Away Team */}
                                                    <div className="flex flex-col md:flex-row items-center gap-4 flex-1 justify-end md:justify-end text-center md:text-right">
                                                        <span className={`font-display font-bold text-xl md:text-3xl uppercase tracking-tight ${isFinal && game.awayScore > game.homeScore ? 'text-white' : 'text-neutral-400'}`}>
                                                            {awayTeam?.abbreviation || 'AWAY'}
                                                        </span>
                                                        <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 relative">
                                                            {awayTeam?.logo ? <LazyImage src={awayTeam.logo} alt="away" fill className="!object-contain drop-shadow-lg" /> : <div className="w-full h-full bg-neutral-800 rounded-full"></div>}
                                                        </div>
                                                    </div>

                                                    {/* Score / VS Divider */}
                                                    <div className="px-6 flex flex-col items-center justify-center shrink-0 w-24 md:w-32">
                                                        {(isFinal || isLive) ? (
                                                            <span className="font-mono font-black text-3xl md:text-5xl text-white tracking-tighter w-full text-center flex justify-center gap-3 md:gap-4">
                                                                <span className={isFinal && game.awayScore > game.homeScore ? 'text-orange-500' : ''}>{game.awayScore ?? 0}</span>
                                                                <span className="text-neutral-700">-</span>
                                                                <span className={isFinal && game.homeScore > game.awayScore ? 'text-orange-500' : ''}>{game.homeScore ?? 0}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="font-display font-black text-xl text-neutral-600 italic">VS</span>
                                                        )}
                                                    </div>

                                                    {/* Home Team */}
                                                    <div className="flex flex-col-reverse md:flex-row items-center gap-4 flex-1 justify-start md:justify-start text-center md:text-left">
                                                        <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 relative">
                                                            {homeTeam?.logo ? <LazyImage src={homeTeam.logo} alt="home" fill className="!object-contain drop-shadow-lg" /> : <div className="w-full h-full bg-neutral-800 rounded-full"></div>}
                                                        </div>
                                                        <span className={`font-display font-bold text-xl md:text-3xl uppercase tracking-tight ${isFinal && game.homeScore > game.awayScore ? 'text-white' : 'text-neutral-400'}`}>
                                                            {homeTeam?.abbreviation || 'HOME'}
                                                        </span>
                                                    </div>
                                                </div>

                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
