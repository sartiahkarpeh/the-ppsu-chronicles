'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, ExternalLink } from 'lucide-react';
import FinalCountdown from './FinalCountdown';

interface HeroSectionProps {
  finalFixtureId?: string;
  kickoffDateTime?: Date;
  venue?: string;
  homeTeamName?: string;
  homeTeamFlag?: string;
  awayTeamName?: string;
  awayTeamFlag?: string;
}

export default function HeroSection({
  finalFixtureId = 'defhFOoFnIsd8HuLKcTG',
  kickoffDateTime,
  venue = 'Main Stadium',
  homeTeamName = 'Liberia',
  homeTeamFlag,
  awayTeamName = 'Nigeria',
  awayTeamFlag,
}: HeroSectionProps) {
  const [activeImage, setActiveImage] = useState(0);
  const images = ['/finale.jpg', '/finale2.jpeg'];

  // Default kickoff date - can be overridden via props
  const finalDate = kickoffDateTime || new Date('2026-01-05T16:30:00');

  // Crossfade between images
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % images.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-[100vh] md:min-h-[90vh] w-full bg-black overflow-hidden">
      {/* Background Images with Crossfade */}
      {images.map((src, index) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-2000 ${activeImage === index ? 'opacity-100' : 'opacity-0'
            }`}
        >
          <img
            src={src}
            alt={`AFCON Final ${index + 1}`}
            className="w-full h-full object-cover scale-105 animate-slow-zoom"
          />
        </div>
      ))}

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50"></div>

      {/* Gold accent overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-afcon-gold/5 via-transparent to-transparent"></div>

      {/* Animated particles/stars effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-afcon-gold/40 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              filter: 'blur(1px)',
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[100vh] md:min-h-[90vh] px-4 py-20 pb-24 md:py-20">

        {/* Top Badge */}
        <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
          <div className="h-px w-8 bg-afcon-gold/50"></div>
          <Sparkles className="w-5 h-5 text-afcon-gold animate-spin-slow" />
          <span className="text-afcon-gold text-sm md:text-base uppercase tracking-[0.4em] font-black drop-shadow-sm">
            AFCON 2025 GRAND FINALE
          </span>
          <Sparkles className="w-5 h-5 text-afcon-gold animate-spin-slow" />
          <div className="h-px w-8 bg-afcon-gold/50"></div>
        </div>

        {/* THE FINAL Title */}
        <div className="relative mb-8 md:mb-16 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-[10rem] font-display font-black text-white uppercase tracking-tighter text-center leading-tight md:leading-none">
            <span className="relative inline-block hover:scale-105 transition-transform duration-500">
              THE
              <span className="absolute -top-3 -right-4 md:-top-4 md:-right-6 text-sm md:text-2xl text-afcon-gold rotate-12 animate-pulse">★</span>
            </span>
            <br className="sm:hidden" />
            <span className="mx-2 sm:mx-4 hidden sm:inline-block"></span>
            <span className="relative text-transparent bg-clip-text bg-gradient-to-b from-afcon-gold via-yellow-200 to-afcon-gold drop-shadow-[0_0_20px_rgba(234,179,8,0.3)] md:drop-shadow-[0_0_30px_rgba(234,179,8,0.3)] animate-shimmer">
              FINAL
            </span>
          </h1>
          {/* Decorative rays */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] md:w-[120%] h-[110%] md:h-[120%] bg-afcon-gold/5 blur-[60px] md:blur-[100px] -z-10 rounded-full animate-pulse"></div>
        </div>

        {/* Teams Display - Horizontal First! */}
        <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 md:gap-16 lg:gap-24 mb-10 md:mb-20 px-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {/* Home Team */}
          <div className="flex flex-col items-center group flex-1">
            <div className="relative">
              <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-tr from-afcon-green/20 to-blue-500/10 rounded-full blur-xl sm:blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="relative z-10 w-16 h-16 sm:w-24 md:w-36 lg:w-48 flex items-center justify-center">
                {homeTeamFlag ? (
                  <img
                    src={homeTeamFlag}
                    alt={homeTeamName}
                    className="w-full h-full object-contain filter drop-shadow-lg md:drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black rounded-xl sm:rounded-3xl border border-white/10 flex items-center justify-center shadow-xl group-hover:border-afcon-green/50 transition-colors">
                    <span className="text-3xl sm:text-5xl md:text-7xl">🇱🇷</span>
                  </div>
                )}
                <div className="absolute -bottom-1 w-1/2 h-0.5 bg-afcon-green/50 blur-[2px] rounded-full"></div>
              </div>
            </div>
            <span className="mt-3 sm:mt-6 text-white text-xs sm:text-xl md:text-4xl font-display font-black uppercase tracking-tighter sm:tracking-widest text-center group-hover:text-afcon-gold transition-colors duration-300 line-clamp-1">
              {homeTeamName}
            </span>
          </div>

          {/* VS Divider - Responsive */}
          <div className="flex flex-col items-center flex-shrink-0 px-2 sm:px-4">
            <div className="relative">
              <div className="absolute -inset-4 sm:-inset-8 bg-afcon-gold/20 rounded-full blur-2xl sm:blur-3xl animate-pulse"></div>
              <div className="relative flex flex-col items-center">
                <div className="w-px h-6 sm:h-12 bg-gradient-to-b from-transparent via-afcon-gold to-transparent mb-2 sm:mb-4"></div>
                <span className="text-xl sm:text-4xl md:text-6xl lg:text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-afcon-gold to-yellow-600 drop-shadow-xl sm:drop-shadow-2xl">
                  VS
                </span>
                <div className="w-px h-6 sm:h-12 bg-gradient-to-t from-transparent via-afcon-gold to-transparent mt-2 sm:mt-4"></div>
              </div>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center group flex-1">
            <div className="relative">
              <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-tl from-afcon-green/20 to-green-500/10 rounded-full blur-xl sm:blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="relative z-10 w-16 h-16 sm:w-24 md:w-36 lg:w-48 flex items-center justify-center">
                {awayTeamFlag ? (
                  <img
                    src={awayTeamFlag}
                    alt={awayTeamName}
                    className="w-full h-full object-contain filter drop-shadow-lg md:drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black rounded-xl sm:rounded-3xl border border-white/10 flex items-center justify-center shadow-xl group-hover:border-afcon-green/50 transition-colors">
                    <span className="text-3xl sm:text-5xl md:text-7xl">🇳🇬</span>
                  </div>
                )}
                <div className="absolute -bottom-1 w-1/2 h-0.5 bg-afcon-green/50 blur-[2px] rounded-full"></div>
              </div>
            </div>
            <span className="mt-3 sm:mt-6 text-white text-xs sm:text-xl md:text-4xl font-display font-black uppercase tracking-tighter sm:tracking-widest text-center group-hover:text-afcon-gold transition-colors duration-300 line-clamp-1">
              {awayTeamName}
            </span>
          </div>
        </div>

        {/* Countdown */}
        <div className="mb-12 md:mb-16 w-full max-w-4xl animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <FinalCountdown
            targetDate={finalDate}
            venue={venue}
            fixtureId={finalFixtureId}
          />
        </div>

        {/* CTA Button - Ultra Premium */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Link
            href={`/afcon25/fixtures/${finalFixtureId}`}
            className="group relative inline-flex items-center gap-4 px-10 md:px-16 py-5 md:py-6 bg-white text-black font-display font-black text-lg md:text-xl uppercase tracking-[0.2em] rounded-full overflow-hidden transition-all duration-500 hover:scale-105 hover:bg-afcon-gold"
          >
            <span className="relative z-10">Enter The Arena</span>
            <ExternalLink className="w-6 h-6 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />

            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </Link>
        </div>

        {/* Bottom decorative element */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-50">
          <div className="w-2 h-2 bg-afcon-gold rounded-full animate-pulse"></div>
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-afcon-gold to-transparent"></div>
          <div className="w-2 h-2 bg-afcon-gold rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>
      </div>
    </div>
  );
}
