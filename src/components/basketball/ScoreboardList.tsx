'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/firebase/config';
import { collection, query, orderBy, onSnapshot, Timestamp, limit } from 'firebase/firestore';
import type { BasketballGame, BasketballTeam, BasketballPageConfig } from '@/types/basketball';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import LazyImage from '@/components/basketball/LazyImage';

export default function ScoreboardList({
    config
}: {
    config: BasketballPageConfig
}) {
    const [games, setGames] = useState<BasketballGame[]>([]);
    const [teams, setTeams] = useState<Record<string, BasketballTeam>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!config.showScoreboard) {
            setLoading(false);
            return;
        }

        // Fetch Teams to map IDs
        const qTeams = query(collection(db, 'basketball_teams'));
        const unsubscribeTeams = onSnapshot(qTeams, (snapshot) => {
            const teamsMap: Record<string, BasketballTeam> = {};
            snapshot.docs.forEach(doc => {
                teamsMap[doc.id] = { id: doc.id, ...doc.data() } as BasketballTeam;
            });
            setTeams(teamsMap);
        });

        // Try getting Games
        const targetDate = Timestamp.now().toDate();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const qGames = query(
            collection(db, 'basketball_games'),
            orderBy('date', 'desc'),
            limit(12)
        );

        const unsubscribeGames = onSnapshot(qGames, (snapshot) => {
            const fetchedGames = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BasketballGame));

            // Sort to ensure live games are at the top, then scheduled, then FT
            const sorted = fetchedGames.sort((a, b) => {
                const statusOrder: Record<string, number> = { 'live': 1, 'ht': 1, 'scheduled': 2, 'ft': 3, 'postponed': 4, 'cancelled': 5 };
                const orderA = statusOrder[a.status] || 99;
                const orderB = statusOrder[b.status] || 99;

                if (orderA !== orderB) return orderA - orderB;

                // If same status, sort by date
                const dateA = a.date instanceof Timestamp ? a.date.toDate().getTime() : new Date(a.date.toString()).getTime();
                const dateB = b.date instanceof Timestamp ? b.date.toDate().getTime() : new Date(b.date.toString()).getTime();
                return dateA - dateB;
            });

            setGames(sorted);
            setLoading(false);
        });

        return () => {
            unsubscribeTeams();
            unsubscribeGames();
        };
    }, [config.showScoreboard]);

    if (!config.showScoreboard || loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="h-8 w-48 bg-neutral-800 rounded mb-8 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-40 bg-neutral-900 rounded-2xl border border-neutral-800"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (games.length === 0) return null;

    const getDayLabel = (date: Date) => {
        if (isToday(date)) return 'Today';
        if (isTomorrow(date)) return 'Tomorrow';
        if (isYesterday(date)) return 'Yesterday';
        return format(date, 'MMM d');
    };

    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-end justify-between mb-8 border-b border-neutral-800 pb-4">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white tracking-tight">Recent & Upcoming</h2>
                    <p className="text-neutral-400 mt-1">Latest action around the league</p>
                </div>
                <Link href="/basketball/games" className="text-orange-500 hover:text-orange-400 font-medium text-sm tracking-wide hidden sm:block">
                    VIEW ALL GAMES →
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {games.map((game) => {
                    // Optionally filter out hero game if it's identical
                    if (game.id === config.heroGameId) return null;

                    const homeTeam = teams[game.homeTeamId];
                    const awayTeam = teams[game.awayTeamId];
                    if (!homeTeam || !awayTeam) return null;

                    const isLive = game.status === 'live' || game.status === 'ht';
                    const isFuture = game.status === 'scheduled';
                    const isFinal = game.status === 'ft';
                    const gameDate = game.date instanceof Timestamp ? game.date.toDate() : new Date(game.date.toString());

                    return (
                        <Link
                            href={`/basketball/game/${game.id}`}
                            key={game.id}
                            className="bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-2xl overflow-hidden group transition-all duration-300 hover:shadow-xl hover:shadow-black/50"
                        >
                            {/* Card Header Status Row */}
                            <div className="px-5 py-3 border-b border-neutral-800 bg-black/20 flex justify-between items-center">
                                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLive ? 'text-orange-500 animate-pulse' : isFinal ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                    {isLive && <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>}
                                    {isLive ? `LIVE • Q${game.period}` : isFinal ? 'FINAL' : getDayLabel(gameDate)}
                                </span>

                                <span className="text-xs font-mono text-neutral-500">
                                    {isLive ? game.clock : format(gameDate, 'h:mm a')}
                                </span>
                            </div>

                            {/* Teams and Scores */}
                            <div className="p-5 flex flex-col gap-4">
                                {/* Away Team Row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden">
                                            {awayTeam.logo ? (
                                                <LazyImage src={awayTeam.logo} alt={awayTeam.abbreviation} className="w-5 h-5 !object-contain" fill />
                                            ) : (
                                                <span className="text-xs font-bold text-neutral-500">{awayTeam.abbreviation}</span>
                                            )}
                                        </div>
                                        <span className={`font-display font-bold text-lg ${isFinal && game.awayScore < game.homeScore ? 'text-neutral-400' : 'text-white'}`}>
                                            {awayTeam.name}
                                        </span>
                                    </div>
                                    <span className={`font-mono text-2xl font-bold ${isFinal && game.awayScore < game.homeScore ? 'text-neutral-500' : 'text-white'}`}>
                                        {game.awayScore > 0 || isFinal || isLive ? game.awayScore : '-'}
                                    </span>
                                </div>

                                {/* Home Team Row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden">
                                            {homeTeam.logo ? (
                                                <LazyImage src={homeTeam.logo} alt={homeTeam.abbreviation} className="w-5 h-5 !object-contain" fill />
                                            ) : (
                                                <span className="text-xs font-bold text-neutral-500">{homeTeam.abbreviation}</span>
                                            )}
                                        </div>
                                        <span className={`font-display font-bold text-lg ${isFinal && game.homeScore < game.awayScore ? 'text-neutral-400' : 'text-white'}`}>
                                            {homeTeam.name}
                                        </span>
                                    </div>
                                    <span className={`font-mono text-2xl font-bold ${isFinal && game.homeScore < game.awayScore ? 'text-neutral-500' : 'text-white'}`}>
                                        {game.homeScore > 0 || isFinal || isLive ? game.homeScore : '-'}
                                    </span>
                                </div>
                            </div>

                            {/* Broadcast Info / Sub Footer */}
                            {(game.broadcastInfo || game.venue) && (
                                <div className="px-5 py-3 bg-neutral-900 border-t border-neutral-800/50 flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-widest font-medium">
                                    {game.broadcastInfo && (
                                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>{game.broadcastInfo}</span>
                                    )}
                                    {!game.broadcastInfo && game.venue && (
                                        <span>📍 {game.venue}</span>
                                    )}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>

            <Link href="/basketball/games" className="block sm:hidden text-center mt-8 text-orange-500 hover:text-orange-400 font-bold uppercase tracking-widest text-sm">
                VIEW ALL GAMES →
            </Link>
        </section>
    );
}
