'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Period } from '@/types/liveMatch';

interface ClockControllerProps {
    matchId: string;
    clockMs: number;
    period: Period;
    isRunning: boolean;
    onUpdate: (updates: { clockMs?: number; period?: Period; isRunning?: boolean; extraTime?: number }) => void;
    extraTime: number;
}

const PERIOD_NAMES = {
    '1H': '1st Half',
    'HT': 'Half Time',
    '2H': '2nd Half',
    'ET1': 'Extra Time 1',
    'ET2': 'Extra Time 2',
    'PS': 'Penalties',
};

export default function ClockController({
    matchId,
    clockMs,
    period,
    isRunning,
    onUpdate,
    extraTime,
}: ClockControllerProps) {
    const [displayTime, setDisplayTime] = useState('00:00');
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastTickRef = useRef<number>(Date.now());
    const [showConfirmStop, setShowConfirmStop] = useState(false);
    const [customTime, setCustomTime] = useState('');

    // Format milliseconds to MM:SS
    const formatTime = useCallback((ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, []);

    // Update display time
    useEffect(() => {
        setDisplayTime(formatTime(clockMs));
    }, [clockMs, formatTime]);

    // Clock tick interval
    useEffect(() => {
        if (isRunning) {
            lastTickRef.current = Date.now();

            intervalRef.current = setInterval(() => {
                const now = Date.now();
                const elapsed = now - lastTickRef.current;
                lastTickRef.current = now;

                onUpdate({ clockMs: clockMs + elapsed });
            }, 100);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, clockMs, onUpdate]);

    const handleStart = () => {
        onUpdate({ isRunning: true });
    };

    const handlePause = () => {
        onUpdate({ isRunning: false });
    };

    const handleReset = () => {
        if (confirm('Reset clock to 00:00? This cannot be undone.')) {
            onUpdate({ clockMs: 0, isRunning: false });
        }
    };

    const handleStop = () => {
        setShowConfirmStop(true);
    };

    const confirmStop = () => {
        onUpdate({ isRunning: false, clockMs: 0, period: 'HT' });
        setShowConfirmStop(false);
    };

    const handleAddTime = (minutes: number) => {
        const additionalMs = minutes * 60 * 1000;
        onUpdate({ clockMs: clockMs + additionalMs });
    };

    const handleCustomTime = () => {
        const minutes = parseInt(customTime);
        if (!isNaN(minutes) && minutes > 0) {
            handleAddTime(minutes);
            setCustomTime('');
        }
    };

    const changePeriod = (newPeriod: Period) => {
        if (confirm(`Change to ${PERIOD_NAMES[newPeriod]}?`)) {
            onUpdate({ period: newPeriod, clockMs: 0, isRunning: false });
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-lg">
            {/* Period Badge & Extra Time */}
            <div className="mb-6 flex flex-col items-center justify-center gap-2">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-red-600 font-bold text-sm uppercase tracking-wider">LIVE</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-afcon-green text-white rounded-full font-bold text-sm">
                        {PERIOD_NAMES[period]}
                    </div>
                    {extraTime > 0 && (
                        <div className="text-sm font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                            +{extraTime} min
                        </div>
                    )}
                </div>
            </div>

            {/* Large Clock Display */}
            <div className="mb-8">
                <div className="text-7xl md:text-8xl font-mono font-bold text-center text-gray-900 tracking-tight leading-none">
                    {displayTime}
                </div>
            </div>

            {/* Main Controls - Stacked on Mobile */}
            <div className="space-y-3 mb-6">
                <div className="grid grid-cols-1 gap-3">
                    {!isRunning ? (
                        <button
                            onClick={handleStart}
                            className="w-full bg-afcon-green text-white px-6 py-5 rounded-xl font-bold hover:bg-green-700 transition-colors text-xl active:scale-95 shadow-md flex items-center justify-center gap-2"
                        >
                            <span>▶</span> Start Match
                        </button>
                    ) : (
                        <button
                            onClick={handlePause}
                            className="w-full bg-yellow-500 text-white px-6 py-5 rounded-xl font-bold hover:bg-yellow-600 transition-colors text-xl active:scale-95 shadow-md flex items-center justify-center gap-2"
                        >
                            <span>⏸</span> Pause Match
                        </button>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleReset}
                            className="bg-gray-100 text-gray-700 px-4 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors text-base active:scale-95 border border-gray-200 flex items-center justify-center gap-2"
                        >
                            <span>↻</span> Reset
                        </button>
                        <button
                            onClick={handleStop}
                            className="bg-red-50 text-red-600 border border-red-200 px-4 py-4 rounded-xl font-bold hover:bg-red-100 transition-colors text-base active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span>⏹</span> Stop
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Time Controls - Mobile Friendly */}
            <div className="border-t border-gray-200 pt-6 mb-6">
                <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider">Add Extra Time</h4>

                <div className="flex flex-col gap-3">
                    {/* Quick Add Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => handleAddTime(1)}
                            className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-3 rounded-lg font-semibold hover:bg-blue-100 transition-colors text-sm active:scale-95"
                        >
                            +1 min
                        </button>
                        <button
                            onClick={() => handleAddTime(2)}
                            className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-3 rounded-lg font-semibold hover:bg-blue-100 transition-colors text-sm active:scale-95"
                        >
                            +2 min
                        </button>
                        <button
                            onClick={() => handleAddTime(5)}
                            className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-3 rounded-lg font-semibold hover:bg-blue-100 transition-colors text-sm active:scale-95"
                        >
                            +5 min
                        </button>
                    </div>

                    {/* Custom Time Input */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                            type="number"
                            value={customTime}
                            onChange={(e) => setCustomTime(e.target.value)}
                            placeholder="Custom min"
                            className="sm:col-span-2 w-full px-4 py-3 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-afcon-green focus:border-transparent outline-none transition-all"
                            min="1"
                        />
                        <button
                            onClick={handleCustomTime}
                            className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-sm active:scale-95"
                        >
                            Add
                        </button>
                    </div>
                </div>
            </div>

            {/* Period Management - Responsive Grid */}
            <div className="border-t border-gray-200 pt-6">
                <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider">Match Period</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                        onClick={() => changePeriod('1H')}
                        disabled={period === '1H'}
                        className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95 ${period === '1H'
                                ? 'bg-afcon-green text-white shadow-md ring-2 ring-afcon-green ring-offset-2'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                    >
                        1st Half
                    </button>
                    <button
                        onClick={() => changePeriod('HT')}
                        disabled={period === 'HT'}
                        className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95 ${period === 'HT'
                                ? 'bg-afcon-green text-white shadow-md ring-2 ring-afcon-green ring-offset-2'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                    >
                        Half Time
                    </button>
                    <button
                        onClick={() => changePeriod('2H')}
                        disabled={period === '2H'}
                        className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95 ${period === '2H'
                                ? 'bg-afcon-green text-white shadow-md ring-2 ring-afcon-green ring-offset-2'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                    >
                        2nd Half
                    </button>
                    <button
                        onClick={() => changePeriod('ET1')}
                        disabled={period === 'ET1'}
                        className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95 ${period === 'ET1'
                                ? 'bg-afcon-green text-white shadow-md ring-2 ring-afcon-green ring-offset-2'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                    >
                        Extra Time 1
                    </button>
                    <button
                        onClick={() => changePeriod('ET2')}
                        disabled={period === 'ET2'}
                        className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95 ${period === 'ET2'
                                ? 'bg-afcon-green text-white shadow-md ring-2 ring-afcon-green ring-offset-2'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                    >
                        Extra Time 2
                    </button>
                    <button
                        onClick={() => changePeriod('PS')}
                        disabled={period === 'PS'}
                        className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all active:scale-95 ${period === 'PS'
                                ? 'bg-afcon-green text-white shadow-md ring-2 ring-afcon-green ring-offset-2'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                    >
                        Penalties
                    </button>
                </div>
            </div>

            {/* Confirmation Modal for Stop */}
            {showConfirmStop && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Stop Match</h3>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to stop the match? This will reset the clock and pause the match.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => setShowConfirmStop(false)}
                                className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmStop}
                                className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors active:scale-95"
                            >
                                Stop Match
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
