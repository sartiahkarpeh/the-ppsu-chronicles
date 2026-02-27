'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import type { BasketballPlayer, BasketballTeam } from '@/types/basketball';
import LazyImage from '@/components/basketball/LazyImage';
import { motion } from 'framer-motion';

export default function PlayersPage() {
    const [players, setPlayers] = useState<BasketballPlayer[]>([]);
    const [teams, setTeams] = useState<Record<string, BasketballTeam>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const unsubscribeTeams = onSnapshot(collection(db, 'basketball_teams'), (snap) => {
            const tMap: Record<string, BasketballTeam> = {};
            snap.docs.forEach(d => {
                tMap[d.id] = { id: d.id, ...d.data() } as BasketballTeam;
            });
            setTeams(tMap);
        });

        const q = query(collection(db, 'basketball_players'), orderBy('name', 'asc'));
        const unsubscribePlayers = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BasketballPlayer));
            setPlayers(fetched);
            setLoading(false);
        });

        return () => {
            unsubscribeTeams();
            unsubscribePlayers();
        };
    }, []);

    const filteredPlayers = players.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        teams[p.teamId]?.name.toLowerCase().includes(search.toLowerCase())
    );

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center pt-24 animate-pulse px-4">
                <div className="w-full max-w-7xl h-12 bg-neutral-900 rounded-lg mb-8 border border-neutral-800"></div>
                <div className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                        <div key={i} className="aspect-[4/5] bg-neutral-900 rounded-3xl border border-neutral-800"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans py-12">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between border-b border-neutral-800 pb-6 gap-6">
                    <div>
                        <h1 className="text-4xl md:text-6xl font-display font-black uppercase tracking-tight text-white mb-2">
                            All <span className="text-orange-500">Players</span>
                        </h1>
                        <p className="text-neutral-400 font-mono text-sm uppercase tracking-widest">
                            League Roster Directory
                        </p>
                    </div>

                    <div className="w-full md:w-72">
                        <input
                            type="text"
                            placeholder="Search players or teams..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors font-mono text-sm"
                        />
                    </div>
                </div>

                {filteredPlayers.length === 0 ? (
                    <div className="text-center text-neutral-500 py-12 font-mono">
                        No players found matching "{search}".
                    </div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6"
                    >
                        {filteredPlayers.map((player) => {
                            const team = teams[player.teamId];

                            return (
                                <motion.div key={player.id} variants={itemVariants}>
                                    <Link
                                        href={`/basketball/player/${player.id}`}
                                        className="group flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(234,88,12,0.1)] transition-all h-full relative"
                                    >
                                        <div className="w-full aspect-[4/3] bg-neutral-800 relative overflow-hidden flex items-end justify-center">
                                            <span className="absolute top-4 left-4 text-4xl font-black font-mono text-white/20 select-none pointer-events-none z-10">
                                                #{player.number}
                                            </span>
                                            {team?.logo && (
                                                <div className="absolute top-4 right-4 w-8 h-8 opacity-50 z-10">
                                                    <LazyImage src={team.logo} alt={team.abbreviation} fill className="!object-contain" />
                                                </div>
                                            )}
                                            {player.headshot ? (
                                                <LazyImage src={player.headshot} alt={player.name} fill className="!object-cover object-top filter grayscale-[20%] group-hover:grayscale-0 transition-all duration-300" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-7xl font-bold font-display text-neutral-700">
                                                    {player.name.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col">
                                            <div className="flex items-center gap-2 mb-1">
                                                {player.status === 'injured' && <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">INJ</span>}
                                                {player.status === 'out' && <span className="bg-red-500/20 text-red-500 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">OUT</span>}
                                            </div>
                                            <h3 className="text-xl font-bold text-white uppercase tracking-tight group-hover:text-orange-400 transition-colors leading-tight mb-2">{player.name}</h3>

                                            <div className="mt-auto">
                                                {team && (
                                                    <div className="text-neutral-400 font-mono text-xs uppercase tracking-widest mb-1 truncate">
                                                        {team.name}
                                                    </div>
                                                )}
                                                <div className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
                                                    <span>{player.position}</span>
                                                    {player.height && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-neutral-700"></span>
                                                            <span>{player.height}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
