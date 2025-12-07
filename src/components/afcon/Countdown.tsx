'use client';

import React, { useState, useEffect } from 'react';

export default function Countdown() {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });

    useEffect(() => {
        const targetDate = new Date('December 13, 2025 00:00:00').getTime();

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                clearInterval(interval);
                return;
            }

            setTimeLeft({
                days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((distance % (1000 * 60)) / 1000),
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const TimeUnit = ({ value, label }: { value: number; label: string }) => (
        <div className="flex flex-col items-center mx-2 md:mx-4">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 md:p-4 min-w-[70px] md:min-w-[90px] text-center shadow-2xl">
                <span className="text-2xl md:text-4xl font-display font-bold text-white block">
                    {value.toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] md:text-xs text-gray-300 uppercase tracking-widest mt-1 block">
                    {label}
                </span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col items-center animate-fade-in-up">
            <h3 className="text-afcon-gold uppercase tracking-[0.2em] text-sm md:text-base font-bold mb-4 md:mb-6 text-center drop-shadow-lg">
                Tournament Starts In
            </h3>
            <div className="flex flex-wrap justify-center">
                <TimeUnit value={timeLeft.days} label="Days" />
                <TimeUnit value={timeLeft.hours} label="Hours" />
                <TimeUnit value={timeLeft.minutes} label="Mins" />
                <TimeUnit value={timeLeft.seconds} label="Secs" />
            </div>
        </div>
    );
}
