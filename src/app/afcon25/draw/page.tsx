'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shuffle } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Team } from '@/types/afcon';

// Draw matchups
const DRAW_MATCHUPS = [
    { home: 'South Sudan', away: 'Bhutan' },
    { home: 'India', away: 'Eswatini' },
    { home: 'Zimbabwe', away: 'Nigeria' },
    { home: 'Eswatini', away: 'Bhutan' },
    { home: 'Liberia', away: 'Zimbabwe' },
    { home: 'Nigeria', away: 'South Sudan' },
    { home: 'India', away: 'Liberia' },
];

export default function DrawPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'afcon_teams'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
            setTeams(teamsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const getTeamFlag = (teamName: string) => {
        const team = teams.find(t => t.name.toLowerCase() === teamName.toLowerCase());
        return team?.flag_url || null;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-afcon-green border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/afcon-pattern.svg')] opacity-5"></div>
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-afcon-green/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-afcon-gold/20 rounded-full blur-3xl"></div>

                <div className="relative max-w-7xl mx-auto px-4 py-6 md:py-10">
                    <Link
                        href="/afcon25"
                        className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 md:mb-6 transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to AFCON 2025
                    </Link>

                    <div className="flex flex-col items-center text-center">
                        <div className="p-3 bg-afcon-green/10 backdrop-blur-sm border border-afcon-green/20 rounded-xl mb-3">
                            <Shuffle className="w-8 h-8 md:w-10 md:h-10 text-afcon-green" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-display font-bold text-white uppercase tracking-wider mb-2">
                            Tournament Draw
                        </h1>
                        <p className="text-base md:text-xl text-afcon-gold font-medium">
                            AFCON 2025 Group Stage Draw
                        </p>
                    </div>
                </div>
            </div>

            {/* Draw Fixtures */}
            <main className="max-w-7xl mx-auto px-4 py-12">
                <div className="text-center mb-8">
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
                        Draw Fixtures
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        The official matchups for AFCON 2025
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {DRAW_MATCHUPS.map((matchup, index) => {
                        const homeFlag = getTeamFlag(matchup.home);
                        const awayFlag = getTeamFlag(matchup.away);

                        return (
                            <div
                                key={index}
                                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-all"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    {/* Home Team */}
                                    <div className="flex-1 flex flex-col items-center text-center">
                                        {homeFlag ? (
                                            <img
                                                src={homeFlag}
                                                alt={matchup.home}
                                                className="w-16 h-10 object-cover rounded shadow-md mb-2"
                                            />
                                        ) : (
                                            <div className="w-16 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center mb-2">
                                                <span className="text-lg">🏳️</span>
                                            </div>
                                        )}
                                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                                            {matchup.home}
                                        </span>
                                    </div>

                                    {/* VS Badge */}
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-afcon-green rounded-full flex items-center justify-center">
                                            <span className="font-bold text-black text-xs">VS</span>
                                        </div>
                                    </div>

                                    {/* Away Team */}
                                    <div className="flex-1 flex flex-col items-center text-center">
                                        {awayFlag ? (
                                            <img
                                                src={awayFlag}
                                                alt={matchup.away}
                                                className="w-16 h-10 object-cover rounded shadow-md mb-2"
                                            />
                                        ) : (
                                            <div className="w-16 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center mb-2">
                                                <span className="text-lg">🏳️</span>
                                            </div>
                                        )}
                                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                                            {matchup.away}
                                        </span>
                                    </div>
                                </div>

                                {/* Match Number */}
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-center">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Match {index + 1}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Tournament Info */}
                <div className="mt-12 bg-gradient-to-r from-afcon-green/10 to-afcon-gold/10 rounded-3xl border border-afcon-green/20 p-8 md:p-12">
                    <div className="max-w-3xl mx-auto text-center">
                        <h3 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white mb-4">
                            The Draw is Complete! 🎉
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                            7 teams are competing in AFCON 2025 at PP Savani University.
                            The fixtures above show all the matchups. Stay tuned for the match schedule!
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
