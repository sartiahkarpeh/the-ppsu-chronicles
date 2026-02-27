'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/firebase/config';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import type { BasketballGame, BasketballTeam, BasketballPageConfig } from '@/types/basketball';
import LazyImage from '@/components/basketball/LazyImage';

export default function HeroGame({
    config
}: {
    config: BasketballPageConfig
}) {
    const [heroGame, setHeroGame] = useState<BasketballGame | null>(null);
    const [homeTeam, setHomeTeam] = useState<BasketballTeam | null>(null);
    const [awayTeam, setAwayTeam] = useState<BasketballTeam | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHeroData = async () => {
            try {
                let gameRef: any = null;

                // 1. Try to get the explicitly configured hero game
                if (config.heroGameId) {
                    gameRef = await getDoc(doc(db, 'basketball_games', config.heroGameId));
                }

                // 2. Fallback to newest "live" or "scheduled" game if no explicit config
                if (!gameRef?.exists()) {
                    const q = query(
                        collection(db, 'basketball_games'),
                        where('status', 'in', ['live', 'scheduled', 'ht']),
                        orderBy('date', 'asc'),
                        limit(1)
                    );
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        gameRef = querySnapshot.docs[0];
                    }
                }

                if (gameRef?.exists()) {
                    const gameData = { id: gameRef.id, ...gameRef.data() } as BasketballGame;
                    setHeroGame(gameData);

                    // Fetch teams
                    const [hTeamDoc, aTeamDoc] = await Promise.all([
                        getDoc(doc(db, 'basketball_teams', gameData.homeTeamId)),
                        getDoc(doc(db, 'basketball_teams', gameData.awayTeamId))
                    ]);

                    if (hTeamDoc.exists()) setHomeTeam({ id: hTeamDoc.id, ...hTeamDoc.data() } as BasketballTeam);
                    if (aTeamDoc.exists()) setAwayTeam({ id: aTeamDoc.id, ...aTeamDoc.data() } as BasketballTeam);
                }
            } catch (error) {
                console.error("Error fetching hero game:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHeroData();
    }, [config.heroGameId]);

    if (!config.showHeroSection || loading) {
        return (
            <div className="w-full h-[60vh] min-h-[400px] bg-neutral-900 border-b border-neutral-800 flex items-center justify-center animate-pulse">
                <div className="flex flex-col items-center gap-8 w-full max-w-4xl px-4">
                    <div className="h-10 bg-neutral-800 w-64 rounded-xl"></div>
                    <div className="flex items-center justify-between w-full h-48 bg-neutral-800/50 rounded-3xl"></div>
                </div>
            </div>
        );
    }

    const heroBg = config.heroBgImage
        ? `url('${config.heroBgImage}')`
        : 'linear-gradient(to bottom right, #111, #000)';

    // Fallback if no game exists at all
    if (!heroGame) {
        return (
            <div
                className="w-full h-[60vh] min-h-[400px] bg-cover bg-center border-b border-neutral-800 relative flex items-center justify-center"
                style={{ backgroundImage: heroBg }}
            >
                <div className="absolute inset-0 bg-black/60 z-0"></div>
                <div className="relative z-10 text-center max-w-3xl px-4">
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4 uppercase tracking-tighter">
                        {config.heroText || 'PPSU Hoops Begins'}
                    </h1>
                    <p className="text-neutral-300 text-lg md:text-xl font-medium">
                        Welcome to the new home of PPSU Basketball.
                    </p>
                </div>
            </div>
        );
    }

    const isLive = heroGame.status === 'live' || heroGame.status === 'ht';
    const isFuture = heroGame.status === 'scheduled';
    const gameDate = heroGame.date as any;

    return (
        <section
            className="w-full min-h-[500px] md:h-[70vh] bg-cover bg-center bg-no-repeat relative border-b border-neutral-800 flex items-center justify-center py-12"
            style={{ backgroundImage: heroBg }}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40 z-0 backdrop-blur-[4px]"></div>

            <div className="relative z-10 flex flex-col items-center justify-center px-4 w-full">
                {/* Hero Optional Title */}
                <h2 className="text-3xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 mb-8 md:mb-12 uppercase tracking-[0.2em] text-center drop-shadow-xl filter">
                    {config.heroText || 'FEATURED MATCHUP'}
                </h2>

                <Link
                    href={`/basketball/game/${heroGame.id}`}
                    className="w-full max-w-5xl bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-12 hover:bg-black/50 hover:border-white/20 hover:shadow-[0_0_40px_rgba(234,88,12,0.1)] transition-all duration-300 group cursor-pointer relative overflow-hidden"
                >
                    {/* Live Glow Effect */}
                    {isLive && (
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-red-600/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
                    )}

                    {/* Game Status Badge */}
                    <div className="flex justify-center mb-8 md:mb-16">
                        {isLive ? (
                            <div className="bg-red-500/10 border border-red-500/50 rounded-full px-6 py-2 flex items-center gap-3 backdrop-blur-md shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,1)]"></span>
                                <span className="text-red-500 font-bold uppercase tracking-widest text-sm">
                                    LIVE {heroGame.period ? `• Q${heroGame.period}` : ''} {heroGame.clock ? `• ${heroGame.clock}` : ''}
                                </span>
                            </div>
                        ) : isFuture ? (
                            <div className="bg-white/5 border border-white/10 rounded-full px-6 py-2 backdrop-blur-md">
                                <span className="text-neutral-300 font-bold uppercase tracking-widest text-sm">
                                    UPCOMING • {new Date(gameDate.seconds ? gameDate.seconds * 1000 : gameDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(gameDate.seconds ? gameDate.seconds * 1000 : gameDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ) : (
                            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-full px-6 py-2 backdrop-blur-md">
                                <span className="text-neutral-400 font-bold uppercase tracking-widest text-sm">
                                    FINAL
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Scoreboard Block */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 relative z-10">
                        {/* Away Team */}
                        <div className="flex flex-1 flex-col items-center gap-6 group">
                            {awayTeam?.logo ? (
                                <LazyImage fill src={awayTeam.logo} alt={awayTeam.name || 'AWY'} className="w-24 h-24 md:w-40 md:h-40 group-hover:scale-110 duration-500 ease-out drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] !object-contain" />
                            ) : (
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-neutral-800/50 backdrop-blur border border-neutral-700 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-neutral-500">{awayTeam?.abbreviation || 'AWY'}</span>
                                </div>
                            )}
                            <div className="text-center">
                                <h3 className="text-2xl md:text-4xl font-display font-black text-white uppercase tracking-tight">{awayTeam?.name || 'Away Team'}</h3>
                                <p className="text-neutral-400 font-mono text-sm tracking-[0.2em] mt-2">{awayTeam?.abbreviation || 'AWY'}</p>
                            </div>
                        </div>

                        {/* Scores Box */}
                        <div className="flex shrink-0 items-center justify-center gap-6 md:gap-12 bg-black/40 backdrop-blur-md border border-white/5 px-8 py-6 rounded-3xl">
                            <span className={`text-6xl md:text-8xl font-black font-mono tracking-tighter ${isLive ? 'text-white' : 'text-neutral-300'} ${isLive && 'drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]'}`}>
                                {heroGame.awayScore}
                            </span>
                            <div className="flex flex-col items-center">
                                <span className="text-2xl md:text-4xl font-bold text-neutral-600 mb-1">-</span>
                            </div>
                            <span className={`text-6xl md:text-8xl font-black font-mono tracking-tighter ${isLive ? 'text-white' : 'text-neutral-300'} ${isLive && 'drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]'}`}>
                                {heroGame.homeScore}
                            </span>
                        </div>

                        {/* Home Team */}
                        <div className="flex flex-1 flex-col items-center gap-6 group">
                            {homeTeam?.logo ? (
                                <LazyImage fill src={homeTeam.logo} alt={homeTeam.name || 'HME'} className="w-24 h-24 md:w-40 md:h-40 group-hover:scale-110 duration-500 ease-out drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] !object-contain" />
                            ) : (
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-neutral-800/50 backdrop-blur border border-neutral-700 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-neutral-500">{homeTeam?.abbreviation || 'HME'}</span>
                                </div>
                            )}
                            <div className="text-center">
                                <h3 className="text-2xl md:text-4xl font-display font-black text-white uppercase tracking-tight">{homeTeam?.name || 'Home Team'}</h3>
                                <p className="text-neutral-400 font-mono text-sm tracking-[0.2em] mt-2">{homeTeam?.abbreviation || 'HME'}</p>
                            </div>
                        </div>
                    </div>
                </Link>
            </div>
        </section>
    );
}
