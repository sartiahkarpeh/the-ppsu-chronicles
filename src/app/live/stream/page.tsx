"use client";

import React from "react";
import LiveVideoPlayer from "../components/LiveVideoPlayer";
import { useLiveUpdates } from "../hooks/useLiveUpdates";
import LiveCard from "../components/LiveCard";

export default function LiveStreamPage() {
  const { games, loading } = useLiveUpdates();
  
  // Filter for live matches only
  const liveMatches = games.filter((game) => game.status === "LIVE");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2">
            🔴 Live Stream
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Watch live sports coverage with real-time updates
          </p>
        </div>

        {/* Main Live Stream Player */}
        <div className="mb-12">
          <LiveVideoPlayer showControls={true} />
        </div>

        {/* Other Live Matches */}
        {!loading && liveMatches.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-red-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-white">Other Live Matches</h2>
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                {liveMatches.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveMatches.map((game) => (
                <LiveCard key={game.id} game={game} />
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <h3 className="text-white font-bold text-lg mb-4">📱 Mobile Viewing Tips</h3>
          <ul className="text-gray-300 text-sm space-y-2 list-disc list-inside">
            <li>Rotate your phone to landscape for best viewing experience</li>
            <li>Tap the fullscreen button to enter immersive mode</li>
            <li>Match scores and stats update automatically in real-time</li>
            <li>Use headphones for better audio quality</li>
          </ul>
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-gray-800 bg-opacity-70 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-sm text-gray-300">
              Live updates • Real-time data
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
