'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, MapPin, Calendar } from 'lucide-react';

interface FinalCountdownProps {
    targetDate: Date;
    venue?: string;
    fixtureId?: string;
}

export default function FinalCountdown({ targetDate, venue, fixtureId }: FinalCountdownProps) {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const distance = targetDate.getTime() - now;

            if (distance < 0) {
                setIsExpired(true);
                return;
            }

            setTimeLeft({
                days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((distance % (1000 * 60)) / 1000),
            });
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    const TimeUnit = ({ value, label }: { value: number; label: string }) => (
        <div className="flex flex-col items-center group">
            <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-2 bg-gradient-to-br from-afcon-gold/40 via-yellow-500/20 to-afcon-gold/40 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Main card */}
                <div className="relative bg-gradient-to-b from-white/10 to-transparent backdrop-blur-2xl border border-white/20 rounded-2xl md:rounded-[2rem] p-3 md:p-8 min-w-[70px] sm:min-w-[80px] md:min-w-[140px] text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform transition-all duration-500 group-hover:-translate-y-2 group-hover:border-afcon-gold/50">
                    <span className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-display font-black text-white block tracking-tighter drop-shadow-2xl">
                        {value.toString().padStart(2, '0')}
                    </span>
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent my-2 md:my-4"></div>
                    <span className="text-[8px] sm:text-[10px] md:text-xs text-afcon-gold uppercase tracking-[0.2em] md:tracking-[0.3em] block font-black">
                        {label}
                    </span>
                </div>
            </div>
        </div>
    );

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).toUpperCase();
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        }).toUpperCase();
    };

    if (isExpired) {
        return null;
    }

    return (
        <div className="flex flex-col items-center animate-fade-in-up">
            {/* Header with Trophy */}
            <div className="flex items-center gap-4 mb-8 md:mb-12">
                <div className="h-px w-12 md:w-24 bg-gradient-to-r from-transparent via-afcon-gold to-afcon-gold/0"></div>
                <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 group hover:border-afcon-gold/50 transition-colors">
                    <Trophy className="w-5 h-5 md:w-6 md:h-6 text-afcon-gold group-hover:scale-110 transition-transform" />
                    <span className="text-white uppercase tracking-[0.4em] text-[10px] md:text-sm font-black whitespace-nowrap">
                        Journey to the Throne
                    </span>
                    <Trophy className="w-5 h-5 md:w-6 md:h-6 text-afcon-gold group-hover:scale-110 transition-transform" />
                </div>
                <div className="h-px w-12 md:w-24 bg-gradient-to-l from-transparent via-afcon-gold to-afcon-gold/0"></div>
            </div>

            {/* Time units */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 lg:gap-12 w-full">
                <TimeUnit value={timeLeft.days} label="Days" />
                <TimeUnit value={timeLeft.hours} label="Hours" />
                <TimeUnit value={timeLeft.minutes} label="Minutes" />
                <TimeUnit value={timeLeft.seconds} label="Seconds" />
            </div>

            {/* Match details - More Dramatic */}
            <div className="mt-10 md:mt-16 flex flex-col md:flex-row items-center gap-4 md:gap-12 bg-black/40 backdrop-blur-md px-6 md:px-12 py-4 md:py-6 rounded-2xl md:rounded-3xl border border-white/10 w-full md:w-auto">
                <div className="flex items-center gap-3 group">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-afcon-gold group-hover:rotate-12 transition-transform" />
                    <span className="text-xs sm:text-sm md:text-lg font-bold text-gray-200 uppercase tracking-widest">{formatDate(targetDate)}</span>
                </div>

                <div className="hidden md:block w-2 h-2 bg-afcon-gold rounded-full shadow-[0_0_10px_#EAB308]"></div>

                <div className="flex items-center gap-3 group">
                    <div className="w-8 h-px bg-white/20 md:hidden"></div>
                    <span className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-widest">{formatTime(targetDate)}</span>
                    <div className="w-8 h-px bg-white/20 md:hidden"></div>
                </div>

                {venue && (
                    <>
                        <div className="hidden md:block w-2 h-2 bg-afcon-gold rounded-full shadow-[0_0_10px_#EAB308]"></div>
                        <div className="flex items-center gap-3 group">
                            <MapPin className="w-4 h-4 md:w-5 md:h-5 text-afcon-gold group-hover:translate-y-1 transition-transform" />
                            <span className="text-xs sm:text-sm md:text-lg font-bold text-gray-200 uppercase tracking-widest">{venue}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
