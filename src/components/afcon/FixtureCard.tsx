'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Timestamp } from 'firebase/firestore';
import dayjs from 'dayjs';
import type { Fixture, FixtureStatusType } from '@/types/fixtureTypes';
import FormDots from './FormDots';
import { useLiveClock } from '@/hooks/useLiveClock';

interface FixtureCardProps {
    fixture: Fixture;
    onClick?: () => void;
}

function getStatusBadge(status: FixtureStatusType) {
    const badges: Record<FixtureStatusType, { text: string; class: string }> = {
        upcoming: { text: 'UPCOMING', class: 'bg-blue-500/20 text-blue-400' },
        live: { text: 'LIVE', class: 'bg-red-500/30 text-red-400 animate-pulse' },
        ht: { text: 'HT', class: 'bg-yellow-500/20 text-yellow-400' },
        ft: { text: 'FT', class: 'bg-gray-500/20 text-gray-400' },
        postponed: { text: 'PPD', class: 'bg-orange-500/20 text-orange-400' },
        cancelled: { text: 'CAN', class: 'bg-red-500/20 text-red-400' },
    };
    return badges[status];
}

function formatKickoff(kickoffDateTime: Timestamp | Date | string) {
    let date: Date;
    if (kickoffDateTime instanceof Timestamp) {
        date = kickoffDateTime.toDate();
    } else if (kickoffDateTime instanceof Date) {
        date = kickoffDateTime;
    } else {
        date = new Date(kickoffDateTime);
    }
    return dayjs(date).format('HH:mm');
}

function formatDate(kickoffDateTime: Timestamp | Date | string) {
    let date: Date;
    if (kickoffDateTime instanceof Timestamp) {
        date = kickoffDateTime.toDate();
    } else if (kickoffDateTime instanceof Date) {
        date = kickoffDateTime;
    } else {
        date = new Date(kickoffDateTime);
    }

    const today = dayjs();
    const kickoff = dayjs(date);

    if (kickoff.isSame(today, 'day')) return 'Today';
    if (kickoff.isSame(today.add(1, 'day'), 'day')) return 'Tomorrow';
    return kickoff.format('MMM D');
}

export default function FixtureCard({ fixture, onClick }: FixtureCardProps) {
    const badge = getStatusBadge(fixture.status);
    const isLive = fixture.status === 'live';
    const showScore = fixture.status !== 'upcoming';

    // Use live clock for real-time display
    const { displayTime, isRunning, inAddedTime } = useLiveClock({
        clockStartedAt: fixture.clockStartedAt,
        clockOffsetMs: fixture.clockOffsetMs || 0,
        clockIsRunning: fixture.clockIsRunning || false,
        addedTime: fixture.addedTime || 0,
        status: fixture.status,
        period: fixture.period || 'first',
    });

    return (
        <Link href={`/afcon25/fixtures/${fixture.id}`}>
            <motion.div
                whileTap={{ scale: 0.98 }}
                className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-800 hover:border-gray-700 transition-all cursor-pointer"
                onClick={onClick}
            >
                {/* Top row: Stage and Status */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                        {fixture.groupOrStage}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.class}`}>
                        {badge.text}
                    </span>
                </div>

                {/* Main content: Teams and Score/Time */}
                <div className="flex items-center justify-between gap-3">
                    {/* Home Team */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            {fixture.homeTeamLogoUrl ? (
                                <img
                                    src={fixture.homeTeamLogoUrl}
                                    alt={fixture.homeTeamName}
                                    className="w-8 h-8 object-contain"
                                />
                            ) : (
                                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs text-gray-400">
                                    {(fixture.homeTeamName || 'HM').substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <span className="text-white font-medium text-sm truncate">
                                {fixture.homeTeamName}
                            </span>
                        </div>
                        {fixture.homeRecentForm && fixture.homeRecentForm.length > 0 && (
                            <div className="mt-2 ml-10">
                                <FormDots form={fixture.homeRecentForm} size="sm" />
                            </div>
                        )}
                    </div>

                    {/* Center: Score or Time */}
                    <div className="flex flex-col items-center px-3 min-w-[70px]">
                        {showScore ? (
                            <>
                                <div className="flex items-center gap-2 text-xl font-bold text-white">
                                    <span>{fixture.homeScore}</span>
                                    <span className="text-gray-500">-</span>
                                    <span>{fixture.awayScore}</span>
                                </div>
                                {isLive && (
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs text-red-400 font-mono font-bold mt-1 px-2 py-0.5 bg-red-500/20 rounded-full">
                                            {displayTime}
                                        </span>
                                        {inAddedTime && fixture.addedTime && fixture.addedTime > 0 && (
                                            <span className="text-[10px] text-yellow-400 mt-0.5">
                                                +{fixture.addedTime}&apos;
                                            </span>
                                        )}
                                    </div>
                                )}
                                {fixture.status === 'ht' && (
                                    <span className="text-xs text-yellow-400 font-bold mt-1">HT</span>
                                )}
                                {fixture.penalties && (
                                    <span className="text-xs text-gray-400 mt-0.5">
                                        ({fixture.homePenScore}-{fixture.awayPenScore} pen)
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                <span className="text-xl font-bold text-white">
                                    {formatKickoff(fixture.kickoffDateTime)}
                                </span>
                                <span className="text-xs text-gray-500 mt-0.5">
                                    {formatDate(fixture.kickoffDateTime)}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Away Team */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-end gap-2">
                            <span className="text-white font-medium text-sm truncate text-right">
                                {fixture.awayTeamName}
                            </span>
                            {fixture.awayTeamLogoUrl ? (
                                <img
                                    src={fixture.awayTeamLogoUrl}
                                    alt={fixture.awayTeamName}
                                    className="w-8 h-8 object-contain"
                                />
                            ) : (
                                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs text-gray-400">
                                    {(fixture.awayTeamName || 'AW').substring(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>
                        {fixture.awayRecentForm && fixture.awayRecentForm.length > 0 && (
                            <div className="mt-2 mr-10 flex justify-end">
                                <FormDots form={fixture.awayRecentForm} size="sm" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom: Venue */}
                <div className="mt-3 pt-2 border-t border-gray-800">
                    <span className="text-xs text-gray-500 truncate block text-center">
                        📍 {fixture.venue}
                    </span>
                </div>
            </motion.div>
        </Link>
    );
}
