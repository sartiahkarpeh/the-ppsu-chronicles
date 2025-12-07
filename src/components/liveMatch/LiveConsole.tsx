'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ClockController from '@/components/liveMatch/ClockController';
import Scoreboard from '@/components/liveMatch/Scoreboard';
import type { LiveState } from '@/types/liveMatch';
import {
    subscribeToLiveState,
    updateLiveState,
    initializeLiveState,
    subscribeToMatchEvents,
    logAudit,
} from '@/lib/liveMatch/firestore';

interface LiveConsoleProps {
    matchId: string;
    homeTeamName: string;
    awayTeamName: string;
    homeLogo?: string;
    awayLogo?: string;
}

export default function LiveConsole({
    matchId,
    homeTeamName,
    awayTeamName,
    homeLogo,
    awayLogo,
}: LiveConsoleProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [liveState, setLiveState] = useState<LiveState | null>(null);
    const [activeTab, setActiveTab] = useState<'lineups' | 'broadcast' | 'commentary'>('lineups');

    // Subscribe to live state
    useEffect(() => {
        const initializeAndSubscribe = async () => {
            // Try to subscribe first
            const unsubscribe = subscribeToLiveState(matchId, async (state) => {
                if (!state) {
                    // If liveState doesn't exist, initialize it
                    console.log('Initializing live state for match:', matchId);
                    try {
                        await initializeLiveState(matchId);
                        // The subscription will pick up the new state automatically
                    } catch (error) {
                        console.error('Failed to initialize live state:', error);
                    }
                } else {
                    setLiveState(state);
                }
            });

            return unsubscribe;
        };

        const unsubscribePromise = initializeAndSubscribe();

        return () => {
            unsubscribePromise.then(unsub => unsub());
        };
    }, [matchId]);

    // Handle clock updates
    const handleClockUpdate = async (updates: Partial<LiveState>) => {
        if (!user) return;

        try {
            await updateLiveState(matchId, updates);

            // Log major changes
            if (updates.period) {
                await logAudit(matchId, {
                    action: 'change_period',
                    userId: user.uid,
                    userName: user.email || 'Unknown',
                    details: { newPeriod: updates.period },
                });
            }
        } catch (error) {
            console.error('Failed to update live state:', error);
        }
    };

    // Handle score changes
    const handleScoreChange = async (team: 'home' | 'away', delta: number) => {
        if (!user || !liveState) return;

        const updates = team === 'home'
            ? { homeScore: liveState.homeScore + delta }
            : { awayScore: liveState.awayScore + delta };

        try {
            await updateLiveState(matchId, updates);
            await logAudit(matchId, {
                action: 'manual_score_change',
                userId: user.uid,
                userName: user.email || 'Unknown',
                details: { team, delta, newScore: updates.homeScore || updates.awayScore },
            });
        } catch (error) {
            console.error('Failed to update score:', error);
        }
    };

    if (!liveState) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-afcon-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading live console...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header - Optimized for Mobile */}
            <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 mb-4 md:mb-6 sticky top-0 z-10 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center justify-between w-full md:w-auto">
                        <div>
                            <h1 className="text-lg md:text-2xl font-bold text-gray-900">Live Console</h1>
                            <p className="text-sm text-gray-600 truncate max-w-[200px] md:max-w-none">
                                {homeTeamName} vs {awayTeamName}
                            </p>
                        </div>
                        <button
                            onClick={() => router.back()}
                            className="md:hidden px-3 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Back
                        </button>
                    </div>
                    
                    <button
                        onClick={() => router.back()}
                        className="hidden md:block px-4 py-2 text-sm md:text-base text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        ← Back to Fixtures
                    </button>
                </div>
            </div>

            {/* Two-Column Layout for Desktop, Stacked for Mobile */}
            <div className="max-w-[1920px] mx-auto px-4 md:px-6 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Left Column: Clock & Scoreboard - Full width on mobile */}
                    <div className="lg:col-span-1 space-y-4 md:space-y-6">
                        {/* Scoreboard - More compact on mobile */}
                        <div className="block">
                            <Scoreboard
                                homeTeamName={homeTeamName}
                                awayTeamName={awayTeamName}
                                homeScore={liveState.homeScore}
                                awayScore={liveState.awayScore}
                                homeLogo={homeLogo}
                                awayLogo={awayLogo}
                                onScoreChange={handleScoreChange}
                            />
                        </div>

                        {/* Clock Controller */}
                        <div className="block">
                            <ClockController
                                matchId={matchId}
                                clockMs={liveState.clockMs}
                                period={liveState.period}
                                isRunning={liveState.isRunning}
                                extraTime={liveState.extraTime}
                                onUpdate={handleClockUpdate}
                            />
                        </div>
                    </div>

                    {/* Right Column: Tabbed Content - Full width on mobile */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                            {/* Tabs - Scrollable on mobile */}
                            <div className="border-b border-gray-200 overflow-x-auto">
                                <nav className="flex min-w-max">
                                    {[
                                        { key: 'lineups', label: 'Lineups' },
                                        { key: 'broadcast', label: 'Broadcast' },
                                        { key: 'commentary', label: 'Commentary' },
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key as any)}
                                            className={`flex-1 px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === tab.key
                                                ? 'bg-afcon-green text-white'
                                                : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            {/* Tab Content - Scrollable on mobile */}
                            <div className="p-4 md:p-6 max-h-[60vh] md:max-h-none overflow-y-auto">
                                {activeTab === 'lineups' && (
                                    <div>
                                        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Lineups Manager</h3>
                                        <div className="bg-gray-50 rounded-lg p-6 md:p-8 text-center text-gray-600">
                                            Lineups manager will be added in next phase...
                                            <br />
                                            <span className="text-xs md:text-sm">Manage starters, subs, and formations</span>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'broadcast' && (
                                    <div>
                                        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Broadcast Settings</h3>
                                        <div className="bg-gray-50 rounded-lg p-6 md:p-8 text-center text-gray-600">
                                            Broadcast manager will be added in next phase...
                                            <br />
                                            <span className="text-xs md:text-sm">Stream URL, overlays, and sponsor tickers</span>
                                        </div>
                                    </div>

                                )}

                                {activeTab === 'commentary' && (
                                    <div>
                                        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">Live Commentary</h3>
                                        <div className="bg-gray-50 rounded-lg p-6 md:p-8 text-center text-gray-600">
                                            Commentary feed will be added in next phase...
                                            <br />
                                            <span className="text-xs md:text-sm">Live text updates and quick messages</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
