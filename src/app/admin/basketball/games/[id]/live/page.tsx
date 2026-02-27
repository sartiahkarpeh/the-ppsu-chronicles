'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/config';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { BasketballGame, BasketballTeam } from '@/types/basketball';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// ─── HELPERS ────────────────────────────────────────────────────────────
function parseClockToSeconds(clock: string): number {
    const [m, s] = clock.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
}

function formatSecondsToMMSS(totalSeconds: number): string {
    const m = Math.floor(Math.max(0, totalSeconds) / 60);
    const s = Math.max(0, totalSeconds) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function defaultClockForPeriod(period: number): number {
    return period <= 4 ? 12 * 60 : 5 * 60; // 12:00 regulation, 5:00 OT
}

function periodLabel(p: number): string {
    if (p <= 4) return `Q${p}`;
    if (p === 5) return 'OT';
    return `${p - 4}OT`;
}

function vibrate() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
    }
}

// ─── LOG ENTRY TYPE ─────────────────────────────────────────────────────
interface LogEntry {
    time: string;
    period: string;
    message: string;
}

// ─── COMPONENT ──────────────────────────────────────────────────────────
export default function LiveGameController() {
    const { id } = useParams() as { id: string };
    const router = useRouter();

    // ── State ──
    const [game, setGame] = useState<BasketballGame | null>(null);
    const [homeTeam, setHomeTeam] = useState<BasketballTeam | null>(null);
    const [awayTeam, setAwayTeam] = useState<BasketballTeam | null>(null);
    const [loading, setLoading] = useState(true);

    // Local optimistic state
    const [homeScore, setHomeScore] = useState(0);
    const [awayScore, setAwayScore] = useState(0);
    const [period, setPeriod] = useState(0);
    const [clockSeconds, setClockSeconds] = useState(720);
    const [status, setStatus] = useState<string>('scheduled');
    const [clockRunning, setClockRunning] = useState(false);

    // Sync indicator
    const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
    const [externalChange, setExternalChange] = useState(false);

    // Undo confirm
    const [confirmUndo, setConfirmUndo] = useState<'home' | 'away' | null>(null);

    // Game log
    const [gameLog, setGameLog] = useState<LogEntry[]>([]);
    const [logOpen, setLogOpen] = useState(false);

    // End game modal
    const [showEndGameModal, setShowEndGameModal] = useState(false);

    // Manual clock edit
    const [manualClockStr, setManualClockStr] = useState('');
    const [showManualClock, setShowManualClock] = useState(false);

    // Ref to last known DB rev to detect external changes
    const lastKnownUpdate = useRef<any>(null);
    const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const clockSyncRef = useRef<NodeJS.Timeout | null>(null);

    // ── Subscribe to game doc ──
    useEffect(() => {
        if (!id) return;
        const unsub = onSnapshot(doc(db, 'basketball_games', id), (snap) => {
            if (!snap.exists()) {
                router.push('/admin/basketball/games');
                return;
            }
            const data = { id: snap.id, ...snap.data() } as BasketballGame;

            // Redirect away if game is final
            if (data.status === 'ft') {
                router.push('/admin/basketball/games');
                return;
            }

            // Detect external changes
            if (lastKnownUpdate.current && data.updatedAt && data.updatedAt !== lastKnownUpdate.current) {
                setExternalChange(true);
            }
            lastKnownUpdate.current = data.updatedAt;

            setGame(data);

            // Only set local state from DB on first load
            if (loading) {
                setHomeScore(data.homeScore);
                setAwayScore(data.awayScore);
                setPeriod(data.period);
                setClockSeconds(parseClockToSeconds(data.clock));
                setStatus(data.status);
            }

            setLoading(false);
        });
        return () => unsub();
    }, [id, loading, router]);

    // ── Subscribe to teams ──
    useEffect(() => {
        if (!game) return;
        const unsubHome = onSnapshot(doc(db, 'basketball_teams', game.homeTeamId), (s) => {
            if (s.exists()) setHomeTeam({ id: s.id, ...s.data() } as BasketballTeam);
        });
        const unsubAway = onSnapshot(doc(db, 'basketball_teams', game.awayTeamId), (s) => {
            if (s.exists()) setAwayTeam({ id: s.id, ...s.data() } as BasketballTeam);
        });
        return () => { unsubHome(); unsubAway(); };
    }, [game?.homeTeamId, game?.awayTeamId]);

    // ── Clock ticker ──
    useEffect(() => {
        if (clockRunning && clockSeconds > 0) {
            clockIntervalRef.current = setInterval(() => {
                setClockSeconds(prev => {
                    if (prev <= 1) {
                        setClockRunning(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
        };
    }, [clockRunning, clockSeconds]);

    // ── Clock DB sync every 5s ──
    useEffect(() => {
        if (clockRunning) {
            clockSyncRef.current = setInterval(() => {
                syncClockToDB();
            }, 5000);
        }
        return () => {
            if (clockSyncRef.current) clearInterval(clockSyncRef.current);
        };
    }, [clockRunning]);

    // ── Helper: write to DB ──
    const writeToDb = useCallback(async (data: Record<string, any>) => {
        if (!id) return;
        setSyncStatus('syncing');
        try {
            await updateDoc(doc(db, 'basketball_games', id), {
                ...data,
                updatedAt: serverTimestamp(),
            });
            setSyncStatus('synced');
        } catch (err) {
            console.error('Sync error:', err);
            setSyncStatus('error');
            toast.error('Sync failed — tap indicator to retry');
        }
    }, [id]);

    const syncClockToDB = useCallback(() => {
        writeToDb({ clock: formatSecondsToMMSS(clockSeconds) });
    }, [clockSeconds, writeToDb]);

    const addLog = useCallback((message: string) => {
        setGameLog(prev => [{
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            period: periodLabel(period),
            message,
        }, ...prev]);
    }, [period]);

    // ── Score handlers ──
    const adjustScore = (team: 'home' | 'away', points: number) => {
        vibrate();
        if (team === 'home') {
            const newScore = Math.max(0, homeScore + points);
            setHomeScore(newScore);
            writeToDb({ homeScore: newScore });
            addLog(`${homeTeam?.abbreviation || 'HOME'} ${points > 0 ? '+' : ''}${points} → Score ${awayScore}–${newScore}`);
        } else {
            const newScore = Math.max(0, awayScore + points);
            setAwayScore(newScore);
            writeToDb({ awayScore: newScore });
            addLog(`${awayTeam?.abbreviation || 'AWAY'} ${points > 0 ? '+' : ''}${points} → Score ${newScore}–${homeScore}`);
        }
        setConfirmUndo(null);
    };

    // ── Period handlers ──
    const changePeriod = (newPeriod: number) => {
        vibrate();
        setPeriod(newPeriod);
        const defaultClock = defaultClockForPeriod(newPeriod);
        setClockSeconds(defaultClock);
        setClockRunning(false);
        writeToDb({ period: newPeriod, clock: formatSecondsToMMSS(defaultClock), status: 'live' });
        setStatus('live');
        addLog(`Period changed to ${periodLabel(newPeriod)} — Clock reset to ${formatSecondsToMMSS(defaultClock)}`);
    };

    // ── Status handlers ──
    const startGame = () => {
        vibrate();
        const newPeriod = 1;
        const defaultClock = defaultClockForPeriod(newPeriod);
        setPeriod(newPeriod);
        setClockSeconds(defaultClock);
        setStatus('live');
        setClockRunning(true);
        writeToDb({ status: 'live', period: newPeriod, clock: formatSecondsToMMSS(defaultClock) });
        addLog('🏀 Game Started — Q1');
    };

    const halftime = () => {
        vibrate();
        setClockRunning(false);
        setStatus('ht');
        writeToDb({ status: 'ht', clock: formatSecondsToMMSS(clockSeconds) });
        addLog('⏸ Halftime');
    };

    const endGame = () => {
        vibrate();
        setClockRunning(false);
        setStatus('ft');
        writeToDb({ status: 'ft', clock: '00:00' });
        addLog('🏁 Game Over — Final');
        setShowEndGameModal(false);
        setTimeout(() => router.push('/admin/basketball/games'), 1500);
    };

    // ── Clock controls ──
    const toggleClock = () => {
        vibrate();
        if (clockRunning) {
            setClockRunning(false);
            syncClockToDB(); // sync immediately on pause
            addLog(`⏸ Clock paused at ${formatSecondsToMMSS(clockSeconds)}`);
        } else {
            setClockRunning(true);
            addLog(`▶ Clock started at ${formatSecondsToMMSS(clockSeconds)}`);
        }
    };

    const resetClock = () => {
        vibrate();
        const def = defaultClockForPeriod(period);
        setClockSeconds(def);
        setClockRunning(false);
        writeToDb({ clock: formatSecondsToMMSS(def) });
        addLog(`🔄 Clock reset to ${formatSecondsToMMSS(def)}`);
    };

    const applyManualClock = () => {
        const secs = parseClockToSeconds(manualClockStr);
        setClockSeconds(secs);
        writeToDb({ clock: formatSecondsToMMSS(secs) });
        setShowManualClock(false);
        addLog(`✏️ Clock manually set to ${formatSecondsToMMSS(secs)}`);
    };

    // ── Loading / redirect ──
    if (loading) {
        return (
            <div className="fixed inset-0 bg-neutral-950 flex items-center justify-center z-[100]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-neutral-400 font-mono text-sm">Loading Controller...</span>
                </div>
            </div>
        );
    }

    if (!game) return null;

    const isLive = status === 'live';
    const isHalftime = status === 'ht';
    const isScheduled = status === 'scheduled';
    const controlsDisabled = status === 'ft';

    return (
        <div className="fixed inset-0 bg-neutral-950 text-white z-[100] flex flex-col overflow-y-auto font-sans select-none">
            <Toaster position="top-center" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333' } }} />

            {/* ── TOP BAR ── */}
            <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-neutral-800 shrink-0">
                <button onClick={() => router.push('/admin/basketball/games')} className="p-2 rounded-lg hover:bg-neutral-800 transition-colors active:scale-95">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="text-center flex-1">
                    <div className="text-xs font-mono uppercase tracking-widest text-neutral-500">Live Controller</div>
                    <div className="font-display font-bold text-sm md:text-base">
                        <span style={{ color: awayTeam?.primaryColor || '#fff' }}>{awayTeam?.abbreviation || 'AWAY'}</span>
                        <span className="text-neutral-600 mx-2">@</span>
                        <span style={{ color: homeTeam?.primaryColor || '#fff' }}>{homeTeam?.abbreviation || 'HOME'}</span>
                    </div>
                </div>
                {/* Sync Indicator */}
                <button
                    onClick={() => { if (syncStatus === 'error') writeToDb({ homeScore, awayScore, period, clock: formatSecondsToMMSS(clockSeconds), status }); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest border border-neutral-800"
                >
                    <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-green-500 animate-pulse' : syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
                    {syncStatus === 'synced' ? 'LIVE' : syncStatus === 'syncing' ? 'SYNCING' : 'ERROR'}
                </button>
            </div>

            {/* External change warning */}
            {externalChange && (
                <div className="bg-yellow-500/20 border-b border-yellow-500/30 text-yellow-400 text-center py-2 text-xs font-mono">
                    ⚠️ External change detected — another admin may be editing this game
                    <button onClick={() => setExternalChange(false)} className="ml-3 underline">Dismiss</button>
                </div>
            )}

            {/* ── SECTION 1: LIVE SCOREBOARD DISPLAY ── */}
            <div className="bg-black py-6 md:py-8 border-b border-neutral-800 shrink-0">
                <div className="max-w-2xl mx-auto px-4">
                    <div className="flex items-center justify-between">
                        {/* Away */}
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center p-2 overflow-hidden">
                                {awayTeam?.logo ? <img src={awayTeam.logo} alt="" className="w-full h-full object-contain" /> : <span className="font-bold text-lg text-neutral-600">{awayTeam?.abbreviation}</span>}
                            </div>
                            <span className="font-display font-bold text-xs md:text-sm uppercase tracking-wider text-neutral-400">{awayTeam?.city || 'Away'}</span>
                            <span className="font-mono font-black text-5xl md:text-7xl tabular-nums leading-none" style={{ color: awayTeam?.primaryColor || '#fff' }}>{awayScore}</span>
                        </div>

                        {/* Center: Period + Clock */}
                        <div className="flex flex-col items-center gap-1 px-4 flex-shrink-0">
                            <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${isLive ? 'bg-red-500/20 text-red-400 animate-pulse' : isHalftime ? 'bg-orange-500/20 text-orange-400' : 'bg-neutral-800 text-neutral-500'}`}>
                                {isLive ? periodLabel(period) : isHalftime ? 'HALF' : isScheduled ? 'PRE' : status.toUpperCase()}
                            </span>
                            <span className="font-mono font-black text-3xl md:text-5xl tabular-nums tracking-tight text-white mt-1">{formatSecondsToMMSS(clockSeconds)}</span>
                        </div>

                        {/* Home */}
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center p-2 overflow-hidden">
                                {homeTeam?.logo ? <img src={homeTeam.logo} alt="" className="w-full h-full object-contain" /> : <span className="font-bold text-lg text-neutral-600">{homeTeam?.abbreviation}</span>}
                            </div>
                            <span className="font-display font-bold text-xs md:text-sm uppercase tracking-wider text-neutral-400">{homeTeam?.city || 'Home'}</span>
                            <span className="font-mono font-black text-5xl md:text-7xl tabular-nums leading-none" style={{ color: homeTeam?.primaryColor || '#fff' }}>{homeScore}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SECTION 2: CLOCK CONTROL ── */}
            <div className="bg-neutral-900/50 border-b border-neutral-800 py-4 shrink-0">
                <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-3 w-full justify-center">
                        <button
                            disabled={controlsDisabled || isScheduled}
                            onClick={toggleClock}
                            className={`px-8 py-3 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all active:scale-95 min-w-[120px] min-h-[48px] ${clockRunning ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'} disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                            {clockRunning ? '⏸ Pause' : '▶ Start'}
                        </button>
                        <button
                            disabled={controlsDisabled}
                            onClick={resetClock}
                            className="px-6 py-3 rounded-2xl bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold text-sm uppercase tracking-wider hover:bg-neutral-700 transition-all active:scale-95 min-h-[48px] disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Reset
                        </button>
                        <button
                            disabled={controlsDisabled}
                            onClick={() => { setManualClockStr(formatSecondsToMMSS(clockSeconds)); setShowManualClock(!showManualClock); }}
                            className="px-6 py-3 rounded-2xl bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold text-sm uppercase tracking-wider hover:bg-neutral-700 transition-all active:scale-95 min-h-[48px] disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Edit
                        </button>
                    </div>
                    {showManualClock && (
                        <div className="flex items-center gap-2 bg-neutral-800 p-3 rounded-xl border border-neutral-700 w-full max-w-xs">
                            <input
                                type="text"
                                placeholder="MM:SS"
                                value={manualClockStr}
                                onChange={e => setManualClockStr(e.target.value)}
                                className="flex-1 bg-black text-white text-center font-mono text-xl py-2 rounded-lg border border-neutral-700 outline-none focus:border-orange-500"
                            />
                            <button onClick={applyManualClock} className="px-4 py-2 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 active:scale-95 min-h-[48px]">Set</button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── SECTION 3: SCORE CONTROLS ── */}
            <div className="flex-1 shrink-0">
                <div className="max-w-3xl mx-auto px-4 py-6 grid grid-cols-2 gap-4 md:gap-8">
                    {/* Away Team Controls */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 md:p-6 flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center">
                                {awayTeam?.logo ? <img src={awayTeam.logo} alt="" className="w-full h-full object-contain" /> : <span className="text-xs font-bold text-neutral-500">{awayTeam?.abbreviation}</span>}
                            </div>
                            <span className="font-display font-bold text-sm md:text-base uppercase">{awayTeam?.name || 'Away'}</span>
                        </div>
                        <span className="font-mono font-black text-5xl md:text-6xl tabular-nums" style={{ color: awayTeam?.primaryColor || '#fff' }}>{awayScore}</span>
                        <div className="grid grid-cols-3 gap-2 w-full">
                            <button disabled={controlsDisabled} onClick={() => adjustScore('away', 1)} className="py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xl transition-all active:scale-90 disabled:opacity-30 min-h-[56px]">+1</button>
                            <button disabled={controlsDisabled} onClick={() => adjustScore('away', 2)} className="py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-xl transition-all active:scale-90 disabled:opacity-30 min-h-[56px]">+2</button>
                            <button disabled={controlsDisabled} onClick={() => adjustScore('away', 3)} className="py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xl transition-all active:scale-90 disabled:opacity-30 min-h-[56px]">+3</button>
                        </div>
                        {/* Undo */}
                        {confirmUndo === 'away' ? (
                            <button disabled={controlsDisabled} onClick={() => adjustScore('away', -1)} className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase transition-all active:scale-95 min-h-[48px]">
                                Confirm −1
                            </button>
                        ) : (
                            <button disabled={controlsDisabled} onClick={() => setConfirmUndo('away')} className="w-full py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-400 font-bold text-sm uppercase hover:bg-neutral-700 transition-all active:scale-95 min-h-[48px] disabled:opacity-30">
                                −1 Correction
                            </button>
                        )}
                    </div>

                    {/* Home Team Controls */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 md:p-6 flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center">
                                {homeTeam?.logo ? <img src={homeTeam.logo} alt="" className="w-full h-full object-contain" /> : <span className="text-xs font-bold text-neutral-500">{homeTeam?.abbreviation}</span>}
                            </div>
                            <span className="font-display font-bold text-sm md:text-base uppercase">{homeTeam?.name || 'Home'}</span>
                        </div>
                        <span className="font-mono font-black text-5xl md:text-6xl tabular-nums" style={{ color: homeTeam?.primaryColor || '#fff' }}>{homeScore}</span>
                        <div className="grid grid-cols-3 gap-2 w-full">
                            <button disabled={controlsDisabled} onClick={() => adjustScore('home', 1)} className="py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xl transition-all active:scale-90 disabled:opacity-30 min-h-[56px]">+1</button>
                            <button disabled={controlsDisabled} onClick={() => adjustScore('home', 2)} className="py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-xl transition-all active:scale-90 disabled:opacity-30 min-h-[56px]">+2</button>
                            <button disabled={controlsDisabled} onClick={() => adjustScore('home', 3)} className="py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xl transition-all active:scale-90 disabled:opacity-30 min-h-[56px]">+3</button>
                        </div>
                        {/* Undo */}
                        {confirmUndo === 'home' ? (
                            <button disabled={controlsDisabled} onClick={() => adjustScore('home', -1)} className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase transition-all active:scale-95 min-h-[48px]">
                                Confirm −1
                            </button>
                        ) : (
                            <button disabled={controlsDisabled} onClick={() => setConfirmUndo('home')} className="w-full py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-400 font-bold text-sm uppercase hover:bg-neutral-700 transition-all active:scale-95 min-h-[48px] disabled:opacity-30">
                                −1 Correction
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── SECTION 4: PERIOD / QUARTER CONTROL ── */}
            <div className="bg-neutral-900/50 border-t border-neutral-800 py-4 shrink-0">
                <div className="max-w-2xl mx-auto px-4">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 text-center mb-3">Period Control</div>
                    <div className="flex items-center gap-2 justify-center flex-wrap">
                        {[1, 2, 3, 4, 5].map(p => (
                            <button
                                key={p}
                                disabled={controlsDisabled}
                                onClick={() => changePeriod(p)}
                                className={`px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all active:scale-95 min-h-[48px] min-w-[56px] ${period === p ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30' : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700'} disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                                {periodLabel(p)}
                            </button>
                        ))}
                        <button
                            disabled={controlsDisabled}
                            onClick={halftime}
                            className={`px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all active:scale-95 min-h-[48px] ${isHalftime ? 'bg-yellow-600 text-white shadow-lg' : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700'} disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                            Half
                        </button>
                    </div>
                </div>
            </div>

            {/* ── SECTION 5: GAME STATUS CONTROL ── */}
            <div className="bg-black border-t border-neutral-800 py-5 shrink-0">
                <div className="max-w-2xl mx-auto px-4 flex items-center justify-center gap-3 flex-wrap">
                    {isScheduled && (
                        <button
                            onClick={startGame}
                            className="px-8 py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-base uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-green-500/30 min-h-[56px]"
                        >
                            🏀 Start Game
                        </button>
                    )}
                    {(isLive || isHalftime) && (
                        <>
                            <button
                                onClick={halftime}
                                className="px-6 py-4 rounded-2xl bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-sm uppercase tracking-wider transition-all active:scale-95 min-h-[56px]"
                            >
                                ⏸ Halftime
                            </button>
                            <button
                                onClick={() => setShowEndGameModal(true)}
                                className="px-6 py-4 rounded-2xl bg-red-700 hover:bg-red-800 text-white font-bold text-sm uppercase tracking-wider transition-all active:scale-95 min-h-[56px]"
                            >
                                🏁 End Game
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── SECTION 6: GAME LOG (Collapsible) ── */}
            <div className="bg-black border-t border-neutral-800 shrink-0">
                <button
                    onClick={() => setLogOpen(!logOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 text-neutral-400 hover:text-white transition-colors"
                >
                    <span className="text-xs font-mono uppercase tracking-widest">Game Log ({gameLog.length})</span>
                    {logOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
                {logOpen && (
                    <div className="max-h-60 overflow-y-auto px-4 pb-4 space-y-1">
                        {gameLog.length === 0 ? (
                            <div className="text-neutral-600 text-xs font-mono text-center py-4">No actions recorded yet.</div>
                        ) : (
                            gameLog.map((entry, i) => (
                                <div key={i} className="flex items-start gap-3 text-xs font-mono py-1.5 border-b border-neutral-900">
                                    <span className="text-neutral-600 shrink-0 w-16">{entry.time}</span>
                                    <span className="text-orange-500 shrink-0 w-8">{entry.period}</span>
                                    <span className="text-neutral-300">{entry.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* ── END GAME MODAL ── */}
            {showEndGameModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-sm w-full text-center">
                        <div className="text-4xl mb-4">🏁</div>
                        <h3 className="text-2xl font-display font-black uppercase mb-2">End Game?</h3>
                        <p className="text-neutral-400 text-sm mb-6">This will mark the game as <strong className="text-white">FINAL</strong> and disable all controls. This action cannot be undone.</p>
                        <div className="font-mono text-3xl font-black mb-6">
                            <span style={{ color: awayTeam?.primaryColor }}>{awayScore}</span>
                            <span className="text-neutral-600 mx-3">–</span>
                            <span style={{ color: homeTeam?.primaryColor }}>{homeScore}</span>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowEndGameModal(false)} className="flex-1 py-4 rounded-2xl bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold text-sm uppercase hover:bg-neutral-700 transition-all active:scale-95 min-h-[56px]">
                                Cancel
                            </button>
                            <button onClick={endGame} className="flex-1 py-4 rounded-2xl bg-red-700 hover:bg-red-800 text-white font-black text-sm uppercase transition-all active:scale-95 min-h-[56px]">
                                End Game
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
