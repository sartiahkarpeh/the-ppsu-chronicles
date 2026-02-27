'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import type { BasketballTeam } from '@/types/basketball';
import LazyImage from '@/components/basketball/LazyImage';
import { motion } from 'framer-motion';

export default function TeamsPage() {
    const [teams, setTeams] = useState<BasketballTeam[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'basketball_teams'), orderBy('name', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BasketballTeam));
            setTeams(fetched);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center pt-24 animate-pulse px-4">
                <div className="w-full max-w-7xl h-12 bg-neutral-900 rounded-lg mb-8 border border-neutral-800"></div>
                <div className="w-full max-w-7xl grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="aspect-square bg-neutral-900 rounded-3xl border border-neutral-800"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans py-12">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="mb-12 border-b border-neutral-800 pb-6 text-center md:text-left">
                    <h1 className="text-4xl md:text-6xl font-display font-black uppercase tracking-tight text-white mb-2">
                        All <span className="text-orange-500">Teams</span>
                    </h1>
                    <p className="text-neutral-400 font-mono text-sm uppercase tracking-widest">
                        PPSU Basketball Franchises
                    </p>
                </div>

                {teams.length === 0 ? (
                    <div className="text-center text-neutral-500 py-12 font-mono">
                        No teams found.
                    </div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6"
                    >
                        {teams.map((team) => (
                            <motion.div key={team.id} variants={itemVariants}>
                                <Link
                                    href={`/basketball/team/${team.id}`}
                                    className="bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 group transition-all duration-300 hover:shadow-[0_0_30px_rgba(234,88,12,0.1)] hover:-translate-y-1 h-full"
                                >
                                    <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center rounded-full bg-black/50 border border-white/5 p-4 group-hover:scale-110 transition-transform duration-500 overflow-hidden relative shadow-lg">
                                        {team.logo ? (
                                            <LazyImage src={team.logo} alt={team.abbreviation} className="w-full h-full !object-contain filter drop-shadow-md" fill />
                                        ) : (
                                            <span className="text-2xl font-bold font-display text-neutral-600">{team.abbreviation}</span>
                                        )}
                                    </div>
                                    <div className="text-center w-full">
                                        <h3 className="text-white font-display font-bold text-lg md:text-xl leading-tight group-hover:text-orange-400 transition-colors truncate w-full">{team.name}</h3>
                                        <div className="text-neutral-500 font-mono text-[10px] md:text-xs tracking-widest mt-1.5 flex flex-col items-center">
                                            <span>{team.wins}-{team.losses}</span>
                                            <span className="opacity-50">{team.division}</span>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
