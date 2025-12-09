'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shuffle, Users, Clock } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Team } from '@/types/afcon';

const GROUPS = ['A', 'B'];

export default function DrawPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPublished, setIsPublished] = useState(false);
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

    // Check publish status
    useEffect(() => {
        const checkPublishStatus = async () => {
            try {
                const settingsDoc = await getDoc(doc(db, 'afcon_settings', 'draw'));
                if (settingsDoc.exists()) {
                    setIsPublished(settingsDoc.data()?.isPublished || false);
                }
            } catch (error) {
                console.error('Error checking publish status:', error);
            }
        };
        checkPublishStatus();
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'afcon_teams'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
            setTeams(teamsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Countdown timer to 9PM today
    useEffect(() => {
        if (isPublished) {
            setTimeLeft(null);
            return;
        }

        const calculateTimeLeft = () => {
            const now = new Date();
            const target = new Date();
            target.setHours(21, 0, 0, 0); // 9PM today

            // If 9PM has passed, show zeros
            if (now >= target) {
                return { hours: 0, minutes: 0, seconds: 0 };
            }

            const diff = target.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            return { hours, minutes, seconds };
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [isPublished]);

    const getTeamsByGroup = (group: string): Team[] => {
        return teams.filter(t => t.group === group);
    };

    // "Coming Soon" state when not published
    if (!loading && !isPublished) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black">
                {/* Hero Section */}
                <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 overflow-hidden">
                    {/* Decorative Elements */}
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

                {/* Coming Soon Content */}
                <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
                    <div className="flex flex-col items-center justify-center py-8 md:py-16">
                        {/* Countdown Timer */}
                        {timeLeft && (
                            <div className="mb-8">
                                <p className="text-center text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider mb-4">
                                    Draw Announcement In
                                </p>
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-900 dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-lg border border-gray-700">
                                            <span className="text-2xl md:text-3xl font-bold text-white font-display">
                                                {String(timeLeft.hours).padStart(2, '0')}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 uppercase">Hours</span>
                                    </div>
                                    <span className="text-2xl md:text-3xl font-bold text-gray-400 mb-6">:</span>
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-900 dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-lg border border-gray-700">
                                            <span className="text-2xl md:text-3xl font-bold text-white font-display">
                                                {String(timeLeft.minutes).padStart(2, '0')}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 uppercase">Minutes</span>
                                    </div>
                                    <span className="text-2xl md:text-3xl font-bold text-gray-400 mb-6">:</span>
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 md:w-20 md:h-20 bg-afcon-green rounded-xl flex items-center justify-center shadow-lg">
                                            <span className="text-2xl md:text-3xl font-bold text-black font-display">
                                                {String(timeLeft.seconds).padStart(2, '0')}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 uppercase">Seconds</span>
                                    </div>
                                </div>
                                <p className="text-center text-afcon-gold text-sm font-medium mt-4">
                                    Today at 9:00 PM
                                </p>
                            </div>
                        )}

                        <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white text-center mb-3">
                            Draw Will Be Announced Soon
                        </h2>
                        <p className="text-base text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
                            The official AFCON 2025 group stage draw has not yet been announced.
                            Check back soon to see which teams will compete in each group!
                        </p>

                        <Link
                            href="/afcon25"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-afcon-green text-black font-bold rounded-xl hover:bg-afcon-green/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to AFCON 2025
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 overflow-hidden">
                {/* Decorative Elements */}
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

            {/* Groups Grid */}
            <main className="max-w-7xl mx-auto px-4 py-12">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-afcon-green border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {GROUPS.map(group => {
                            const groupTeams = getTeamsByGroup(group);
                            return (
                                <div
                                    key={group}
                                    className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-xl transition-shadow duration-300"
                                >
                                    {/* Group Header */}
                                    <div className="relative bg-gradient-to-r from-afcon-green to-afcon-green/80 px-6 py-5">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                        <h2 className="text-2xl font-display font-bold text-black relative z-10">
                                            Group {group}
                                        </h2>
                                        <div className="flex items-center gap-2 text-black/70 text-sm mt-1 relative z-10">
                                            <Users className="w-4 h-4" />
                                            {groupTeams.length} Teams
                                        </div>
                                    </div>

                                    {/* Teams List */}
                                    <div className="p-4">
                                        {groupTeams.length === 0 ? (
                                            <div className="text-center py-8 text-gray-400">
                                                <p>No teams assigned yet</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {groupTeams.map((team, index) => (
                                                    <div
                                                        key={team.id}
                                                        className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                    >
                                                        <div className="w-8 h-8 flex items-center justify-center bg-afcon-green/10 text-afcon-green font-bold rounded-full text-sm">
                                                            {index + 1}
                                                        </div>
                                                        {team.flag_url ? (
                                                            <img
                                                                src={team.flag_url}
                                                                alt={`${team.name} flag`}
                                                                className="w-12 h-8 object-cover rounded border border-gray-200 dark:border-gray-700 shadow-sm"
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                                                                <span className="text-xs text-gray-500">🏳️</span>
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-gray-900 dark:text-white truncate">
                                                                {team.name}
                                                            </p>
                                                            {team.shortName && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {team.shortName}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Tournament Info */}
                <div className="mt-12 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8 md:p-12">
                    <div className="max-w-3xl mx-auto text-center">
                        <h3 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white mb-4">
                            About the Draw
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                            There are 7 teams, they will be grouped into two. Stay tuned for the draw.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
