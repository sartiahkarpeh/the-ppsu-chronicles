// src/app/live/components/LiveCard.tsx
"use client";

import Image from "next/image";
import { LiveGame } from "@/app/live/types";
import { useState, useEffect } from "react";
import LiveEventSchema from "@/app/live/components/LiveEventSchema";
import LiveBadge from "@/app/live/components/LiveBadge";

interface LiveCardProps {
  game: LiveGame;
  onEdit?: (game: LiveGame) => void;
  onEndMatch?: (gameId: string) => void;
  isAdmin?: boolean;
}

export default function LiveCard({
  game,
  onEdit,
  onEndMatch,
  isAdmin = false,
}: LiveCardProps) {
  const [imageErrors, setImageErrors] = useState({ teamA: false, teamB: false });
  const [liveTime, setLiveTime] = useState(game.time);

  const isLive = game.status === "LIVE";
  const isFootball = game.sport === "Football";
  const sportColor =
    game.sport === "Football" ? "border-green-500" : "border-orange-500";

  // Live timer effect
  useEffect(() => {
    if (!isLive) {
      setLiveTime(game.time);
      return;
    }
    
    // Calculate start time based on current time and pausedAt
    let startTimestamp: number;
    
    if (game.startTime) {
      // Use the stored start time
      const startDate = game.startTime instanceof Date ? game.startTime : game.startTime.toDate();
      startTimestamp = startDate.getTime();
    } else {
      // Fallback: calculate start time from current time minus pausedAt
      const pausedSeconds = game.pausedAt || 0;
      startTimestamp = Date.now() - (pausedSeconds * 1000);
    }
    
    const updateTimer = () => {
      const now = Date.now();
      const elapsedMs = now - startTimestamp;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      
      let minutes = Math.floor(elapsedSeconds / 60);
      let seconds = elapsedSeconds % 60;
      
      if (isFootball) {
        // Football: count up from elapsed time
        setLiveTime(`${minutes}'${seconds > 0 ? seconds.toString().padStart(2, '0') : ''}`);
      } else {
        // Basketball: count down from initial time
        // Parse the initial time from game.time
        const timeMatch = game.time.match(/(\d+):(\d+)/);
        let initialMinutes = 12; // Default quarter length
        let initialSeconds = 0;
        
        if (timeMatch) {
          initialMinutes = parseInt(timeMatch[1]) || 12;
          initialSeconds = parseInt(timeMatch[2]) || 0;
        }
        
        const totalInitialSeconds = (initialMinutes * 60) + initialSeconds;
        const remainingSeconds = Math.max(0, totalInitialSeconds - elapsedSeconds);
        
        minutes = Math.floor(remainingSeconds / 60);
        seconds = remainingSeconds % 60;
        
        const quarterMatch = game.time.match(/Q(\d+)/);
        const quarter = quarterMatch ? quarterMatch[1] : "1";
        setLiveTime(`Q${quarter} ${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };
    
    // Update immediately
    updateTimer();
    
    // Then update every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [isLive, game.time, game.startTime, game.pausedAt, isFootball]);

  const formatLastUpdated = (date: any) => {
    if (!date) return "";
    const timestamp = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <>
      {/* Schema.org structured data for SEO and social media */}
      {isLive && <LiveEventSchema game={game} />}
      
      <div
        className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${sportColor} hover:shadow-lg transition-shadow relative`}
      >
        {/* Live Badge - New improved badge */}
        {isLive && <LiveBadge game={game} size="sm" position="absolute" />}

      {/* League and Location */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800">{game.league}</h3>
        <p className="text-sm text-gray-500">{game.location}</p>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Team A */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative w-20 h-20 mb-2">
            {!imageErrors.teamA && game.teamA.imageUrl ? (
              <Image
                src={game.teamA.imageUrl}
                alt={game.teamA.name}
                fill
                sizes="80px"
                className="object-contain"
                onError={() => setImageErrors((prev) => ({ ...prev, teamA: true }))}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-400">
                  {game.teamA.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <p className="font-semibold text-center text-gray-800">
            {game.teamA.name}
          </p>
        </div>

        {/* Score */}
        <div className="text-center px-4">
          <div className="text-3xl font-bold text-gray-900">{game.score}</div>
          <div className={`text-sm mt-1 font-semibold ${isLive ? 'text-red-600' : 'text-gray-600'}`}>
            {isLive ? liveTime : game.time}
          </div>
        </div>

        {/* Team B */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative w-20 h-20 mb-2">
            {!imageErrors.teamB && game.teamB.imageUrl ? (
              <Image
                src={game.teamB.imageUrl}
                alt={game.teamB.name}
                fill
                sizes="80px"
                className="object-contain"
                onError={() => setImageErrors((prev) => ({ ...prev, teamB: true }))}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-400">
                  {game.teamB.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <p className="font-semibold text-center text-gray-800">
            {game.teamB.name}
          </p>
        </div>
      </div>

      {/* Status and Description */}
      <div className="border-t pt-3">
        <div className="flex justify-between items-center mb-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              game.status === "LIVE"
                ? "bg-red-100 text-red-700"
                : game.status === "HALFTIME"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {game.status}
          </span>
          <span className="text-xs text-gray-500">
            {formatLastUpdated(game.lastUpdated)}
          </span>
        </div>

        {game.description && (
          <p className="text-sm text-gray-600 mt-2">{game.description}</p>
        )}
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <div className="flex gap-2 mt-4 pt-3 border-t">
          {onEdit && (
            <button
              onClick={() => onEdit(game)}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              Edit
            </button>
          )}
          {onEndMatch && game.id && (
            <button
              onClick={() => onEndMatch(game.id!)}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              End Match
            </button>
          )}
        </div>
      )}
      </div>
    </>
  );
}
