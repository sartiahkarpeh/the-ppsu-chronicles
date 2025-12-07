'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ScoreboardProps {
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    homeLogo?: string;
    awayLogo?: string;
    onScoreChange: (team: 'home' | 'away', delta: number) => void;
}

export default function Scoreboard({
    homeTeamName,
    awayTeamName,
    homeScore,
    awayScore,
    homeLogo,
    awayLogo,
    onScoreChange,
}: ScoreboardProps) {
    const handleScoreAdjust = (team: 'home' | 'away', delta: number) => {
        const currentScore = team === 'home' ? homeScore : awayScore;
        const newScore = currentScore + delta;

        // Prevent negative scores
        if (newScore < 0) {
            return;
        }

        onScoreChange(team, delta);
    };

    return (
        <div className="bg-gradient-to-r from-gray-900 to-black rounded-xl p-4 md:p-8 shadow-2xl border border-gray-700">
            {/* Competition Badge */}
            <div className="text-center mb-4 md:mb-6">
                <div className="inline-block bg-afcon-gold px-4 md:px-6 py-1.5 md:py-2 rounded-full">
                    <span className="text-black font-bold text-xs md:text-sm uppercase tracking-wider">AFCON 2025</span>
                </div>
            </div>

            {/* MOBILE LAYOUT - Optimized Single Column */}
            <div className="block md:hidden">
                {/* Teams & Score Header */}
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center justify-between px-2">
                        {/* Home Team Identity */}
                        <div className="flex flex-col items-center w-[30%] text-center">
                            {homeLogo && (
                                <div className="w-12 h-12 relative mb-2">
                                    <Image
                                        src={homeLogo}
                                        alt={homeTeamName}
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            )}
                            <h3 className="text-white font-bold text-sm leading-tight truncate w-full">{homeTeamName}</h3>
                        </div>

                        {/* Central Score */}
                        <div className="flex items-center justify-center w-[40%]">
                            <div className="bg-black/40 px-4 py-2 rounded-lg border border-white/10">
                                <div className="text-3xl font-mono font-bold text-white whitespace-nowrap">
                                    {homeScore} – {awayScore}
                                </div>
                            </div>
                        </div>

                        {/* Away Team Identity */}
                        <div className="flex flex-col items-center w-[30%] text-center">
                            {awayLogo && (
                                <div className="w-12 h-12 relative mb-2">
                                    <Image
                                        src={awayLogo}
                                        alt={awayTeamName}
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            )}
                            <h3 className="text-white font-bold text-sm leading-tight truncate w-full">{awayTeamName}</h3>
                        </div>
                    </div>
                </div>

                {/* Score Controls - Vertical Stacks */}
                <div className="grid grid-cols-2 gap-4 px-2">
                    {/* Home Controls */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => handleScoreAdjust('home', 1)}
                            className="w-full py-4 bg-green-600 text-white rounded-lg font-bold text-xl hover:bg-green-700 active:scale-95 transition-all shadow-lg"
                        >
                            +1 Home
                        </button>
                        <button
                            onClick={() => handleScoreAdjust('home', -1)}
                            className="w-full py-3 bg-red-600/80 text-white rounded-lg font-bold text-lg hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                            disabled={homeScore === 0}
                        >
                            -1 Home
                        </button>
                    </div>

                    {/* Away Controls */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => handleScoreAdjust('away', 1)}
                            className="w-full py-4 bg-green-600 text-white rounded-lg font-bold text-xl hover:bg-green-700 active:scale-95 transition-all shadow-lg"
                        >
                            +1 Away
                        </button>
                        <button
                            onClick={() => handleScoreAdjust('away', -1)}
                            className="w-full py-3 bg-red-600/80 text-white rounded-lg font-bold text-lg hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                            disabled={awayScore === 0}
                        >
                            -1 Away
                        </button>
                    </div>
                </div>
            </div>

            {/* DESKTOP LAYOUT - Original Grid */}
            <div className="hidden md:block">
                {/* Main Scoreboard */}
                <div className="grid grid-cols-7 gap-4 items-center mb-6">
                    {/* Home Team */}
                    <div className="col-span-3 text-right">
                        <div className="flex items-center justify-end gap-4">
                            {homeLogo && (
                                <div className="w-16 h-16 relative flex-shrink-0">
                                    <Image
                                        src={homeLogo}
                                        alt={homeTeamName}
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            )}
                            <div>
                                <h3 className="text-white font-bold text-2xl">{homeTeamName}</h3>
                                <p className="text-gray-400 text-sm uppercase">Home</p>
                            </div>
                        </div>
                    </div>

                    {/* Score */}
                    <div className="col-span-1 text-center">
                        <div className="text-6xl font-mono font-bold text-white">
                            {homeScore} - {awayScore}
                        </div>
                    </div>

                    {/* Away Team */}
                    <div className="col-span-3 text-left">
                        <div className="flex items-center gap-4">
                            <div>
                                <h3 className="text-white font-bold text-2xl">{awayTeamName}</h3>
                                <p className="text-gray-400 text-sm uppercase">Away</p>
                            </div>
                            {awayLogo && (
                                <div className="w-16 h-16 relative flex-shrink-0">
                                    <Image
                                        src={awayLogo}
                                        alt={awayTeamName}
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Score Controls - Desktop */}
                <div className="grid grid-cols-2 gap-8">
                    {/* Home Controls */}
                    <div className="space-y-2">
                        <p className="text-white text-sm font-semibold mb-2">{homeTeamName} Score</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleScoreAdjust('home', 1)}
                                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors"
                            >
                                +1
                            </button>
                            <button
                                onClick={() => handleScoreAdjust('home', -1)}
                                className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors"
                                disabled={homeScore === 0}
                            >
                                -1
                            </button>
                        </div>
                    </div>

                    {/* Away Controls */}
                    <div className="space-y-2">
                        <p className="text-white text-sm font-semibold mb-2">{awayTeamName} Score</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleScoreAdjust('away', 1)}
                                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors"
                            >
                                +1
                            </button>
                            <button
                                onClick={() => handleScoreAdjust('away', -1)}
                                className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors"
                                disabled={awayScore === 0}
                            >
                                -1
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Indicator */}
            <div className="mt-4 md:mt-6 flex items-center justify-center gap-2">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-white font-bold text-sm uppercase tracking-wider">LIVE</span>
            </div>
        </div>
    );
}
