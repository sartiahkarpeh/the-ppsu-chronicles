'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share2, Bell, BellOff, Star, StarOff, Trophy, Calendar, MapPin, Users, Table as TableIcon, Activity, X } from 'lucide-react';
import { Timestamp, doc, onSnapshot, collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getFixtureBySlugOrId } from '@/lib/afcon/fixturesFirestore';
import dayjs from 'dayjs';

import { useLiveClock } from '@/hooks/useLiveClock';
import { useNotificationSubscription } from '@/hooks/useNotificationSubscription';
import type { Fixture, FixtureStatusType } from '@/types/fixtureTypes';
import type { Team, TeamStanding } from '@/types/afcon';
import FormDots from '@/components/afcon/FormDots';
import ShareSheet from '@/components/afcon/ShareSheet';
import Toast from '@/components/afcon/Toast';
import NotificationBell from '@/components/afcon/NotificationBell';
import { LiveStream } from '@/components/afcon/LiveStream';

type EventType = 'goal' | 'yellow' | 'red' | 'sub' | 'var' | 'injury' | 'penalty_scored' | 'penalty_missed' | 'own_goal';

interface MatchEvent {
    id?: string;
    type: EventType;
    minute: number;
    team: 'home' | 'away';
    playerName: string;
    subPlayerName?: string;
    createdAt: any;
}

export default function FixtureDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [fixture, setFixture] = useState<Fixture | null>(null);
    const [teams, setTeams] = useState<Map<string, Team>>(new Map());
    const [standings, setStandings] = useState<TeamStanding[]>([]);
    const [events, setEvents] = useState<MatchEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'lineups' | 'table' | 'stats'>('lineups');
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Fetch teams first
    useEffect(() => {
        const fetchTeams = async () => {
            const q = query(collection(db, 'afcon_teams'), orderBy('name'));
            const snapshot = await getDocs(q);
            const teamsMap = new Map<string, Team>();
            snapshot.docs.forEach(doc => {
                teamsMap.set(doc.id, { id: doc.id, ...doc.data() } as Team);
            });
            setTeams(teamsMap);
        };
        fetchTeams();
    }, []);

    // Resolve slug to fixture ID and subscribe to updates
    useEffect(() => {
        let unsubscribe: (() => void) | null = null;
        let cancelled = false;

        const setupSubscription = async () => {
            // First, resolve the slug/ID to get the actual fixture
            const fixtureData = await getFixtureBySlugOrId(resolvedParams.id);

            if (cancelled) return;

            if (!fixtureData) {
                setFixture(null);
                setLoading(false);
                return;
            }

            // Now subscribe to the fixture document using the resolved ID
            unsubscribe = onSnapshot(doc(db, 'fixtures', fixtureData.id), (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const homeTeam = teams.get(data.homeTeamId);
                    const awayTeam = teams.get(data.awayTeamId);

                    setFixture({
                        id: snapshot.id,
                        ...data,
                        homeTeamName: homeTeam?.name || 'TBD',
                        homeTeamLogoUrl: homeTeam?.flag_url || homeTeam?.crest_url || '',
                        awayTeamName: awayTeam?.name || 'TBD',
                        awayTeamLogoUrl: awayTeam?.flag_url || awayTeam?.crest_url || '',
                    } as Fixture);
                } else {
                    setFixture(null);
                }
                setLoading(false);
            });
        };

        setupSubscription();

        return () => {
            cancelled = true;
            if (unsubscribe) unsubscribe();
        };
    }, [resolvedParams.id, teams]);

    // Subscribe to match events - only after fixture is loaded
    useEffect(() => {
        if (!fixture?.id) return;

        const q = query(
            collection(db, 'fixtures', fixture.id, 'events'),
            orderBy('minute', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as MatchEvent));
            setEvents(eventsData);
        });

        return () => unsubscribe();
    }, [fixture?.id]);

    // Fetch standings for the fixture's group
    useEffect(() => {
        if (!fixture?.groupOrStage) return;

        // Extract group letter from groupOrStage (e.g., "Group A" -> "A")
        const groupMatch = fixture.groupOrStage.match(/Group\s*([A-F])/i);
        if (!groupMatch) return;

        const groupLetter = groupMatch[1].toUpperCase();

        const fetchStandings = async () => {
            try {
                const standingsQuery = query(
                    collection(db, 'afcon_standings'),
                    where('group', '==', groupLetter)
                );
                const snapshot = await getDocs(standingsQuery);
                const standingsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as TeamStanding));

                // Sort by points, then goal difference, then goals for
                standingsData.sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
                    return b.goalsFor - a.goalsFor;
                });

                setStandings(standingsData);
            } catch (error) {
                console.error('Error fetching standings:', error);
            }
        };

        fetchStandings();
    }, [fixture?.groupOrStage]);

    // Live clock hook for real-time minutes:seconds
    const { displayTime, isRunning, inAddedTime } = useLiveClock({
        clockStartedAt: fixture?.clockStartedAt,
        clockOffsetMs: fixture?.clockOffsetMs || 0,
        clockIsRunning: fixture?.clockIsRunning || false,
        addedTime: fixture?.addedTime || 0,
        status: fixture?.status || 'upcoming',
        period: fixture?.period || 'first',
    });

    // Notification subscription hook
    const {
        isSubscribed,
        isLoading: subscriptionLoading,
        toggle: toggleSubscription,
    } = useNotificationSubscription(fixture?.id || null);

    const handleShare = async () => {
        // Use slug for SEO-friendly URLs, fallback to ID
        const fixtureSlug = fixture?.slug || resolvedParams.id;
        const url = `${window.location.origin}/afcon25/fixtures/${fixtureSlug}`;
        const title = fixture ? `${fixture.homeTeamName} vs ${fixture.awayTeamName}` : 'Match';
        const text = fixture ? `Watch ${fixture.homeTeamName} vs ${fixture.awayTeamName} - AFCON 2025` : '';

        // Try native share first
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
                return;
            } catch (error) {
                // User cancelled or error, fall through to share sheet
            }
        }

        // Open share sheet
        setIsShareOpen(true);
    };

    const handleNotificationToggle = async () => {
        try {
            await toggleSubscription();
            setToast({
                message: isSubscribed
                    ? 'Notifications turned off'
                    : 'You will get updates for this match',
                type: 'success',
            });
        } catch (error) {
            setToast({
                message: 'Failed to update notification settings',
                type: 'error',
            });
        }
    };

    const handleFavoriteToggle = () => {
        setIsFavorite(!isFavorite);
        setToast({
            message: isFavorite ? 'Removed from favorites' : 'Added to favorites',
            type: 'info',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f13] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!fixture) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f13] flex flex-col items-center justify-center px-4">
                <div className="text-6xl mb-4">⚽</div>
                <h1 className="text-xl font-bold text-black dark:text-white mb-2">Fixture Not Found</h1>
                <p className="text-gray-600 dark:text-gray-500 text-center mb-6">
                    This match doesn't exist or has been removed.
                </p>
                <button
                    onClick={() => router.push('/afcon25/fixtures')}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium"
                >
                    Back to Fixtures
                </button>
            </div>
        );
    }

    const kickoffDate = fixture.kickoffDateTime instanceof Timestamp
        ? fixture.kickoffDateTime.toDate()
        : new Date(fixture.kickoffDateTime);

    const formatKickoffTime = () => dayjs(kickoffDate).format('HH:mm');
    const formatKickoffDate = () => {
        const today = dayjs();
        const kickoff = dayjs(kickoffDate);
        if (kickoff.isSame(today, 'day')) return 'Today';
        if (kickoff.isSame(today.add(1, 'day'), 'day')) return 'Tomorrow';
        return kickoff.format('MMM D, YYYY');
    };

    const isLive = fixture.status === 'live';
    const isHT = fixture.status === 'ht';
    const isFT = fixture.status === 'ft';
    const showScore = fixture.status !== 'upcoming';

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/afcon25/fixtures/${fixture.slug || fixture.id}`
        : '';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f13]">
            {/* Stadium Background with Gradient */}
            <div
                className="relative h-[280px] bg-cover bg-center"
                style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(15, 15, 19, 0.3), rgba(15, 15, 19, 0.9)), url('/stadium-bg.jpg')`,
                    backgroundColor: '#1a1a24',
                }}
            >
                {/* Top Header Icons */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-6">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => router.push('/afcon25/fixtures')}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </motion.button>

                    <div className="flex items-center gap-2">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleShare}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
                        >
                            <Share2 className="w-5 h-5 text-white" />
                        </motion.button>
                        <NotificationBell
                            isSubscribed={isSubscribed}
                            isLoading={subscriptionLoading}
                            onToggleSubscription={handleNotificationToggle}
                        />
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleFavoriteToggle}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
                        >
                            {isFavorite ? (
                                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                            ) : (
                                <Star className="w-5 h-5 text-white" />
                            )}
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Live Stream - Shows when broadcasting */}
            {(isLive || isHT) && (
                <div className="mx-4 -mt-[100px] mb-4 relative z-10">
                    <LiveStream
                        fixtureId={fixture.id}
                        homeTeamName={fixture.homeTeamName}
                        awayTeamName={fixture.awayTeamName}
                        homeTeamLogo={fixture.homeTeamLogoUrl}
                        awayTeamLogo={fixture.awayTeamLogoUrl}
                        homeScore={fixture.homeScore}
                        awayScore={fixture.awayScore}
                        matchTime={displayTime}
                        showOverlay={true}
                    />
                </div>
            )}

            {/* Main Match Card */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`mx-4 ${(isLive || isHT) ? '' : '-mt-[120px]'} relative z-10`}
            >
                <div className="bg-white dark:bg-gray-900/90 backdrop-blur-lg rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-xl">
                    {/* Teams and Score/Time */}
                    <div className="flex items-center justify-between gap-4">
                        {/* Home Team */}
                        <div className="flex-1 flex flex-col items-center text-center">
                            {fixture.homeTeamLogoUrl ? (
                                <img
                                    src={fixture.homeTeamLogoUrl}
                                    alt={fixture.homeTeamName}
                                    className="w-16 h-16 object-contain mb-2"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2">
                                    <span className="text-lg font-bold text-gray-500 dark:text-gray-400">
                                        {(fixture.homeTeamName || 'HM').substring(0, 2).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <span className="text-black dark:text-white font-semibold text-sm mb-2 line-clamp-2">
                                {fixture.homeTeamName}
                            </span>
                            {fixture.homeRecentForm && fixture.homeRecentForm.length > 0 && (
                                <FormDots form={fixture.homeRecentForm} size="md" />
                            )}

                        </div>

                        {/* Center: Score or Time */}
                        <div className="flex flex-col items-center min-w-[100px]">
                            {showScore ? (
                                <>
                                    {/* Score */}
                                    <div className="flex items-center gap-3 text-4xl font-bold text-black dark:text-white mb-1">
                                        <span>{fixture.homeScore}</span>
                                        <span className="text-gray-600 text-2xl">-</span>
                                        <span>{fixture.awayScore}</span>
                                    </div>

                                    {/* Live badge or status */}
                                    {isLive && (
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-2 px-3 py-1 bg-red-600/30 rounded-full">
                                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                <span className="text-red-500 font-mono font-bold text-lg">
                                                    {displayTime}
                                                </span>
                                            </div>
                                            {/* Added time indicator */}
                                            {inAddedTime && fixture?.addedTime && fixture.addedTime > 0 && (
                                                <span className="text-xs text-yellow-500 font-medium">
                                                    +{fixture.addedTime} min added
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {isHT && (
                                        <span className="px-3 py-1 bg-yellow-600/30 rounded-full text-yellow-500 font-bold text-sm">Half Time</span>
                                    )}
                                    {isFT && (
                                        <span className="px-3 py-1 bg-gray-600/30 rounded-full text-gray-400 font-bold text-sm">Full Time</span>
                                    )}

                                    {/* Penalties */}
                                    {fixture.penalties && (
                                        <span className="text-xs text-gray-500 mt-1">
                                            ({fixture.homePenScore} - {fixture.awayPenScore} pen)
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Kickoff Time */}
                                    <span className="text-4xl font-bold text-black dark:text-white mb-1">
                                        {formatKickoffTime()}
                                    </span>
                                    <span className="text-gray-500 text-sm">{formatKickoffDate()}</span>
                                </>
                            )}
                        </div>

                        {/* Away Team */}
                        <div className="flex-1 flex flex-col items-center text-center">
                            {fixture.awayTeamLogoUrl ? (
                                <img
                                    src={fixture.awayTeamLogoUrl}
                                    alt={fixture.awayTeamName}
                                    className="w-16 h-16 object-contain mb-2"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2">
                                    <span className="text-lg font-bold text-gray-500 dark:text-gray-400">
                                        {(fixture.awayTeamName || 'AW').substring(0, 2).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <span className="text-black dark:text-white font-semibold text-sm mb-2 line-clamp-2">
                                {fixture.awayTeamName}
                            </span>
                            {fixture.awayRecentForm && fixture.awayRecentForm.length > 0 && (
                                <FormDots form={fixture.awayRecentForm} size="md" />
                            )}

                        </div>
                    </div>

                    {/* Match Events Row */}
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800/50 grid grid-cols-2 gap-8">
                        {/* Home Events */}
                        <div className="text-right space-y-1">
                            {(() => {
                                const homeEvents = events.filter(e => e.team === 'home' && (e.type === 'goal' || e.type === 'own_goal' || e.type === 'penalty_scored' || e.type === 'red'));
                                const grouped = new Map<string, MatchEvent[]>();
                                homeEvents.forEach(e => {
                                    if (!grouped.has(e.playerName)) grouped.set(e.playerName, []);
                                    grouped.get(e.playerName)!.push(e);
                                });

                                return Array.from(grouped.entries()).map(([player, playerEvents]) => (
                                    <div key={player} className="text-sm text-gray-700 dark:text-gray-300">
                                        <span className="font-medium mr-2">{player}</span>
                                        <span className="text-gray-500 font-mono text-xs">
                                            {playerEvents.sort((a, b) => a.minute - b.minute).map((e, idx) => (
                                                <span key={idx}>
                                                    {idx > 0 && ', '}
                                                    {e.minute}&apos;
                                                    {e.type === 'goal' && '⚽'}
                                                    {e.type === 'own_goal' && '🔴⚽'}
                                                    {e.type === 'penalty_scored' && '⚽(P)'}
                                                    {e.type === 'red' && '🟥'}
                                                </span>
                                            ))}
                                        </span>
                                    </div>
                                ));
                            })()}
                        </div>

                        {/* Away Events */}
                        <div className="text-left space-y-1">
                            {(() => {
                                const awayEvents = events.filter(e => e.team === 'away' && (e.type === 'goal' || e.type === 'own_goal' || e.type === 'penalty_scored' || e.type === 'red'));
                                const grouped = new Map<string, MatchEvent[]>();
                                awayEvents.forEach(e => {
                                    if (!grouped.has(e.playerName)) grouped.set(e.playerName, []);
                                    grouped.get(e.playerName)!.push(e);
                                });

                                return Array.from(grouped.entries()).map(([player, playerEvents]) => (
                                    <div key={player} className="text-sm text-gray-700 dark:text-gray-300">
                                        <span className="text-gray-500 font-mono text-xs mr-2">
                                            {playerEvents.sort((a, b) => a.minute - b.minute).map((e, idx) => (
                                                <span key={idx}>
                                                    {idx > 0 && ', '}
                                                    {e.minute}&apos;
                                                    {e.type === 'goal' && '⚽'}
                                                    {e.type === 'own_goal' && '🔴⚽'}
                                                    {e.type === 'penalty_scored' && '⚽(P)'}
                                                    {e.type === 'red' && '🟥'}
                                                </span>
                                            ))}
                                        </span>
                                        <span className="font-medium">{player}</span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* Venue */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 text-center">
                        <span className="text-xs text-gray-500">📍 {fixture.venue}</span>
                    </div>
                </div>
            </motion.div>

            {/* Tab Buttons */}
            <div className="mx-4 mt-6">
                <div className="flex gap-2">
                    {(['lineups', 'table', 'stats'] as const).map((tab) => (
                        <motion.button
                            key={tab}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 rounded-xl font-semibold text-sm capitalize transition-all ${activeTab === tab
                                ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white'
                                : 'bg-gray-100 dark:bg-gray-900/50 text-gray-500 dark:text-gray-500'
                                }`}
                        >
                            {tab}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="mx-4 mt-4 pb-8">
                <AnimatePresence mode="wait">
                    {activeTab === 'lineups' && (
                        <motion.div
                            key="lineups"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm"
                        >
                            <h3 className="text-black dark:text-white font-semibold mb-4">Starting Lineups</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Home Team */}
                                <div>
                                    <h4 className="text-xs text-gray-500 mb-2 font-medium">
                                        {fixture.homeTeamName}
                                    </h4>
                                    <div className="space-y-2">
                                        {(() => {
                                            const homeTeam = teams.get(fixture.homeTeamId);
                                            const players = homeTeam?.players || [];
                                            if (players.length === 0) {
                                                return (
                                                    <p className="text-xs text-gray-500 italic">
                                                        Lineup not yet available
                                                    </p>
                                                );
                                            }
                                            return players.slice(0, 11).map((player, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                                                >
                                                    <span className="w-5 h-5 bg-green-600/30 text-green-400 rounded-full flex items-center justify-center text-xs font-medium">
                                                        {index + 1}
                                                    </span>
                                                    <span>{player}</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                                {/* Away Team */}
                                <div>
                                    <h4 className="text-xs text-gray-500 mb-2 font-medium">
                                        {fixture.awayTeamName}
                                    </h4>
                                    <div className="space-y-2">
                                        {(() => {
                                            const awayTeam = teams.get(fixture.awayTeamId);
                                            const players = awayTeam?.players || [];
                                            if (players.length === 0) {
                                                return (
                                                    <p className="text-xs text-gray-500 italic">
                                                        Lineup not yet available
                                                    </p>
                                                );
                                            }
                                            return players.slice(0, 11).map((player, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-2 text-sm text-gray-300"
                                                >
                                                    <span className="w-5 h-5 bg-blue-600/30 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                                                        {index + 1}
                                                    </span>
                                                    <span>{player}</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>
                            {(!teams.get(fixture.homeTeamId)?.players?.length && !teams.get(fixture.awayTeamId)?.players?.length) && (
                                <p className="text-xs text-gray-600 text-center mt-4">
                                    Lineups will be available before kickoff
                                </p>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'table' && (
                        <motion.div
                            key="table"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm"
                        >
                            <h3 className="text-black dark:text-white font-semibold mb-4">{fixture.groupOrStage}</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-500 text-xs">
                                            <th className="text-left py-2">#</th>
                                            <th className="text-left py-2">Team</th>
                                            <th className="text-center py-2">P</th>
                                            <th className="text-center py-2">W</th>
                                            <th className="text-center py-2">D</th>
                                            <th className="text-center py-2">L</th>
                                            <th className="text-center py-2">GD</th>
                                            <th className="text-center py-2">Pts</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {standings.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="py-6 text-center text-gray-500 italic">
                                                    No standings available for this group
                                                </td>
                                            </tr>
                                        ) : (
                                            standings.map((standing, index) => {
                                                const isCurrentTeam = standing.teamId === fixture.homeTeamId || standing.teamId === fixture.awayTeamId;
                                                return (
                                                    <tr
                                                        key={standing.id || index}
                                                        className={`border-t border-gray-200 dark:border-gray-800 ${isCurrentTeam ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                                                    >
                                                        <td className="py-3 text-gray-400">{index + 1}</td>
                                                        <td className={`py-3 ${isCurrentTeam ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-black dark:text-white'}`}>
                                                            {standing.teamName}
                                                        </td>
                                                        <td className="py-3 text-center text-gray-400">{standing.played}</td>
                                                        <td className="py-3 text-center text-gray-400">{standing.won}</td>
                                                        <td className="py-3 text-center text-gray-400">{standing.drawn}</td>
                                                        <td className="py-3 text-center text-gray-400">{standing.lost}</td>
                                                        <td className="py-3 text-center text-gray-400">
                                                            {standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}
                                                        </td>
                                                        <td className={`py-3 text-center font-bold ${isCurrentTeam ? 'text-green-600 dark:text-green-400' : 'text-black dark:text-white'}`}>
                                                            {standing.points}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'stats' && (
                        <motion.div
                            key="stats"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm"
                        >
                            <h3 className="text-black dark:text-white font-semibold mb-4">Match Statistics</h3>
                            <div className="space-y-4">
                                {/* Possession */}
                                <StatRow label="Possession" home={55} away={45} unit="%" />
                                <StatRow label="Shots on Target" home={6} away={3} />
                                <StatRow label="Total Shots" home={14} away={8} />
                                <StatRow label="Corner Kicks" home={5} away={3} />
                                <StatRow label="Fouls" home={12} away={15} />
                                <StatRow label="Yellow Cards" home={2} away={3} />
                            </div>
                            {fixture.status === 'upcoming' && (
                                <p className="text-xs text-gray-600 text-center mt-4">
                                    Stats will be available during the match
                                </p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Share Sheet */}
            <ShareSheet
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                url={shareUrl}
                title={`${fixture.homeTeamName} vs ${fixture.awayTeamName}`}
                text="Watch this AFCON 2025 match"
            />

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    isVisible={!!toast}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}

// Stats row component
function StatRow({
    label,
    home,
    away,
    unit = '',
}: {
    label: string;
    home: number;
    away: number;
    unit?: string;
}) {
    const total = home + away;
    const homePercent = total > 0 ? (home / total) * 100 : 50;
    const awayPercent = total > 0 ? (away / total) * 100 : 50;

    return (
        <div>
            <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-black dark:text-white font-medium">{home}{unit}</span>
                <span className="text-gray-600 dark:text-gray-500 text-xs">{label}</span>
                <span className="text-black dark:text-white font-medium">{away}{unit}</span>
            </div>
            <div className="flex gap-1 h-1.5">
                <div
                    className="bg-green-500 rounded-l-full"
                    style={{ width: `${homePercent}%` }}
                />
                <div
                    className="bg-gray-600 rounded-r-full"
                    style={{ width: `${awayPercent}%` }}
                />
            </div>
        </div>
    );
}

