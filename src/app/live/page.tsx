// src/app/live/page.tsx
"use client";

import { useLiveUpdates } from "@/app/live/hooks/useLiveUpdates";
import LiveCard from "@/app/live/components/LiveCard";
import { LiveBanner } from "@/app/live/components/LiveBadge";
import LiveVideoPlayer from "@/app/live/components/LiveVideoPlayer";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";

export default function LivePage() {
  const { games, loading, error } = useLiveUpdates();
  const [hasActiveStream, setHasActiveStream] = useState(false);

  const footballGames = games.filter((game) => game.sport === "Football");
  const basketballGames = games.filter((game) => game.sport === "Basketball");
  const liveGamesCount = games.filter((game) => game.status === "LIVE").length;
  const hasLiveGames = liveGamesCount > 0;

  // Check for active stream with REAL-TIME updates
  useEffect(() => {
    const streamQuery = query(
      collection(db, "livestreams"),
      where("isActive", "==", true)
    );
    
    // Real-time listener for instant updates
    const unsubscribe = onSnapshot(
      streamQuery,
      (snapshot) => {
        setHasActiveStream(!snapshot.empty);
      },
      (error) => {
        console.error("Error checking stream:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading live matches...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Live Banner - Shows only when there are live matches */}
      {hasLiveGames && (
        <LiveBanner 
          text={`${liveGamesCount} Live ${liveGamesCount === 1 ? 'Match' : 'Matches'} in Progress`} 
        />
      )}
      
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              🔴 Live Scores
            </h1>
            <p className="text-lg text-gray-600">
              Real-time updates from ongoing matches
            </p>
          </div>

          {/* Live Video Stream Section */}
          {hasActiveStream && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-red-500 rounded-full"></div>
                <h2 className="text-3xl font-bold text-gray-800">📹 Live Video Stream</h2>
              </div>
              <LiveVideoPlayer showControls={true} />
            </div>
          )}

        {/* No Games Message */}
        {games.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🏟️</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              No Live Matches
            </h3>
            <p className="text-gray-600">
              There are no live matches at the moment. Check back soon!
            </p>
          </div>
        )}

        {/* Football Section */}
        {footballGames.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-green-500 rounded-full"></div>
              <h2 className="text-3xl font-bold text-gray-800">⚽ Football</h2>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                {footballGames.length} {footballGames.length === 1 ? "Match" : "Matches"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {footballGames.map((game) => (
                <LiveCard key={game.id} game={game} />
              ))}
            </div>
          </section>
        )}

        {/* Basketball Section */}
        {basketballGames.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-orange-500 rounded-full"></div>
              <h2 className="text-3xl font-bold text-gray-800">🏀 Basketball</h2>
              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                {basketballGames.length} {basketballGames.length === 1 ? "Match" : "Matches"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {basketballGames.map((game) => (
                <LiveCard key={game.id} game={game} />
              ))}
            </div>
          </section>
        )}

          {/* Auto-refresh indicator */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm text-gray-600">
                Updates automatically in real-time
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
