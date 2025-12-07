// src/app/live/components/LiveBadge.tsx
"use client";

import { useEffect, useState } from 'react';
import { LiveGame } from '@/app/live/types';

interface LiveBadgeProps {
  game: LiveGame;
  size?: 'sm' | 'md' | 'lg';
  position?: 'inline' | 'absolute';
}

/**
 * LiveBadge Component
 * 
 * Displays a pulsing red "LIVE" badge for active sporting events.
 * The badge automatically updates its appearance based on the event status.
 * 
 * Features:
 * - Animated pulsing red dot
 * - Responsive sizing (sm, md, lg)
 * - Flexible positioning (inline or absolute)
 * - Accessible with proper ARIA labels
 * - Auto-updates based on game status
 * 
 * Usage:
 * <LiveBadge game={game} size="md" position="absolute" />
 */
export default function LiveBadge({ game, size = 'md', position = 'inline' }: LiveBadgeProps) {
  const [isLive, setIsLive] = useState(game.status === "LIVE");

  // Update live status when game changes
  useEffect(() => {
    setIsLive(game.status === "LIVE");
  }, [game.status]);

  // Don't render if not live
  if (!isLive) return null;

  // Size configurations
  const sizeClasses = {
    sm: {
      container: 'px-2 py-1 text-xs',
      dot: 'h-1.5 w-1.5',
      text: 'text-xs',
    },
    md: {
      container: 'px-3 py-1.5 text-sm',
      dot: 'h-2 w-2',
      text: 'text-sm',
    },
    lg: {
      container: 'px-4 py-2 text-base',
      dot: 'h-2.5 w-2.5',
      text: 'text-base',
    },
  };

  const currentSize = sizeClasses[size];

  // Position configurations
  const positionClasses = position === 'absolute'
    ? 'absolute top-2 right-2 z-10'
    : 'inline-flex';

  return (
    <div
      className={`${positionClasses} items-center gap-1.5 ${currentSize.container} bg-red-600 text-white font-bold rounded-full shadow-lg hover:bg-red-700 transition-colors duration-200`}
      role="status"
      aria-live="polite"
      aria-label="Live event in progress"
    >
      {/* Animated pulsing dot */}
      <span className="relative flex">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75`}
          aria-hidden="true"
        ></span>
        <span
          className={`relative inline-flex rounded-full ${currentSize.dot} bg-white`}
          aria-hidden="true"
        ></span>
      </span>

      {/* LIVE text */}
      <span className={`${currentSize.text} font-extrabold uppercase tracking-wider`}>
        LIVE
      </span>
    </div>
  );
}

/**
 * Compact version for list views
 */
export function LiveBadgeCompact() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full"
      role="status"
      aria-label="Live"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
      </span>
      LIVE
    </span>
  );
}

/**
 * Banner version for page headers
 */
export function LiveBanner({ text = "Live Match in Progress" }: { text?: string }) {
  return (
    <div
      className="w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600 py-2 px-4 shadow-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2 text-white">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        <span className="font-bold text-sm md:text-base uppercase tracking-wide">
          {text}
        </span>
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      </div>
    </div>
  );
}
