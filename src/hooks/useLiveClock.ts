'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';

interface UseLiveClockOptions {
    clockStartedAt?: Timestamp | null;
    clockOffsetMs?: number;
    clockIsRunning?: boolean;
    addedTime?: number;
    status: string;
    period?: 'first' | 'second' | 'et1' | 'et2' | 'penalties';
}

interface UseLiveClockReturn {
    displayTime: string; // "45:30" format
    totalSeconds: number;
    minutes: number;
    seconds: number;
    isRunning: boolean;
    period: string;
    inAddedTime: boolean;
    elapsedAddedTime: number;
    addedTimeExpired: boolean;
    addedTime: number;
}

/**
 * Real-time match clock hook
 * Calculates elapsed time from clockStartedAt + clockOffsetMs
 * Updates every second for smooth display
 */
export function useLiveClock({
    clockStartedAt,
    clockOffsetMs = 0,
    clockIsRunning = false,
    addedTime = 0,
    status,
    period = 'first',
}: UseLiveClockOptions): UseLiveClockReturn {
    const [totalSeconds, setTotalSeconds] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const calculateElapsedSeconds = useCallback(() => {
        if (!clockIsRunning || !clockStartedAt) {
            // Clock is paused, just show the offset
            return Math.floor(clockOffsetMs / 1000);
        }

        // Calculate elapsed time since clock started + any offset from pauses
        const startTime = clockStartedAt instanceof Timestamp
            ? clockStartedAt.toDate().getTime()
            : new Date(clockStartedAt).getTime();

        const now = Date.now();
        const elapsedMs = now - startTime + clockOffsetMs;
        return Math.floor(elapsedMs / 1000);
    }, [clockStartedAt, clockOffsetMs, clockIsRunning]);

    useEffect(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Handle non-live statuses
        if (status !== 'live') {
            if (status === 'ht') {
                setTotalSeconds(45 * 60); // 45:00
            } else if (status === 'ft') {
                setTotalSeconds(90 * 60); // 90:00
            } else {
                setTotalSeconds(0);
            }
            return;
        }

        // Initial calculation
        setTotalSeconds(calculateElapsedSeconds());

        // Update every second if clock is running
        if (clockIsRunning) {
            intervalRef.current = setInterval(() => {
                setTotalSeconds(calculateElapsedSeconds());
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [status, clockIsRunning, clockStartedAt, clockOffsetMs, calculateElapsedSeconds]);

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // Determine if we're in added time
    const periodEndMinutes = period === 'first' ? 45 :
        period === 'second' ? 90 :
            period === 'et1' ? 105 : 120;
    const inAddedTime = minutes >= periodEndMinutes;

    // Calculate how much added time has elapsed
    const elapsedAddedTime = inAddedTime ? minutes - periodEndMinutes : 0;

    // Check if the added time has expired (clock has exceeded periodEnd + addedTime)
    const addedTimeExpired = inAddedTime && addedTime > 0 && elapsedAddedTime >= addedTime;

    // Format display time
    const formatTime = () => {
        if (status === 'ht') return 'HT';
        if (status === 'ft') return 'FT';
        if (status === 'upcoming') return '--:--';

        const displayMinutes = Math.min(minutes, inAddedTime ? periodEndMinutes : minutes);
        const formattedSeconds = seconds.toString().padStart(2, '0');

        if (inAddedTime) {
            const addedMinutes = minutes - periodEndMinutes;
            return `${periodEndMinutes}+${addedMinutes}:${formattedSeconds}`;
        }

        return `${displayMinutes}:${formattedSeconds}`;
    };

    return {
        displayTime: formatTime(),
        totalSeconds,
        minutes,
        seconds,
        isRunning: clockIsRunning,
        period,
        inAddedTime,
        elapsedAddedTime,
        addedTimeExpired,
        addedTime,
    };
}

export default useLiveClock;
