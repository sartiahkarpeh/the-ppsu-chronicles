"use client";

import React, { useEffect, useState, useRef } from "react";
import { db } from "@/firebase/config";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { LiveStream, LiveGame } from "../types";
import Image from "next/image";

interface LiveVideoPlayerProps {
  streamId?: string;
  showControls?: boolean;
}

export default function LiveVideoPlayer({ streamId, showControls = true }: LiveVideoPlayerProps) {
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [matchData, setMatchData] = useState<LiveGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [liveTime, setLiveTime] = useState<string>("0'"); // Live updating timer
  const videoRef = useRef<HTMLVideoElement>(null);

  /**
   * Fetch active live stream with REAL-TIME updates
   */
  useEffect(() => {
    let unsubscribeStream: (() => void) | undefined;
    let unsubscribeMatch: (() => void) | undefined;

    const fetchStream = async () => {
      try {
        setLoading(true);
        setError(null);

        if (streamId) {
          // Real-time listener for specific stream by ID
          unsubscribeStream = onSnapshot(
            doc(db, "livestreams", streamId),
            (streamDoc) => {
              if (streamDoc.exists()) {
                const streamData = { id: streamDoc.id, ...streamDoc.data() } as LiveStream;
                console.log("🎥 LiveVideoPlayer: Received stream data:", {
                  id: streamData.id,
                  isActive: streamData.isActive,
                  hasCurrentFrame: !!streamData.currentFrame,
                  lastFrameUpdate: streamData.lastFrameUpdate instanceof Date ? streamData.lastFrameUpdate : streamData.lastFrameUpdate?.toDate()
                });
                setStream(streamData);
                setError(null);

                // Real-time listener for associated match data
                if (streamData.matchId) {
                  unsubscribeMatch = onSnapshot(
                    doc(db, "liveGames", streamData.matchId),
                    (matchDoc) => {
                      if (matchDoc.exists()) {
                        setMatchData({ id: matchDoc.id, ...matchDoc.data() } as LiveGame);
                      }
                    }
                  );
                }
                setLoading(false);
              } else {
                console.log("🎥 LiveVideoPlayer: Stream not found");
                setError("Stream not found");
                setLoading(false);
              }
            },
            (error) => {
              console.error("Stream listener error:", error);
              setError("Error loading stream");
              setLoading(false);
            }
          );
        } else {
          // Find the most recent active stream with real-time updates
          const streamQuery = query(
            collection(db, "livestreams"),
            where("isActive", "==", true)
          );

          console.log("🎥 LiveVideoPlayer: Setting up stream query listener...");

          unsubscribeStream = onSnapshot(
            streamQuery,
            (snapshot) => {
              console.log("🎥 LiveVideoPlayer: Stream query snapshot received", {
                empty: snapshot.empty,
                size: snapshot.size,
                docs: snapshot.docs.map(doc => ({ id: doc.id, isActive: doc.data().isActive }))
              });

              if (!snapshot.empty) {
                const latestStream = snapshot.docs[0];
                const streamData = { id: latestStream.id, ...latestStream.data() } as LiveStream;
                console.log("🎥 LiveVideoPlayer: Found active stream:", {
                  id: streamData.id,
                  isActive: streamData.isActive,
                  hasCurrentFrame: !!streamData.currentFrame,
                  lastFrameUpdate: streamData.lastFrameUpdate instanceof Date ? streamData.lastFrameUpdate : streamData.lastFrameUpdate?.toDate()
                });
                setStream(streamData);
                setError(null);

                // Real-time listener for match data
                if (streamData.matchId) {
                  unsubscribeMatch = onSnapshot(
                    doc(db, "liveGames", streamData.matchId),
                    (matchDoc) => {
                      if (matchDoc.exists()) {
                        setMatchData({ id: matchDoc.id, ...matchDoc.data() } as LiveGame);
                      }
                    }
                  );
                }
              } else {
                console.log("🎥 LiveVideoPlayer: No active streams found - showing placeholder");
                setStream(null);
                setMatchData(null);
                setError("No active stream available");
              }
              setLoading(false);
            },
            (error) => {
              console.error("Stream query error:", error);
              setError("Error loading stream");
              setLoading(false);
            }
          );
        }

        setLoading(false);
      } catch (err: any) {
        setLoading(false);
        setError(`Error loading stream: ${err.message}`);
        console.error("Stream fetch error:", err);
      }
    };

    fetchStream();

    // Cleanup subscriptions
    return () => {
      if (unsubscribeStream) unsubscribeStream();
      if (unsubscribeMatch) unsubscribeMatch();
    };
  }, [streamId]);

  /**
   * Simulate viewer count (in production, track real viewers)
   */
  useEffect(() => {
    if (stream?.isActive) {
      const interval = setInterval(() => {
        setViewerCount((prev) => Math.max(0, prev + Math.floor(Math.random() * 10 - 3)));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [stream]);

  /**
   * 🔥 LIVE TIMER - Updates every second to show real match time
   * Parses the match time from Firebase and increments it live
   */
  useEffect(() => {
    if (!matchData || matchData.status !== "LIVE") {
      setLiveTime(matchData?.time || "0'");
      return;
    }

    // Parse initial time from Firebase (e.g., "45'" or "45+2'")
    const parseTime = (timeStr: string): number => {
      const match = timeStr.match(/^(\d+)(?:\+(\d+))?/);
      if (!match) return 0;
      const minutes = parseInt(match[1], 10);
      const added = match[2] ? parseInt(match[2], 10) : 0;
      return minutes + added;
    };

    let currentMinutes = parseTime(matchData.time);

    // Update timer every second
    const timerInterval = setInterval(() => {
      currentMinutes += 1 / 60; // Increment by 1 second
      const displayMinutes = Math.floor(currentMinutes);
      setLiveTime(`${displayMinutes}'`);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [matchData]);

  if (loading) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-white">Loading stream...</p>
        </div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-6xl mb-4">📺</div>
          <h3 className="text-white text-xl font-bold mb-2">No Live Stream</h3>
          <p className="text-gray-400">
            {error || "Check back soon for live coverage!"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden shadow-2xl">
      {/* Video Player */}
      <div className="relative aspect-video">
        {/* 📹 Display live camera feed from Firebase */}
        {stream?.currentFrame ? (
          <img
            src={stream.currentFrame}
            alt="Live Stream"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">📹</div>
              <p className="text-white text-2xl font-bold mb-2">Live Camera Feed</p>
              <p className="text-gray-300 text-sm">
                {matchData ? `${matchData.teamA.name} vs ${matchData.teamB.name}` : 'Loading...'}
              </p>
              <p className="text-gray-400 text-xs mt-4">
                Camera broadcasting via Canvas + Firebase (5 FPS)
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Start streaming from /live/admin to see the feed
              </p>
            </div>
          </div>
        )}

        {/* LIVE Badge - Top Left */}
        <div className="absolute top-4 left-4 z-20">
          <div className="flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="text-white font-bold text-xs uppercase tracking-wider">LIVE</span>
          </div>
        </div>

        {/* Viewer Count - Top Right */}
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-black bg-opacity-70 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-white font-semibold text-xs">
                {viewerCount.toLocaleString()} watching
              </span>
            </div>
          </div>
        </div>

        {/* Match Score Overlay - Top Center */}
        {matchData && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-gradient-to-r from-blue-900/95 via-blue-800/95 to-blue-900/95 backdrop-blur-md px-6 py-3 rounded-xl shadow-2xl border border-blue-500/30">
              <div className="flex items-center gap-6">
                {/* Team A */}
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                    <Image
                      src={matchData.teamA.imageUrl}
                      alt={matchData.teamA.name}
                      fill
                      sizes="(max-width: 640px) 32px, 40px"
                      className="object-contain rounded-full bg-white/10 p-1"
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-sm sm:text-base">
                      {matchData.teamA.name}
                    </p>
                  </div>
                </div>

                {/* Score */}
                <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <p className="text-white font-black text-xl sm:text-2xl tracking-wider">
                    {matchData.score}
                  </p>
                </div>

                {/* Team B */}
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <p className="text-white font-bold text-sm sm:text-base">
                      {matchData.teamB.name}
                    </p>
                  </div>
                  <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                    <Image
                      src={matchData.teamB.imageUrl}
                      alt={matchData.teamB.name}
                      fill
                      sizes="(max-width: 640px) 32px, 40px"
                      className="object-contain rounded-full bg-white/10 p-1"
                    />
                  </div>
                </div>
              </div>

              {/* Match Time & Status */}
              <div className="flex items-center justify-center gap-3 mt-2 pt-2 border-t border-blue-400/30">
                <span className="text-blue-200 text-xs font-semibold">
                  {matchData.league}
                </span>
                <span className="text-blue-300 text-xs">•</span>
                <span className="text-blue-200 text-xs font-bold">
                  {liveTime}
                </span>
                {matchData.status === "LIVE" && (
                  <>
                    <span className="text-blue-300 text-xs">•</span>
                    <span className="text-green-400 text-xs font-bold animate-pulse">
                      {matchData.status}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Additional Info - Bottom Left */}
        {matchData && (
          <div className="absolute bottom-4 left-4 z-20">
            <div className="bg-black bg-opacity-70 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg max-w-xs">
              <p className="text-white text-xs font-semibold mb-1">
                📍 {matchData.location}
              </p>
              {matchData.description && (
                <p className="text-gray-300 text-xs line-clamp-2">
                  {matchData.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Mobile Optimizations */}
        <style jsx>{`
          @media (max-width: 640px) {
            .aspect-video {
              aspect-ratio: 9 / 16; /* Vertical for mobile */
            }
          }
        `}</style>
      </div>

      {/* Stream Info Bar - Below Video */}
      {matchData && (
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-bold text-lg sm:text-xl">
                {matchData.teamA.name} vs {matchData.teamB.name}
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                {matchData.league} • {matchData.sport}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-black text-white">{matchData.score}</p>
                <p className="text-xs text-gray-400 mt-1">{matchData.time}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
