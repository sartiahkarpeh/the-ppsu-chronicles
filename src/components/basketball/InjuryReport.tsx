'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { BasketballPlayer, BasketballTeam, BasketballPageConfig } from '@/types/basketball';
import LazyImage from '@/components/basketball/LazyImage';

export default function InjuryReport({
    config
}: {
    config: BasketballPageConfig
}) {
    const [injuredPlayers, setInjuredPlayers] = useState<BasketballPlayer[]>([]);
    const [teams, setTeams] = useState<Record<string, BasketballTeam>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!config.showInjuryReport) {
            setLoading(false);
            return;
        }

        // Fetch Teams
        const qTeams = query(collection(db, 'basketball_teams'));
        const unsubTeams = onSnapshot(qTeams, (snapshot) => {
            const dict: Record<string, BasketballTeam> = {};
            snapshot.docs.forEach(doc => { dict[doc.id] = { id: doc.id, ...doc.data() } as BasketballTeam });
            setTeams(dict);
        });

        // Fetch only players marked as 'injured' or 'out'
        const qInjuries = query(
            collection(db, 'basketball_players'),
            where('status', 'in', ['injured', 'out'])
        );

        const unsubInjuries = onSnapshot(qInjuries, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BasketballPlayer));
            setInjuredPlayers(list);
            setLoading(false);
        });

        return () => {
            unsubTeams();
            unsubInjuries();
        };

    }, [config.showInjuryReport]);

    if (!config.showInjuryReport) return null;

    if (loading) {
        return (
            <section className="bg-neutral-950 py-16 animate-pulse border-y border-neutral-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="h-8 bg-neutral-800 w-48 mb-8 rounded"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-neutral-900 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (injuredPlayers.length === 0) return null;

    return (
        <section className="bg-neutral-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex items-center gap-3 mb-8 border-b border-neutral-800 pb-4">
                    <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center border border-red-500/30">
                        <span className="text-red-500">🏥</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-display font-bold text-white tracking-tight">Injury Report</h2>
                        <p className="text-neutral-400 text-sm mt-0.5">Player availability updates</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {injuredPlayers.map(player => {
                        const team = teams[player.teamId];
                        return (
                            <div key={player.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex gap-4 items-center">
                                {/* Player Image/Avatar */}
                                <div className="w-14 h-14 rounded-full bg-neutral-800 border-2 border-neutral-700 overflow-hidden shrink-0 relative">
                                    {player.headshot ? (
                                        <LazyImage src={player.headshot} alt={player.name} fill className="!object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-neutral-600 bg-neutral-800 font-bold uppercase">
                                            {player.name.substring(0, 2)}
                                        </div>
                                    )}
                                    {/* Team Logo Badge */}
                                    {team?.logo && (
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border-2 border-neutral-900 p-0.5 z-10 overflow-hidden">
                                            <div className="relative w-full h-full">
                                                <LazyImage src={team.logo} alt={team.abbreviation} fill className="!object-contain" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <Link href={`/basketball/player/${player.id}`} className="font-bold text-white block truncate hover:text-orange-400 transition-colors">
                                        {player.name}
                                    </Link>
                                    <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 mt-1">
                                        <span>#{player.number}</span>
                                        <span>•</span>
                                        <span>{player.position}</span>
                                        <span>•</span>
                                        <span className="text-neutral-400">{team?.abbreviation || 'FA'}</span>
                                    </div>

                                    <div className="mt-2 text-sm text-neutral-300">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mr-2 ${player.status === 'out' ? 'bg-red-900/50 text-red-500 border border-red-500/20' : 'bg-yellow-900/50 text-yellow-500 border border-yellow-500/20'}`}>
                                            {player.status}
                                        </span>
                                        <span className="text-neutral-400 text-xs truncate max-w-[180px] inline-block align-middle">
                                            {player.injuryDescription || 'Undisclosed injury'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
