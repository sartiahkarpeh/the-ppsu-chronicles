'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';
import type { BasketballGame, BasketballTeam, BasketballPlayer } from '@/types/basketball';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import LazyImage from '@/components/basketball/LazyImage';

function parseClockToSeconds(clock: string): number {
    const [m, s] = clock.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
}

function formatSecondsToMMSS(totalSeconds: number): string {
    const m = Math.floor(Math.max(0, totalSeconds) / 60);
    const s = Math.max(0, totalSeconds) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function GameDetailPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();

    const [game, setGame] = useState<BasketballGame | null>(null);
    const [homeTeam, setHomeTeam] = useState<BasketballTeam | null>(null);
    const [awayTeam, setAwayTeam] = useState<BasketballTeam | null>(null);
    const [players, setPlayers] = useState<BasketballPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    // Live clock state
    const [liveClockSeconds, setLiveClockSeconds] = useState<number | null>(null);
    const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!id) return;

        // Subscribe to game doc for live updates
        const unsubscribeGame = onSnapshot(doc(db, 'basketball_games', id), async (docSnap) => {
            if (docSnap.exists()) {
                const gameData = { id: docSnap.id, ...docSnap.data() } as BasketballGame;
                setGame(gameData);

                // Fetch teams if we haven't
                if (!homeTeam || !awayTeam) {
                    const [hSnap, aSnap] = await Promise.all([
                        getDoc(doc(db, 'basketball_teams', gameData.homeTeamId)),
                        getDoc(doc(db, 'basketball_teams', gameData.awayTeamId))
                    ]);

                    if (hSnap.exists()) setHomeTeam({ id: hSnap.id, ...hSnap.data() } as BasketballTeam);
                    if (aSnap.exists()) setAwayTeam({ id: aSnap.id, ...aSnap.data() } as BasketballTeam);

                    // Fetch all players for both teams
                    const qPlayers = query(
                        collection(db, 'basketball_players'),
                        where('teamId', 'in', [gameData.homeTeamId, gameData.awayTeamId])
                    );
                    const pSnap = await getDocs(qPlayers);
                    const pList = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as BasketballPlayer));
                    setPlayers(pList);
                }
            }
            setLoading(false);
        });

        return () => unsubscribeGame();
    }, [id, homeTeam, awayTeam]);

    // Auto-decrementing clock for live games
    // Only ticks when game.clockRunning is true (set by admin)
    const lastSyncedClock = useRef<string | null>(null);

    useEffect(() => {
        // Clear any existing interval first
        if (clockIntervalRef.current) {
            clearInterval(clockIntervalRef.current);
            clockIntervalRef.current = null;
        }

        const gameClock = game?.clock || '12:00';
        const isClockRunning = game?.clockRunning === true;

        // Sync the clock from Firestore when it changes
        if (gameClock !== lastSyncedClock.current) {
            lastSyncedClock.current = gameClock;
            setLiveClockSeconds(parseClockToSeconds(gameClock));
        }

        // Only start ticking if admin has the clock running
        if (isClockRunning) {
            clockIntervalRef.current = setInterval(() => {
                setLiveClockSeconds(prev => {
                    if (prev === null || prev <= 0) return 0;
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (clockIntervalRef.current) {
                clearInterval(clockIntervalRef.current);
                clockIntervalRef.current = null;
            }
        };
    }, [game?.status, game?.clock, game?.clockRunning]);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center pt-24 space-y-8 animate-pulse px-4">
                <div className="w-full max-w-4xl h-64 bg-neutral-900 rounded-3xl border border-neutral-800"></div>
                <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="h-96 bg-neutral-900 rounded-3xl border border-neutral-800"></div>
                    <div className="h-96 bg-neutral-900 rounded-3xl border border-neutral-800"></div>
                </div>
            </div>
        );
    }

    if (!game || !homeTeam || !awayTeam) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
                <h1 className="text-3xl font-display font-bold">Game Not Found</h1>
                <button onClick={() => router.back()} className="mt-4 text-orange-500 hover:text-orange-400 font-medium">
                    ← Go Back
                </button>
            </div>
        );
    }

    const isLive = game.status === 'live' || game.status === 'ht';
    const isFinal = game.status === 'ft';
    const gameDate = game.date instanceof Timestamp ? game.date.toDate() : new Date(game.date.toString());

    // Group players
    const homePlayers = players.filter(p => p.teamId === homeTeam.id).sort((a, b) => (a.number || 0) - (b.number || 0));
    const awayPlayers = players.filter(p => p.teamId === awayTeam.id).sort((a, b) => (a.number || 0) - (b.number || 0));

    return (
        <div className="min-h-screen bg-neutral-950">
            {/* Header/Scoreboard */}
            <div className="bg-black border-b border-neutral-800 pb-12 pt-8">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <button onClick={() => router.back()} className="mb-8 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-semibold tracking-wider uppercase">Back</span>
                    </button>

                    <div className="flex flex-col items-center max-w-4xl mx-auto text-center gap-8">

                        {/* Status */}
                        <div>
                            {isLive ? (
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full">
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                    <span className="text-red-500 font-bold uppercase tracking-widest text-sm">LIVE {game.period ? `• Q${game.period}` : ''} {liveClockSeconds !== null ? `• ${formatSecondsToMMSS(liveClockSeconds)}` : game.clock ? `• ${game.clock}` : ''}</span>
                                </div>
                            ) : isFinal ? (
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-neutral-800 border border-neutral-700 rounded-full">
                                    <span className="text-neutral-400 font-bold uppercase tracking-widest text-sm">FINAL</span>
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full">
                                    <span className="text-blue-500 font-bold uppercase tracking-widest text-sm">{format(gameDate, 'MMM d, yyyy • h:mm a')}</span>
                                </div>
                            )}
                        </div>

                        {/* WATCH LIVE Banner */}
                        {game.isStreaming && (
                            <Link
                                href={`/basketball/game/${game.id}/watch`}
                                className="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-2xl transition-all active:scale-95 shadow-lg shadow-red-600/30 animate-pulse"
                            >
                                <span className="w-3 h-3 bg-white rounded-full animate-ping"></span>
                                <span className="text-white font-black uppercase tracking-wider text-sm">🔴 Watch Live Stream</span>
                            </Link>
                        )}

                        {/* Scores */}
                        <div className="flex w-full items-center justify-between md:justify-center gap-4 md:gap-16">

                            {/* Away */}
                            <div className="flex flex-col items-center gap-3 flex-1 md:flex-none">
                                <Link href={`/basketball/team/${awayTeam.id}`} className="hover:scale-105 transition-transform duration-300">
                                    <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center p-3 mb-2 shadow-xl overflow-hidden relative">
                                        {awayTeam.logo ? <LazyImage src={awayTeam.logo} alt={awayTeam.abbreviation} className="w-full h-full !object-contain filter drop-shadow-md" fill /> : <span className="font-display font-bold text-2xl text-neutral-500">{awayTeam.abbreviation}</span>}
                                    </div>
                                </Link>
                                <span className="font-display font-bold text-xl md:text-3xl text-white uppercase">{awayTeam.abbreviation}</span>
                                <span className="text-sm text-neutral-500 font-medium hidden md:block">{awayTeam.name}</span>
                            </div>

                            {/* Score Numbers */}
                            <div className="flex items-center justify-center gap-4 md:gap-8 min-w-[120px]">
                                <span className={`text-6xl md:text-8xl font-mono font-black tracking-tighter ${isLive || (isFinal && game.awayScore > game.homeScore) ? 'text-white' : 'text-neutral-500'}`}>{game.awayScore}</span>
                                <span className="text-3xl font-black text-neutral-800">-</span>
                                <span className={`text-6xl md:text-8xl font-mono font-black tracking-tighter ${isLive || (isFinal && game.homeScore > game.awayScore) ? 'text-white' : 'text-neutral-500'}`}>{game.homeScore}</span>
                            </div>

                            {/* Home */}
                            <div className="flex flex-col items-center gap-3 flex-1 md:flex-none">
                                <Link href={`/basketball/team/${homeTeam.id}`} className="hover:scale-105 transition-transform duration-300">
                                    <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center p-3 mb-2 shadow-xl overflow-hidden relative">
                                        {homeTeam.logo ? <LazyImage src={homeTeam.logo} alt={homeTeam.abbreviation} className="w-full h-full !object-contain filter drop-shadow-md" fill /> : <span className="font-display font-bold text-2xl text-neutral-500">{homeTeam.abbreviation}</span>}
                                    </div>
                                </Link>
                                <span className="font-display font-bold text-xl md:text-3xl text-white uppercase">{homeTeam.abbreviation}</span>
                                <span className="text-sm text-neutral-500 font-medium hidden md:block">{homeTeam.name}</span>
                            </div>

                        </div>

                        {/* Game Meta */}
                        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium uppercase tracking-widest text-neutral-500 mt-4">
                            {game.venue && <span className="flex items-center gap-2">📍 {game.venue}</span>}
                            {game.gameType && <span>{game.gameType.replace('-', ' ')}</span>}
                            {game.broadcastInfo && <span className="flex items-center gap-2">📺 {game.broadcastInfo}</span>}
                        </div>

                    </div>
                </div>
            </div>

            {/* Content (Rosters/Stats) */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">

                <h2 className="text-2xl font-display font-bold text-white uppercase tracking-tight mb-8">Team Rosters</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Away Roster */}
                    <div>
                        <div className="flex items-center gap-3 mb-6 bg-neutral-900 px-4 py-3 rounded-xl border border-neutral-800">
                            <div className="w-8 h-8 relative overflow-hidden">
                                {awayTeam.logo && <LazyImage src={awayTeam.logo} alt={awayTeam.abbreviation} className="!object-contain" fill />}
                            </div>
                            <h3 className="font-display font-bold text-xl text-white">{awayTeam.name}</h3>
                        </div>
                        <div className="space-y-3">
                            {awayPlayers.map(p => (
                                <Link key={p.id} href={`/basketball/player/${p.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden shrink-0 relative flex items-center justify-center text-sm font-bold text-neutral-600">
                                            {p.headshot ? <LazyImage src={p.headshot} alt={p.name} className="!object-cover" fill /> : p.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white flex items-center gap-2">
                                                <span className="group-hover:text-orange-400 transition-colors">{p.name}</span>
                                                {p.status === 'injured' && <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">INJ</span>}
                                                {p.status === 'out' && <span className="bg-red-500/20 text-red-500 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">OUT</span>}
                                            </div>
                                            <div className="text-xs text-neutral-500 font-mono mt-0.5">#{p.number} • {p.position}</div>
                                        </div>
                                    </div>
                                    {p.height && <span className="text-sm font-mono text-neutral-600">{p.height}</span>}
                                </Link>
                            ))}
                            {awayPlayers.length === 0 && <div className="text-neutral-600 text-sm italic px-4">No roster found for this team.</div>}
                        </div>
                    </div>

                    {/* Home Roster */}
                    <div>
                        <div className="flex items-center gap-3 mb-6 bg-neutral-900 px-4 py-3 rounded-xl border border-neutral-800">
                            <div className="w-8 h-8 relative overflow-hidden">
                                {homeTeam.logo && <LazyImage src={homeTeam.logo} alt={homeTeam.abbreviation} className="!object-contain" fill />}
                            </div>
                            <h3 className="font-display font-bold text-xl text-white">{homeTeam.name}</h3>
                        </div>
                        <div className="space-y-3">
                            {homePlayers.map(p => (
                                <Link key={p.id} href={`/basketball/player/${p.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden shrink-0 relative flex items-center justify-center text-sm font-bold text-neutral-600">
                                            {p.headshot ? <LazyImage src={p.headshot} alt={p.name} className="!object-cover" fill /> : p.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white flex items-center gap-2">
                                                <span className="group-hover:text-orange-400 transition-colors">{p.name}</span>
                                                {p.status === 'injured' && <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">INJ</span>}
                                                {p.status === 'out' && <span className="bg-red-500/20 text-red-500 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">OUT</span>}
                                            </div>
                                            <div className="text-xs text-neutral-500 font-mono mt-0.5">#{p.number} • {p.position}</div>
                                        </div>
                                    </div>
                                    {p.height && <span className="text-sm font-mono text-neutral-600">{p.height}</span>}
                                </Link>
                            ))}
                            {homePlayers.length === 0 && <div className="text-neutral-600 text-sm italic px-4">No roster found for this team.</div>}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
