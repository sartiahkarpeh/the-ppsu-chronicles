'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { CalendarDays, Users, User, ArrowRight } from 'lucide-react';

export default function BasketballDashboardPage() {
    const [stats, setStats] = useState({
        games: 0,
        teams: 0,
        players: 0,
        loading: true,
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [gamesSnap, teamsSnap, playersSnap] = await Promise.all([
                    getDocs(query(collection(db, 'basketball_games'))),
                    getDocs(query(collection(db, 'basketball_teams'))),
                    getDocs(query(collection(db, 'basketball_players'))),
                ]);

                setStats({
                    games: gamesSnap.size,
                    teams: teamsSnap.size,
                    players: playersSnap.size,
                    loading: false,
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
                setStats(s => ({ ...s, loading: false }));
            }
        };

        fetchStats();
    }, []);

    const statCards = [
        {
            title: 'Total Games',
            value: stats.games,
            icon: CalendarDays,
            color: 'bg-blue-500',
            href: '/admin/basketball/games',
        },
        {
            title: 'Teams',
            value: stats.teams,
            icon: Users,
            color: 'bg-green-500',
            href: '/admin/basketball/teams',
        },
        {
            title: 'Players',
            value: stats.players,
            icon: User,
            color: 'bg-purple-500',
            href: '/admin/basketball/players',
        },
    ];

    if (stats.loading) {
        return <div className="animate-pulse">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold dark:text-white">Basketball Overview</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Manage basketball games, teams, and configurations for the public site.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((stat) => (
                    <div key={stat.title} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10 dark:bg-opacity-20`}>
                                <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                            {stat.value}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            {stat.title}
                        </p>
                        <Link
                            href={stat.href}
                            className="flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                        >
                            Manage {stat.title}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold dark:text-white mb-4">Quick Actions</h2>
                <div className="flex flex-wrap gap-4">
                    <Link href="/admin/basketball/games" className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors">
                        Add New Game
                    </Link>
                    <Link href="/admin/basketball/settings" className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        Update Scores Ticker
                    </Link>
                </div>
            </div>
        </div>
    );
}
