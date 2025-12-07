'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import type { FixtureStatusType } from '@/types/fixtureTypes';

interface UseMatchClockOptions {
    kickoffDateTime: Timestamp | Date | null;
    status: FixtureStatusType;
    currentMinute?: number | null;
    addedTime?: number;
}

interface UseMatchClockReturn {
    displayMinute: string;
    isRunning: boolean;
    period: 'first' | 'second' | 'et1' | 'et2' | 'penalties' | null;
}

/**
 * Hook to manage live match clock/timer
 * 
 * - For UPCOMING: shows static kickoff time
 * - For LIVE: calculates and updates minute based on kickoff time
 * - For HT: shows "HT"
 * - For FT: shows "FT"
 */
export function useMatchClock({
    kickoffDateTime,
    status,
    currentMinute,
    addedTime = 0,
}: UseMatchClockOptions): UseMatchClockReturn {
    const [displayMinute, setDisplayMinute] = useState<string>('');
    const [isRunning, setIsRunning] = useState(false);
    const [period, setPeriod] = useState<UseMatchClockReturn['period']>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const calculateMinute = useCallback(() => {
        if (!kickoffDateTime) return null;

        const kickoff = kickoffDateTime instanceof Timestamp
            ? kickoffDateTime.toDate()
            : new Date(kickoffDateTime);

        const now = new Date();
        const diffMs = now.getTime() - kickoff.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        // Cap at 90 for regular time display
        // The actual currentMinute from the database takes precedence if provided
        return Math.max(0, Math.min(diffMinutes, 90));
    }, [kickoffDateTime]);

    const formatMinute = useCallback((minute: number, added: number = 0): string => {
        if (added > 0) {
            return `${minute}+${added}'`;
        }
        return `${minute}'`;
    }, []);

    useEffect(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Handle different statuses
        switch (status) {
            case 'upcoming':
                setDisplayMinute('');
                setIsRunning(false);
                setPeriod(null);
                break;

            case 'live':
                setIsRunning(true);

                // Use database minute if provided, otherwise calculate
                const updateDisplay = () => {
                    if (currentMinute !== null && currentMinute !== undefined) {
                        // Database has the authoritative minute
                        if (currentMinute <= 45) {
                            setPeriod('first');
                            setDisplayMinute(formatMinute(currentMinute, currentMinute === 45 ? addedTime : 0));
                        } else if (currentMinute <= 90) {
                            setPeriod('second');
                            setDisplayMinute(formatMinute(currentMinute, currentMinute === 90 ? addedTime : 0));
                        } else if (currentMinute <= 105) {
                            setPeriod('et1');
                            setDisplayMinute(formatMinute(currentMinute, 0));
                        } else {
                            setPeriod('et2');
                            setDisplayMinute(formatMinute(currentMinute, 0));
                        }
                    } else {
                        // Calculate from kickoff time
                        const calculated = calculateMinute();
                        if (calculated !== null) {
                            setPeriod(calculated <= 45 ? 'first' : 'second');
                            setDisplayMinute(formatMinute(calculated));
                        }
                    }
                };

                updateDisplay();

                // Update every 30 seconds
                intervalRef.current = setInterval(updateDisplay, 30000);
                break;

            case 'ht':
                setDisplayMinute('HT');
                setIsRunning(false);
                setPeriod(null);
                break;

            case 'ft':
                setDisplayMinute('FT');
                setIsRunning(false);
                setPeriod(null);
                break;

            case 'postponed':
                setDisplayMinute('PPD');
                setIsRunning(false);
                setPeriod(null);
                break;

            case 'cancelled':
                setDisplayMinute('CAN');
                setIsRunning(false);
                setPeriod(null);
                break;

            default:
                setDisplayMinute('');
                setIsRunning(false);
                setPeriod(null);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [status, currentMinute, addedTime, calculateMinute, formatMinute]);

    return {
        displayMinute,
        isRunning,
        period,
    };
}

export default useMatchClock;
