'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import type { BasketballTeam, BasketballPageConfig } from '@/types/basketball';
import LazyImage from '@/components/basketball/LazyImage';

export default function TeamGrid({
    config
}: {
    config: BasketballPageConfig
}) {
    const [teams, setTeams] = useState<BasketballTeam[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!config.showTeamGrid) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, 'basketball_teams'), orderBy('name', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BasketballTeam));
            setTeams(fetched);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [config.showTeamGrid]);

    if (!config.showTeamGrid) return null;

    if (loading) {
        return (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full animate-pulse">
                <div className="h-8 bg-neutral-800 w-48 mb-8 rounded"></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="aspect-square bg-neutral-900 rounded-3xl"></div>
                    ))}
                </div>
            </section>
        );
    }

    if (teams.length === 0) return null;

    return (
        <section className="bg-black border-y border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex items-end justify-between mb-10 border-b border-neutral-800 pb-4">
                    <div>
                        <h2 className="text-3xl font-display font-bold text-white tracking-tight">Teams</h2>
                        <p className="text-neutral-400 mt-1">Explore rosters, schedules, and stats</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                    {teams.map((team) => (
                        <Link
                            key={team.id}
                            href={`/basketball/team/${team.id}`}
                            className="bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 group transition-all duration-300 hover:shadow-[0_0_30px_rgba(234,88,12,0.1)] hover:-translate-y-1"
                        >
                            <div className="w-20 h-20 flex items-center justify-center rounded-full bg-black/50 border border-white/5 p-4 group-hover:scale-110 transition-transform duration-500 overflow-hidden relative">
                                {team.logo ? (
                                    <LazyImage src={team.logo} alt={team.abbreviation} className="w-full h-full !object-contain filter drop-shadow-lg" fill />
                                ) : (
                                    <span className="text-2xl font-bold text-neutral-600">{team.abbreviation}</span>
                                )}
                            </div>
                            <div className="text-center w-full">
                                <h3 className="text-white font-display font-bold text-lg leading-tight group-hover:text-orange-400 transition-colors truncate w-full">{team.name}</h3>
                                <div className="text-neutral-500 font-mono text-xs tracking-widest mt-1">
                                    {team.wins}-{team.losses} • {team.division || 'DIV'}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
