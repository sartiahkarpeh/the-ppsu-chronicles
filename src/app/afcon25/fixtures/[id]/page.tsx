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
import { useNotificationPrompt } from '@/hooks/useNotificationPrompt';
import type { Fixture, FixtureStatusType } from '@/types/fixtureTypes';
import type { Team, TeamStanding } from '@/types/afcon';
import FormDots from '@/components/afcon/FormDots';
import ShareSheet from '@/components/afcon/ShareSheet';
import Toast from '@/components/afcon/Toast';
import NotificationBell from '@/components/afcon/NotificationBell';
import NotificationPrompt from '@/components/afcon/NotificationPrompt';
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
    const [showCelebration, setShowCelebration] = useState(false);
    const FINAL_FIXTURE_ID = 'defhFOoFnIsd8HuLKcTG';
    const TEST_FINAL_ID = 'iAo14CaKuwZsuFclTp9h';

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

    // Notification prompt hook for auto-prompting on page load
    const {
        shouldShowPrompt,
        isLoading: promptLoading,
        enableNotifications,
        dismissPrompt,
        neverAskAgain,
    } = useNotificationPrompt(fixture?.id || null);

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

    const isFinal = fixture && (fixture.id === FINAL_FIXTURE_ID || fixture.id === TEST_FINAL_ID || fixture.groupOrStage?.toLowerCase().includes('final'));
    const actualWinner = fixture?.status === 'ft' ? (
        (fixture.homeScore || 0) > (fixture.awayScore || 0) ? 'home' :
            (fixture.awayScore || 0) > (fixture.homeScore || 0) ? 'away' :
                fixture.penalties ? (
                    (fixture.homePenScore || 0) > (fixture.awayPenScore || 0) ? 'home' :
                        (fixture.awayPenScore || 0) > (fixture.homePenScore || 0) ? 'away' : null
                ) : null
    ) : null;

    useEffect(() => {
        if (isFinal && fixture?.status === 'ft' && actualWinner) {
            // Check if we already showed it or if it just finished
            const hasCeled = sessionStorage.getItem(`celed_${fixture.id}`);
            if (!hasCeled) {
                setShowCelebration(true);
                sessionStorage.setItem(`celed_${fixture.id}`, 'true');
                const timer = setTimeout(() => setShowCelebration(false), 30000);
                return () => clearTimeout(timer);
            }
        }
    }, [fixture?.status, actualWinner, isFinal]);

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
                className={`relative ${isFinal ? 'h-[340px]' : 'h-[280px]'} bg-cover bg-center`}
                style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(15, 15, 19, 0.3), rgba(15, 15, 19, 0.9)), url('/stadium-bg.jpg')`,
                    backgroundColor: '#1a1a24',
                }}
            >
                {/* Top Header Icons - Always at the very top */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-4 z-20">
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

                {/* AFCON 2025 GRAND FINALE - Banner below icons for Finals */}
                {isFinal && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                        className="absolute top-16 left-0 right-0 z-10"
                    >
                        <div className="relative mx-4 bg-black/40 backdrop-blur-md rounded-2xl border border-afcon-gold/30 overflow-hidden">
                            {/* Animated background shimmer */}
                            <motion.div
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-afcon-gold/10 to-transparent"
                            />

                            {/* Golden borders */}
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-afcon-gold to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-afcon-gold to-transparent" />

                            <div className="relative py-4 px-4">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    {/* Trophy with glow */}
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.1, 1],
                                            filter: [
                                                'drop-shadow(0 0 8px rgba(234,179,8,0.4))',
                                                'drop-shadow(0 0 20px rgba(234,179,8,0.8))',
                                                'drop-shadow(0 0 8px rgba(234,179,8,0.4))'
                                            ]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-afcon-gold" />
                                    </motion.div>

                                    {/* Main Title */}
                                    <div className="text-center">
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.3, duration: 0.5 }}
                                        >
                                            <span className="block text-[10px] sm:text-xs tracking-[0.5em] text-white font-bold mb-1">
                                                AFCON 2025
                                            </span>
                                            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-black uppercase tracking-tight">
                                                <span className="bg-gradient-to-b from-afcon-gold via-[#fff1be] to-afcon-gold bg-clip-text text-transparent">
                                                    GRAND FINALE
                                                </span>
                                            </h1>
                                        </motion.div>

                                        {/* Decorative line */}
                                        <motion.div
                                            initial={{ opacity: 0, scaleX: 0 }}
                                            animate={{ opacity: 1, scaleX: 1 }}
                                            transition={{ delay: 0.6, duration: 0.8 }}
                                            className="flex items-center justify-center gap-2 mt-2"
                                        >
                                            <div className="h-px w-6 sm:w-12 bg-gradient-to-r from-transparent to-afcon-gold/60" />
                                            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-afcon-gold/80 fill-afcon-gold/80" />
                                            <span className="text-[7px] sm:text-[9px] text-white/70 uppercase tracking-[0.15em] font-medium">
                                                The Battle for Africa&apos;s Crown
                                            </span>
                                            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-afcon-gold/80 fill-afcon-gold/80" />
                                            <div className="h-px w-6 sm:w-12 bg-gradient-to-l from-transparent to-afcon-gold/60" />
                                        </motion.div>
                                    </div>
                                </div>
                            </div>

                            {/* Sparkle particles */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                {[...Array(6)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0 }}
                                        animate={{
                                            opacity: [0, 1, 0],
                                            scale: [0.5, 1, 0.5],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            delay: i * 0.4,
                                        }}
                                        className="absolute w-1 h-1 bg-afcon-gold rounded-full"
                                        style={{
                                            left: `${15 + i * 14}%`,
                                            top: `${20 + (i % 2) * 60}%`,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
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
            {
                toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        isVisible={!!toast}
                        onClose={() => setToast(null)}
                    />
                )
            }

            {/* Notification Permission Prompt */}
            <NotificationPrompt
                isVisible={shouldShowPrompt}
                isLoading={promptLoading}
                onEnable={enableNotifications}
                onDismiss={dismissPrompt}
                onNeverAsk={neverAskAgain}
                homeTeam={fixture.homeTeamName}
                awayTeam={fixture.awayTeamName}
            />

            {/* Winner Celebration Overlay - Ultra Premium Cinematic Mobile-First */}
            <AnimatePresence>
                {showCelebration && actualWinner && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-xl overflow-hidden"
                    >
                        {/* Dramatic Radial Background */}
                        <div className="absolute inset-0">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.15)_0%,transparent_70%)]" />
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.3, 0.5, 0.3]
                                }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.1)_0%,transparent_50%)]"
                            />
                        </div>

                        {/* Spectacular Fireworks - Multi-layer */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {/* Large Burst Fireworks */}
                            {[...Array(8)].map((_, burstIdx) => (
                                <div
                                    key={`burst-${burstIdx}`}
                                    className="absolute"
                                    style={{
                                        left: `${10 + (burstIdx * 12) % 80}%`,
                                        top: `${10 + (burstIdx * 8) % 50}%`
                                    }}
                                >
                                    {[...Array(20)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                                            animate={{
                                                scale: [0, 1.5, 0.8, 0],
                                                opacity: [1, 1, 0.5, 0],
                                                x: Math.cos(i * 18 * Math.PI / 180) * (80 + burstIdx * 15),
                                                y: Math.sin(i * 18 * Math.PI / 180) * (80 + burstIdx * 15),
                                            }}
                                            transition={{
                                                duration: 2.5,
                                                delay: burstIdx * 0.8 + 0.5,
                                                repeat: Infinity,
                                                repeatDelay: 4
                                            }}
                                            className="absolute w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                                            style={{
                                                backgroundColor: ['#EAB308', '#FBBF24', '#FCD34D', '#FFFFFF', '#F59E0B'][i % 5],
                                                boxShadow: `0 0 20px ${['#EAB308', '#FBBF24', '#FCD34D'][i % 3]}`
                                            }}
                                        />
                                    ))}
                                </div>
                            ))}

                            {/* Sparkle Trail Fireworks */}
                            {[...Array(6)].map((_, idx) => (
                                <motion.div
                                    key={`trail-${idx}`}
                                    initial={{
                                        x: `${20 + idx * 15}%`,
                                        y: '100%',
                                        opacity: 0
                                    }}
                                    animate={{
                                        y: ['100%', '30%', '20%'],
                                        opacity: [0, 1, 0],
                                        scale: [0.5, 1, 1.5]
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        delay: idx * 1.2 + 1,
                                        repeat: Infinity,
                                        repeatDelay: 5
                                    }}
                                    className="absolute w-3 h-3 rounded-full bg-afcon-gold"
                                    style={{
                                        boxShadow: '0 0 30px rgba(234,179,8,0.8), 0 0 60px rgba(234,179,8,0.4)'
                                    }}
                                />
                            ))}

                            {/* Confetti Strips */}
                            {[...Array(50)].map((_, i) => (
                                <motion.div
                                    key={`confetti-${i}`}
                                    initial={{
                                        x: `${Math.random() * 100}%`,
                                        y: -20,
                                        rotate: 0,
                                        opacity: 0
                                    }}
                                    animate={{
                                        y: '110vh',
                                        rotate: 720 + Math.random() * 720,
                                        opacity: [0, 1, 1, 0.5]
                                    }}
                                    transition={{
                                        duration: 4 + Math.random() * 6,
                                        repeat: Infinity,
                                        delay: Math.random() * 8,
                                        ease: "linear"
                                    }}
                                    className="absolute"
                                    style={{
                                        width: `${4 + Math.random() * 8}px`,
                                        height: `${8 + Math.random() * 16}px`,
                                        backgroundColor: ['#EAB308', '#FBBF24', '#FFFFFF', '#22C55E', '#3B82F6', '#EF4444'][i % 6],
                                        borderRadius: '2px'
                                    }}
                                />
                            ))}

                            {/* Golden Shimmer Particles */}
                            {[...Array(30)].map((_, i) => (
                                <motion.div
                                    key={`shimmer-${i}`}
                                    animate={{
                                        opacity: [0, 1, 0],
                                        scale: [0, 1, 0],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        delay: Math.random() * 6,
                                    }}
                                    className="absolute w-1 h-1 bg-afcon-gold rounded-full"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: `${Math.random() * 100}%`,
                                        boxShadow: '0 0 10px rgba(234,179,8,0.6)'
                                    }}
                                />
                            ))}
                        </div>

                        {/* Refined Champion Card - Mobile First */}
                        <motion.div
                            initial={{ scale: 0.7, y: 80, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                            className="relative bg-gradient-to-b from-black/60 to-black/80 backdrop-blur-3xl border-2 border-afcon-gold/50 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 md:p-16 shadow-[0_0_100px_rgba(234,179,8,0.3)] text-center max-w-sm sm:max-w-lg w-full mx-2 overflow-hidden"
                        >
                            {/* Animated border glow */}
                            <motion.div
                                animate={{ opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 rounded-[2rem] sm:rounded-[3rem] border-2 border-afcon-gold/30 pointer-events-none"
                            />

                            {/* Inner glow effects */}
                            <div className="absolute inset-0 bg-gradient-to-t from-afcon-gold/10 via-transparent to-transparent pointer-events-none rounded-[2rem] sm:rounded-[3rem]" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-afcon-gold to-transparent" />

                            {/* Close Button */}
                            <button
                                onClick={() => setShowCelebration(false)}
                                className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/40 hover:text-white transition-colors z-20 p-2 hover:bg-white/10 rounded-full"
                            >
                                <X className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>

                            {/* Trophy Section */}
                            <div className="mb-6 sm:mb-10 flex justify-center relative">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.05, 1],
                                        filter: [
                                            'drop-shadow(0 0 30px rgba(234,179,8,0.5))',
                                            'drop-shadow(0 0 60px rgba(234,179,8,0.8))',
                                            'drop-shadow(0 0 30px rgba(234,179,8,0.5))'
                                        ]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="relative z-10"
                                >
                                    <Trophy className="w-20 h-20 sm:w-32 sm:h-32 md:w-40 md:h-40 text-afcon-gold" />
                                </motion.div>
                                {/* Pulsing halo */}
                                <motion.div
                                    animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-48 sm:h-48 bg-afcon-gold/20 blur-[60px] rounded-full"
                                />
                            </div>

                            {/* Champion Info */}
                            <motion.div
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                <span className="text-afcon-gold font-display font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] text-[8px] sm:text-xs mb-4 sm:mb-6 block">
                                    🏆 AFCON 2025 CHAMPIONS 🏆
                                </span>
                                <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-black text-white uppercase tracking-tight mb-6 sm:mb-8 leading-[0.95]">
                                    <motion.span
                                        animate={{
                                            textShadow: [
                                                '0 0 20px rgba(234,179,8,0.3)',
                                                '0 0 40px rgba(234,179,8,0.6)',
                                                '0 0 20px rgba(234,179,8,0.3)'
                                            ]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        {actualWinner === 'home' ? fixture.homeTeamName : fixture.awayTeamName}
                                    </motion.span>
                                </h2>

                                {/* Winner Flag */}
                                <div className="flex justify-center mb-8 sm:mb-10 relative">
                                    <div className="relative">
                                        <motion.img
                                            initial={{ scale: 0, rotate: -30 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: 'spring', damping: 12, delay: 0.6 }}
                                            src={actualWinner === 'home' ? fixture.homeTeamLogoUrl : fixture.awayTeamLogoUrl}
                                            alt="Champion"
                                            className="w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44 object-contain z-10 filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
                                        />
                                        {/* Floating stars around flag */}
                                        {[...Array(5)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                animate={{
                                                    opacity: [0, 1, 0],
                                                    scale: [0.5, 1, 0.5],
                                                    y: [0, -20, 0]
                                                }}
                                                transition={{
                                                    delay: 1 + i * 0.5,
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    repeatDelay: 2
                                                }}
                                                className="absolute text-afcon-gold"
                                                style={{
                                                    left: `${-20 + i * 40}%`,
                                                    top: `${i % 2 === 0 ? -10 : 90}%`
                                                }}
                                            >
                                                <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-afcon-gold" />
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quote */}
                                <p className="text-white/50 text-xs sm:text-sm md:text-base leading-relaxed italic max-w-[280px] sm:max-w-[320px] mx-auto">
                                    &quot;A historic triumph for the ages. Glory is yours.&quot;
                                </p>

                                {/* Decorative footer */}
                                <motion.div
                                    initial={{ opacity: 0, scaleX: 0 }}
                                    animate={{ opacity: 1, scaleX: 1 }}
                                    transition={{ delay: 1, duration: 0.8 }}
                                    className="mt-8 sm:mt-10 flex items-center justify-center gap-3 sm:gap-4 opacity-60"
                                >
                                    <div className="h-px w-6 sm:w-10 bg-gradient-to-r from-transparent to-afcon-gold" />
                                    <div className="flex gap-1">
                                        {[...Array(3)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ delay: 1.2 + i * 0.2, duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                                            >
                                                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-afcon-gold fill-afcon-gold" />
                                            </motion.div>
                                        ))}
                                    </div>
                                    <div className="h-px w-6 sm:w-10 bg-gradient-to-l from-transparent to-afcon-gold" />
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
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
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
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
                    className="bg-gray-200 dark:bg-gray-800 rounded-r-full flex-1"
                >
                    <div
                        className="bg-gray-600 dark:bg-gray-500 h-full rounded-r-full"
                        style={{ width: `${awayPercent}%`, float: 'right' }}
                    />
                </div>
            </div>
        </div>
    );
}

