'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Play,
    Pause,
    Square,
    Plus,
    Minus,
    Clock,
    AlertTriangle,
    RotateCcw,
    Activity,
    Timer,
} from 'lucide-react';
import { doc, onSnapshot, updateDoc, Timestamp, collection, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Fixture, FixtureStatusType } from '@/types/fixtureTypes';
import type { Team } from '@/types/afcon';
import { useLiveClock } from '@/hooks/useLiveClock';
import { sendFixtureNotification, notificationTemplates } from '@/lib/afcon/notificationService';

type EventType = 'goal' | 'yellow' | 'red' | 'sub' | 'var' | 'injury' | 'penalty_scored' | 'penalty_missed' | 'own_goal';

interface MatchEvent {
    id?: string;
    type: EventType;
    minute: number;
    team: 'home' | 'away';
    playerName?: string;
    description?: string;
    createdAt: Timestamp;
}

export default function LiveScorecard({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const resolvedParams = use(params);
    const router = useRouter();
    const fixtureId = resolvedParams.id;

    const [fixture, setFixture] = useState<Fixture | null>(null);
    const [teams, setTeams] = useState<Map<string, Team>>(new Map());
    const [events, setEvents] = useState<MatchEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // Quick event modal
    const [showEventModal, setShowEventModal] = useState(false);
    const [eventTeam, setEventTeam] = useState<'home' | 'away'>('home');
    const [eventType, setEventType] = useState<EventType>('goal');
    const [eventPlayerName, setEventPlayerName] = useState('');
    const [eventSubPlayerName, setEventSubPlayerName] = useState('');

    // Use live clock hook
    const { displayTime, minutes, isRunning, inAddedTime, addedTimeExpired, elapsedAddedTime, addedTime: currentAddedTime } = useLiveClock({
        clockStartedAt: fixture?.clockStartedAt,
        clockOffsetMs: fixture?.clockOffsetMs || 0,
        clockIsRunning: fixture?.clockIsRunning || false,
        addedTime: fixture?.addedTime || 0,
        status: fixture?.status || 'upcoming',
        period: fixture?.period || 'first',
    });

    // Fetch teams
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

    // Subscribe to fixture
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'fixtures', fixtureId), (snapshot) => {
            if (snapshot.exists()) {
                const data = { id: snapshot.id, ...snapshot.data() } as Fixture;
                setFixture(data);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [fixtureId]);

    // Subscribe to match events
    useEffect(() => {
        const eventsRef = collection(db, 'fixtures', fixtureId, 'events');
        const q = query(eventsRef, orderBy('minute', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as MatchEvent[];
            setEvents(eventsData);
        });

        return () => unsubscribe();
    }, [fixtureId]);

    const getTeam = (teamId: string) => teams.get(teamId);
    const homeTeam = fixture ? getTeam(fixture.homeTeamId) : null;
    const awayTeam = fixture ? getTeam(fixture.awayTeamId) : null;

    // Update fixture in Firestore
    const updateFixture = useCallback(async (updates: Record<string, any>) => {
        try {
            await updateDoc(doc(db, 'fixtures', fixtureId), {
                ...updates,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error updating fixture:', error);
        }
    }, [fixtureId]);

    // Start the clock
    const startClock = async () => {
        const currentOffset = fixture?.clockOffsetMs || 0;
        const isKickoff = currentOffset === 0; // First time starting = kickoff

        await updateFixture({
            clockStartedAt: Timestamp.now(),
            clockIsRunning: true,
            clockOffsetMs: currentOffset,
            status: 'live',
        });

        // Send kickoff notification
        if (isKickoff && homeTeam && awayTeam) {
            const template = notificationTemplates.kickoff(homeTeam.name, awayTeam.name);
            await sendFixtureNotification({
                fixtureId,
                ...template,
                homeTeam: homeTeam.name,
                awayTeam: awayTeam.name,
            });
        }
    };

    // Pause the clock
    const pauseClock = async () => {
        if (!fixture?.clockStartedAt || !fixture?.clockIsRunning) return;

        // Calculate current elapsed time and add to offset
        const startTime = fixture.clockStartedAt instanceof Timestamp
            ? fixture.clockStartedAt.toDate().getTime()
            : new Date(fixture.clockStartedAt).getTime();
        const elapsed = Date.now() - startTime;
        const totalOffset = (fixture.clockOffsetMs || 0) + elapsed;

        await updateFixture({
            clockIsRunning: false,
            clockOffsetMs: totalOffset,
            clockStartedAt: null,
            currentMinute: Math.floor(totalOffset / 60000),
        });
    };

    // Toggle clock
    const toggleClock = () => {
        if (fixture?.clockIsRunning) {
            pauseClock();
        } else {
            startClock();
        }
    };

    // Reset clock
    const resetClock = async () => {
        await updateFixture({
            clockStartedAt: null,
            clockOffsetMs: 0,
            clockIsRunning: false,
            currentMinute: 0,
            period: 'first',
            addedTime: 0,
            status: 'upcoming',
        });
    };

    // Set half time
    const setHalfTime = async () => {
        if (!fixture) return;
        const score = `${fixture.homeScore} - ${fixture.awayScore}`;

        await updateFixture({
            clockIsRunning: false,
            clockStartedAt: null,
            clockOffsetMs: 45 * 60 * 1000, // 45 minutes in ms
            currentMinute: 45,
            period: 'first',
            status: 'ht',
        });

        // Send half time notification
        if (homeTeam && awayTeam) {
            const template = notificationTemplates.halfTime(homeTeam.name, awayTeam.name, score);
            await sendFixtureNotification({
                fixtureId,
                ...template,
                homeTeam: homeTeam.name,
                awayTeam: awayTeam.name,
                score,
            });
        }
    };

    // Start second half
    const startSecondHalf = async () => {
        await updateFixture({
            clockStartedAt: Timestamp.now(),
            clockIsRunning: true,
            clockOffsetMs: 45 * 60 * 1000, // Start from 45 minutes
            period: 'second',
            status: 'live',
        });
    };

    // Set full time
    const setFullTime = async () => {
        if (!fixture) return;
        const score = `${fixture.homeScore} - ${fixture.awayScore}`;

        await updateFixture({
            clockIsRunning: false,
            clockStartedAt: null,
            clockOffsetMs: 90 * 60 * 1000, // 90 minutes in ms
            currentMinute: 90,
            status: 'ft',
        });

        // Send full time notification
        if (homeTeam && awayTeam) {
            const template = notificationTemplates.fullTime(homeTeam.name, awayTeam.name, score);
            await sendFixtureNotification({
                fixtureId,
                ...template,
                homeTeam: homeTeam.name,
                awayTeam: awayTeam.name,
                score,
            });
        }
    };

    // Update added time
    const setAddedTime = async (time: number) => {
        await updateFixture({ addedTime: time });
    };

    // Score controls
    const handleScoreChange = async (team: 'home' | 'away', delta: number) => {
        if (!fixture) return;
        const field = team === 'home' ? 'homeScore' : 'awayScore';
        const newScore = Math.max(0, (team === 'home' ? fixture.homeScore : fixture.awayScore) + delta);
        await updateFixture({ [field]: newScore });

        // Auto-add goal event on score increase
        if (delta > 0) {
            await addEvent('goal', team, undefined, undefined, false);
        }
    };

    // Add match event with notification
    const addEvent = async (type: EventType, team: 'home' | 'away', playerName?: string, subPlayerName?: string, shouldUpdateScore = true) => {
        const eventsRef = collection(db, 'fixtures', fixtureId, 'events');
        await addDoc(eventsRef, {
            type,
            minute: minutes,
            team,
            playerName: playerName || '',
            subPlayerName: subPlayerName || '', // For substitutions
            createdAt: Timestamp.now(),
        });

        // Update fixture score if it's a goal and shouldUpdateScore is true
        if (shouldUpdateScore && fixture && (type === 'goal' || type === 'own_goal' || type === 'penalty_scored')) {
            const field = team === 'home' ? 'homeScore' : 'awayScore';
            // Determine which team gets the goal (own goals go to the OTHER team usually, but let's stick to the team passed for now or check logic)
            // Usually 'team' in addEvent for own_goal means the team that conceded? Or the team that benefited?
            // Standard convention: 'team' is the team that gets the point.
            // If it's an own goal, usually we attribute the event to the team that scored it (the defender), but the point goes to the opponent.
            // BUT, for simplicity in this system, let's assume 'team' passed to addEvent is the team getting the goal/point for 'goal' and 'penalty_scored'.
            // For 'own_goal', it might be tricky. Let's assume 'team' is the one getting the point for now to be safe, or check how it's called.
            // In the modal, we select "Home" or "Away". If I select "Home" and "Own Goal", does that mean Home scored an own goal (Away gets point)?
            // The UI shows "Add {eventType} Event" and "Team Selection".
            // If I select "Home" and "Goal", Home gets a point.
            // If I select "Home" and "Own Goal", it implies Home committed the own goal, so Away gets the point.

            let scoreField = field;
            let currentScore = team === 'home' ? fixture.homeScore : fixture.awayScore;

            if (type === 'own_goal') {
                // If Home commits own goal, Away gets the point
                scoreField = team === 'home' ? 'awayScore' : 'homeScore';
                currentScore = team === 'home' ? fixture.awayScore : fixture.homeScore;
            }

            await updateFixture({ [scoreField]: currentScore + 1 });
        }

        // Send notification for goals, cards, subs, injuries
        if (homeTeam && awayTeam && fixture) {
            const teamName = team === 'home' ? homeTeam.name : awayTeam.name;
            const newScore = type === 'goal'
                ? (team === 'home'
                    ? `${fixture.homeScore + 1} - ${fixture.awayScore}`
                    : `${fixture.homeScore} - ${fixture.awayScore + 1}`)
                : `${fixture.homeScore} - ${fixture.awayScore}`;

            if (type === 'goal' || type === 'own_goal' || type === 'penalty_scored') {
                const template = notificationTemplates.goal(homeTeam.name, awayTeam.name, playerName || '', newScore);
                await sendFixtureNotification({
                    fixtureId,
                    ...template,
                    homeTeam: homeTeam.name,
                    awayTeam: awayTeam.name,
                    score: newScore,
                });
            } else if (type === 'yellow') {
                const template = notificationTemplates.yellowCard(homeTeam.name, awayTeam.name, playerName || 'Player');
                await sendFixtureNotification({
                    fixtureId,
                    ...template,
                    homeTeam: homeTeam.name,
                    awayTeam: awayTeam.name,
                });
            } else if (type === 'red') {
                const template = notificationTemplates.redCard(homeTeam.name, awayTeam.name, playerName || 'Player');
                await sendFixtureNotification({
                    fixtureId,
                    ...template,
                    homeTeam: homeTeam.name,
                    awayTeam: awayTeam.name,
                });
            } else if (type === 'sub' && playerName && subPlayerName) {
                await sendFixtureNotification({
                    fixtureId,
                    title: `🔄 Substitution - ${teamName}`,
                    body: `${minutes}' - ${playerName} OFF ➡️ ${subPlayerName} ON`,
                    type: 'substitution',
                    homeTeam: homeTeam.name,
                    awayTeam: awayTeam.name,
                });
            } else if (type === 'injury' && playerName) {
                await sendFixtureNotification({
                    fixtureId,
                    title: `🏥 Injury - ${teamName}`,
                    body: `${minutes}' - ${playerName} is receiving treatment`,
                    type: 'injury',
                    homeTeam: homeTeam.name,
                    awayTeam: awayTeam.name,
                });
            }
        }
    };

    // Handle quick event add
    const handleAddEvent = async () => {
        await addEvent(eventType, eventTeam, eventPlayerName, eventSubPlayerName);
        setShowEventModal(false);
        setEventPlayerName('');
        setEventSubPlayerName('');
    };

    const getEventIcon = (type: EventType) => {
        switch (type) {
            case 'goal': return '⚽';
            case 'own_goal': return '🔴⚽';
            case 'yellow': return '🟨';
            case 'red': return '🟥';
            case 'sub': return '🔄';
            case 'var': return '📺';
            case 'injury': return '🏥';
            case 'penalty_scored': return '⚽(P)';
            case 'penalty_missed': return '❌(P)';
            default: return '📝';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!fixture) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-4">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">Fixture Not Found</h1>
                <button
                    onClick={() => router.push('/admin/afcon25/fixtures')}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium"
                >
                    Back to Fixtures
                </button>
            </div>
        );
    }

    const isLive = fixture.status === 'live';
    const isHT = fixture.status === 'ht';
    const isFT = fixture.status === 'ft';

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-[#12121a] border-b border-gray-800">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => router.push('/admin/afcon25/fixtures')}
                        className="p-2 rounded-lg hover:bg-gray-800"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-300" />
                    </button>
                    <div className="flex items-center gap-2">
                        {isLive && (
                            <span className="flex items-center gap-1 px-3 py-1 bg-red-600 rounded-full text-xs font-bold text-white">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                LIVE
                            </span>
                        )}
                        {isHT && (
                            <span className="px-3 py-1 bg-yellow-600 rounded-full text-xs font-bold text-black">
                                HALF TIME
                            </span>
                        )}
                        {isFT && (
                            <span className="px-3 py-1 bg-gray-600 rounded-full text-xs font-bold text-white">
                                FULL TIME
                            </span>
                        )}
                    </div>
                    <div className="w-9" />
                </div>
            </div>

            {/* Main Scorecard */}
            <div className="px-4 py-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-3xl p-6 border border-gray-800 shadow-2xl"
                >
                    {/* Tournament & Stage */}
                    <div className="text-center mb-4">
                        <span className="text-xs text-gray-500 uppercase tracking-wider">
                            {fixture.tournament} • {fixture.groupOrStage}
                        </span>
                    </div>

                    {/* Teams & Score */}
                    <div className="flex items-center justify-between gap-4 mb-4">
                        {/* Home Team */}
                        <div className="flex-1 text-center">
                            {homeTeam?.flag_url ? (
                                <img
                                    src={homeTeam.flag_url}
                                    alt=""
                                    className="w-16 h-16 object-contain mx-auto mb-2"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <span className="text-lg font-bold text-gray-400">
                                        {homeTeam?.fifa_code || 'H'}
                                    </span>
                                </div>
                            )}
                            <h3 className="text-white font-bold text-sm truncate">
                                {homeTeam?.name || 'Home'}
                            </h3>

                        </div>

                        {/* Score & Clock Display */}
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-4 text-5xl font-black text-white mb-2">
                                <span>{fixture.homeScore}</span>
                                <span className="text-gray-600 text-3xl">-</span>
                                <span>{fixture.awayScore}</span>
                            </div>

                            {/* Live Clock Display */}
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isRunning ? 'bg-red-600/30' : 'bg-gray-800'
                                }`}>
                                <Timer className={`w-4 h-4 ${isRunning ? 'text-red-400 animate-pulse' : 'text-gray-500'}`} />
                                <span className={`font-mono text-xl font-bold ${isRunning ? 'text-red-400' : 'text-gray-400'
                                    }`}>
                                    {displayTime}
                                </span>
                            </div>

                            {/* Added Time Indicator */}
                            {fixture.addedTime && fixture.addedTime > 0 && (
                                <span className="text-xs text-yellow-500 mt-1">
                                    +{fixture.addedTime} mins added
                                </span>
                            )}

                            {/* Added Time Expired Alert */}
                            {addedTimeExpired && isLive && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="mt-2 flex flex-col items-center gap-2"
                                >
                                    <span className="text-xs text-red-400 animate-pulse font-semibold">
                                        ⏱️ Added time complete!
                                    </span>
                                    <button
                                        onClick={fixture.period === 'first' ? setHalfTime : setFullTime}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-full transition-all animate-pulse"
                                    >
                                        End {fixture.period === 'first' ? '1st Half' : 'Match'}
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* Away Team */}
                        <div className="flex-1 text-center">
                            {awayTeam?.flag_url ? (
                                <img
                                    src={awayTeam.flag_url}
                                    alt=""
                                    className="w-16 h-16 object-contain mx-auto mb-2"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <span className="text-lg font-bold text-gray-400">
                                        {awayTeam?.fifa_code || 'A'}
                                    </span>
                                </div>
                            )}
                            <h3 className="text-white font-bold text-sm truncate">
                                {awayTeam?.name || 'Away'}
                            </h3>

                        </div>
                    </div>

                    {/* Match Events Row */}
                    <div className="mt-6 pt-4 border-t border-gray-800/50 grid grid-cols-2 gap-8">
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
                                    <div key={player} className="text-sm text-gray-300">
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
                                    <div key={player} className="text-sm text-gray-300">
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
                    <div className="text-center text-xs text-gray-500">
                        📍 {fixture.venue}
                    </div>
                </motion.div>
            </div>

            {/* Clock Controls */}
            <div className="px-4 mb-6">
                <div className="bg-[#12121a] rounded-2xl p-4 border border-gray-800">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Clock Control</h3>

                    {/* Main Clock Button */}
                    <div className="flex justify-center mb-4">
                        <button
                            onClick={toggleClock}
                            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all ${isRunning
                                ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30'
                                : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/30'
                                }`}
                        >
                            {isRunning ? (
                                <>
                                    <Pause className="w-8 h-8 text-white" />
                                    <span className="text-white text-xs mt-1">PAUSE</span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-8 h-8 text-white" />
                                    <span className="text-white text-xs mt-1">START</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Period Controls */}
                    <div className="grid grid-cols-4 gap-2">
                        <button
                            onClick={resetClock}
                            className="py-3 rounded-xl text-sm font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 flex flex-col items-center gap-1"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span className="text-xs">Reset</span>
                        </button>
                        <button
                            onClick={setHalfTime}
                            className={`py-3 rounded-xl text-sm font-medium flex flex-col items-center gap-1 ${isHT ? 'bg-yellow-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            <Pause className="w-4 h-4" />
                            <span className="text-xs">Half Time</span>
                        </button>
                        <button
                            onClick={startSecondHalf}
                            className="py-3 rounded-xl text-sm font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 flex flex-col items-center gap-1"
                        >
                            <Play className="w-4 h-4" />
                            <span className="text-xs">2nd Half</span>
                        </button>
                        <button
                            onClick={setFullTime}
                            className={`py-3 rounded-xl text-sm font-medium flex flex-col items-center gap-1 ${isFT ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            <Square className="w-4 h-4" />
                            <span className="text-xs">Full Time</span>
                        </button>
                    </div>

                    {/* Added Time */}
                    <div className="mt-4 pt-4 border-t border-gray-800">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Added Time</span>
                            <div className="flex items-center gap-1">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setAddedTime(t)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${(fixture?.addedTime || 0) === t
                                            ? 'bg-yellow-600 text-black'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            }`}
                                    >
                                        +{t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Score Controls */}
            <div className="px-4 mb-6">
                <div className="bg-[#12121a] rounded-2xl p-4 border border-gray-800">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Score Controls</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Home Score */}
                        <div className="bg-gray-800/50 rounded-xl p-4">
                            <span className="text-xs text-gray-500 block mb-2 text-center">
                                {homeTeam?.name?.substring(0, 12) || 'Home'}
                            </span>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => handleScoreChange('home', -1)}
                                    className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-600/40 transition-all"
                                >
                                    <Minus className="w-6 h-6" />
                                </button>
                                <span className="text-4xl font-black text-white w-14 text-center">
                                    {fixture.homeScore}
                                </span>
                                <button
                                    onClick={() => handleScoreChange('home', 1)}
                                    className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center text-green-400 hover:bg-green-600/40 transition-all"
                                >
                                    <Plus className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Away Score */}
                        <div className="bg-gray-800/50 rounded-xl p-4">
                            <span className="text-xs text-gray-500 block mb-2 text-center">
                                {awayTeam?.name?.substring(0, 12) || 'Away'}
                            </span>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => handleScoreChange('away', -1)}
                                    className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-600/40 transition-all"
                                >
                                    <Minus className="w-6 h-6" />
                                </button>
                                <span className="text-4xl font-black text-white w-14 text-center">
                                    {fixture.awayScore}
                                </span>
                                <button
                                    onClick={() => handleScoreChange('away', 1)}
                                    className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center text-green-400 hover:bg-green-600/40 transition-all"
                                >
                                    <Plus className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Events */}
            <div className="px-4 mb-6">
                <div className="bg-[#12121a] rounded-2xl p-4 border border-gray-800">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Quick Events</h3>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        {[
                            { type: 'goal', icon: '⚽', label: 'Goal' },
                            { type: 'yellow', icon: '🟨', label: 'Yellow' },
                            { type: 'red', icon: '🟥', label: 'Red' },
                            { type: 'sub', icon: '🔄', label: 'Sub' },
                        ].map((event) => (
                            <button
                                key={event.type}
                                onClick={() => {
                                    setEventType(event.type as EventType);
                                    setShowEventModal(true);
                                }}
                                className="py-3 bg-gray-800 rounded-xl text-center hover:bg-gray-700 transition-all"
                            >
                                <span className="text-2xl block mb-1">{event.icon}</span>
                                <span className="text-xs text-gray-400">{event.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { type: 'var', icon: '📺', label: 'VAR' },
                            { type: 'penalty_scored', icon: '⚽(P)', label: 'Pen ✓' },
                            { type: 'penalty_missed', icon: '❌', label: 'Pen ✗' },
                            { type: 'injury', icon: '🏥', label: 'Injury' },
                        ].map((event) => (
                            <button
                                key={event.type}
                                onClick={() => {
                                    setEventType(event.type as EventType);
                                    setShowEventModal(true);
                                }}
                                className="py-3 bg-gray-800 rounded-xl text-center hover:bg-gray-700 transition-all"
                            >
                                <span className="text-xl block mb-1">{event.icon}</span>
                                <span className="text-xs text-gray-400">{event.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Team Rosters */}
            <div className="px-4 mb-6">
                <div className="bg-[#12121a] rounded-2xl p-4 border border-gray-800">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Team Rosters</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Home Team Roster */}
                        <div>
                            <div className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2">
                                {homeTeam?.flag_url && <img src={homeTeam.flag_url} className="w-4 h-4 object-contain" />}
                                {homeTeam?.name}
                            </div>
                            <div className="bg-gray-800/30 rounded-xl p-2 max-h-48 overflow-y-auto">
                                {homeTeam?.players && homeTeam.players.length > 0 ? (
                                    <ul className="space-y-1">
                                        {homeTeam.players.map((player, idx) => (
                                            <li key={idx} className="text-xs text-gray-300 py-1 px-2 hover:bg-white/5 rounded flex items-center gap-2">
                                                <span className="text-gray-600 w-4">{idx + 1}</span>
                                                {player}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-gray-500 italic p-2">No players added</p>
                                )}
                            </div>
                        </div>

                        {/* Away Team Roster */}
                        <div>
                            <div className="text-xs font-bold text-red-400 mb-2 flex items-center gap-2">
                                {awayTeam?.flag_url && <img src={awayTeam.flag_url} className="w-4 h-4 object-contain" />}
                                {awayTeam?.name}
                            </div>
                            <div className="bg-gray-800/30 rounded-xl p-2 max-h-48 overflow-y-auto">
                                {awayTeam?.players && awayTeam.players.length > 0 ? (
                                    <ul className="space-y-1">
                                        {awayTeam.players.map((player, idx) => (
                                            <li key={idx} className="text-xs text-gray-300 py-1 px-2 hover:bg-white/5 rounded flex items-center gap-2">
                                                <span className="text-gray-600 w-4">{idx + 1}</span>
                                                {player}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-gray-500 italic p-2">No players added</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Match Events Timeline */}
            <div className="px-4 pb-20">
                <div className="bg-[#12121a] rounded-2xl p-4 border border-gray-800">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Match Events</h3>
                    {events.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No events yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {events.map((event) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex items-center gap-3 p-3 rounded-xl ${event.team === 'home'
                                        ? 'bg-blue-900/20 border-l-4 border-blue-500'
                                        : 'bg-red-900/20 border-r-4 border-red-500 flex-row-reverse'
                                        }`}
                                >
                                    <span className="text-2xl">{getEventIcon(event.type)}</span>
                                    <div className={event.team === 'away' ? 'text-right' : ''}>
                                        <span className="text-white font-medium text-sm">
                                            {event.minute}' {event.playerName}
                                        </span>
                                        <span className="text-xs text-gray-500 block capitalize">
                                            {event.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Event Modal */}
            <AnimatePresence>
                {showEventModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center"
                        onClick={() => setShowEventModal(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#12121a] rounded-t-3xl w-full max-w-lg p-6 border-t border-gray-700"
                        >
                            <h3 className="text-lg font-bold text-white mb-4">
                                Add {eventType.replace('_', ' ')} Event
                            </h3>

                            {/* Team Selection */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <button
                                    onClick={() => setEventTeam('home')}
                                    className={`py-4 rounded-xl font-medium transition-all ${eventTeam === 'home'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-800 text-gray-400'
                                        }`}
                                >
                                    {homeTeam?.name?.substring(0, 12) || 'Home'}
                                </button>
                                <button
                                    onClick={() => setEventTeam('away')}
                                    className={`py-4 rounded-xl font-medium transition-all ${eventTeam === 'away'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-800 text-gray-400'
                                        }`}
                                >
                                    {awayTeam?.name?.substring(0, 12) || 'Away'}
                                </button>
                            </div>

                            {/* Player Selection */}
                            <div className="mb-4">
                                <label className="text-xs text-gray-400 mb-2 block">Select Player</label>
                                {(() => {
                                    const selectedTeam = eventTeam === 'home' ? homeTeam : awayTeam;
                                    const players = selectedTeam?.players || [];

                                    if (players.length === 0) {
                                        return (
                                            <input
                                                type="text"
                                                placeholder="Enter player name"
                                                value={eventPlayerName}
                                                onChange={(e) => setEventPlayerName(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-800 rounded-xl border-0 outline-none text-white placeholder-gray-500"
                                            />
                                        );
                                    }

                                    return (
                                        <select
                                            value={eventPlayerName}
                                            onChange={(e) => setEventPlayerName(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-800 rounded-xl border-0 outline-none text-white"
                                        >
                                            <option value="">-- Select Player --</option>
                                            {players.map((player, index) => (
                                                <option key={index} value={player}>
                                                    {index + 1}. {player}
                                                </option>
                                            ))}
                                        </select>
                                    );
                                })()}
                            </div>

                            {/* Substitution: Player Coming In */}
                            {eventType === 'sub' && (
                                <div className="mb-4">
                                    <label className="text-xs text-gray-400 mb-2 block">Player Coming In</label>
                                    {(() => {
                                        const selectedTeam = eventTeam === 'home' ? homeTeam : awayTeam;
                                        const players = selectedTeam?.players || [];

                                        if (players.length === 0) {
                                            return (
                                                <input
                                                    type="text"
                                                    placeholder="Enter substitute name"
                                                    value={eventSubPlayerName}
                                                    onChange={(e) => setEventSubPlayerName(e.target.value)}
                                                    className="w-full px-4 py-3 bg-gray-800 rounded-xl border-0 outline-none text-white placeholder-gray-500"
                                                />
                                            );
                                        }

                                        return (
                                            <select
                                                value={eventSubPlayerName}
                                                onChange={(e) => setEventSubPlayerName(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-800 rounded-xl border-0 outline-none text-white"
                                            >
                                                <option value="">-- Select Substitute --</option>
                                                {players.filter(p => p !== eventPlayerName).map((player, index) => (
                                                    <option key={index} value={player}>
                                                        {player}
                                                    </option>
                                                ))}
                                            </select>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Confirm Button */}
                            <button
                                onClick={handleAddEvent}
                                disabled={!eventPlayerName && eventType !== 'var'}
                                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add Event at {minutes}&apos;
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
