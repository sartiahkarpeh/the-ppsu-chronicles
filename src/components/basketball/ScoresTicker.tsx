'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { db } from '@/firebase/config';
import { collection, query, orderBy, onSnapshot, where, doc } from 'firebase/firestore';
import type { BasketballGame, BasketballTeam, ScoresTickerConfig } from '@/types/basketball';

export default function ScoresTicker() {
    const [config, setConfig] = useState<ScoresTickerConfig | null>(null);
    const [games, setGames] = useState<BasketballGame[]>([]);
    const [teams, setTeams] = useState<Record<string, BasketballTeam>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch Teams to map IDs to logos/abbs
        const qTeams = query(collection(db, 'basketball_teams'));
        const unsubscribeTeams = onSnapshot(qTeams, (snapshot) => {
            const teamsMap: Record<string, BasketballTeam> = {};
            snapshot.docs.forEach(d => {
                teamsMap[d.id] = { id: d.id, ...d.data() } as BasketballTeam;
            });
            setTeams(teamsMap);
        });

        // Fetch Ticker Config
        const unsubscribeConfig = onSnapshot(
            doc(db, 'basketball_configs', 'ticker'),
            (docSnap) => {
                if (docSnap.exists()) {
                    setConfig(docSnap.data() as ScoresTickerConfig);
                } else {
                    setConfig({ isActive: true, showLiveOnly: false, featuredGameIds: [], speed: 50, updatedAt: null as any });
                }
            }
        );

        return () => {
            unsubscribeTeams();
            unsubscribeConfig();
        };
    }, []);

    useEffect(() => {
        if (!config) return;

        let qGames = query(collection(db, 'basketball_games'), orderBy('date', 'desc'));

        if (config.showLiveOnly) {
            qGames = query(
                collection(db, 'basketball_games'),
                where('status', 'in', ['live', 'ht']),
                orderBy('date', 'desc')
            );
        }

        const unsubscribeGames = onSnapshot(qGames, (snapshot) => {
            let fetchedGames = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BasketballGame));

            // Filter by featured game IDs if configured
            if (config.featuredGameIds?.length > 0) {
                fetchedGames = fetchedGames.filter(g => config.featuredGameIds.includes(g.id));
            } else if (!config.showLiveOnly) {
                // Limit to 10 most recent games roughly
                fetchedGames = fetchedGames.slice(0, 10);
            }

            setGames(fetchedGames);
            setLoading(false);
        });

        return () => unsubscribeGames();
    }, [config]);

    if (!config?.isActive || loading || games.length === 0) return null;

    // Calculate duration based on number of games and base speed. Lower number = faster.
    const animationDuration = `${Math.max(20, (games.length * 100) / (config.speed || 50))}s`;

    return (
        <div className="bg-black border-b border-gray-800 overflow-hidden relative flex items-center h-12 shadow-md">
            <div className="bg-orange-600 text-white font-bold text-xs uppercase px-4 py-1 z-20 flex-shrink-0 flex items-center h-full shadow-[5px_0_10px_rgba(0,0,0,0.5)]">
                <span className="animate-pulse mr-2 w-2 h-2 rounded-full bg-white"></span>
                Scores
            </div>

            <div className="absolute left-24 z-10 w-8 h-full bg-gradient-to-r from-black to-transparent pointer-events-none"></div>
            <div className="absolute right-0 z-10 w-12 h-full bg-gradient-to-l from-black to-transparent pointer-events-none"></div>

            <div className="flex-1 overflow-hidden h-full flex items-center relative ml-4">
                <div
                    className="flex whitespace-nowrap animate-ticker group absolute left-0"
                    style={{ animationDuration }}
                >
                    {/* Render the items three times for seamless infinite looping */}
                    {[...games, ...games, ...games].map((game, index) => {
                        const homeTeam = teams[game.homeTeamId];
                        const awayTeam = teams[game.awayTeamId];
                        const isLive = game.status === 'live' || game.status === 'ht';

                        return (
                            <Link
                                key={`${game.id}-${index}`}
                                href={`/basketball/game/${game.id}`}
                                className="flex items-center gap-3 px-6 border-r border-gray-800 hover:bg-gray-900 transition-colors h-12 min-w-max group-hover:[animation-play-state:paused]"
                            >
                                {/* Status Indicator */}
                                <div className="flex flex-col items-center justify-center w-12 text-[10px] font-bold tracking-wider">
                                    {isLive ? (
                                        <>
                                            <span className="text-red-500 animate-pulse">LIVE</span>
                                            <span className="text-gray-400">{game.period ? `Q${game.period}` : ''} {game.clock}</span>
                                        </>
                                    ) : game.status === 'ft' ? (
                                        <span className="text-gray-500">FINAL</span>
                                    ) : (
                                        <span className="text-gray-500">{new Date(game.date as any).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    )}
                                </div>

                                {/* Away Team */}
                                <div className="flex items-center gap-2">
                                    {awayTeam?.logo ? (
                                        <img src={awayTeam.logo} alt={awayTeam.abbreviation} className="w-5 h-5 object-contain" />
                                    ) : <div className="w-5 h-5 bg-gray-800 rounded-full"></div>}
                                    <span className="font-bold text-gray-300 text-sm w-8 uppercase">{awayTeam?.abbreviation || 'AWY'}</span>
                                    <span className={`font-mono text-base font-bold ${isLive ? 'text-white' : 'text-gray-400'}`}>
                                        {game.awayScore}
                                    </span>
                                </div>

                                <span className="text-gray-600 text-xs">@</span>

                                {/* Home Team */}
                                <div className="flex items-center gap-2">
                                    <span className={`font-mono text-base font-bold ${isLive ? 'text-white' : 'text-gray-400'}`}>
                                        {game.homeScore}
                                    </span>
                                    <span className="font-bold text-gray-300 text-sm w-8 uppercase text-right">{homeTeam?.abbreviation || 'HME'}</span>
                                    {homeTeam?.logo ? (
                                        <img src={homeTeam.logo} alt={homeTeam.abbreviation} className="w-5 h-5 object-contain" />
                                    ) : <div className="w-5 h-5 bg-gray-800 rounded-full"></div>}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <style jsx>{`
                @keyframes ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.33%); }
                }
                .animate-ticker {
                    animation-name: ticker;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }
            `}</style>
        </div>
    );
}
