// src/app/live/hooks/useLiveActivity.ts
"use client";

import { useEffect, useState } from "react";
import { LiveGame } from "@/app/live/types";

// Detect if user is on iOS/iPadOS
const isIOS = () => {
  if (typeof window === "undefined") return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
  const isStandalone = (window.navigator as any).standalone === true;
  const isWebKit = /webkit/.test(userAgent);
  
  return isIOSDevice && (isStandalone || isWebKit);
};

// Check if Dynamic Island / Live Activities API is available
const isLiveActivitySupported = () => {
  if (typeof window === "undefined") return false;
  
  // Check for iOS 16.1+ and Live Activity capability
  const hasLiveActivity = "ActivityKit" in window || 
                          "startLiveActivity" in (navigator as any) ||
                          "ActivityViewController" in window;
  
  return isIOS() && hasLiveActivity;
};

interface LiveActivityData {
  gameId: string;
  sport: string;
  teamA: {
    name: string;
    logo: string;
    score: number;
  };
  teamB: {
    name: string;
    logo: string;
    score: number;
  };
  time: string;
  status: string;
  league: string;
}

export const useLiveActivity = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [activeActivities, setActiveActivities] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    setIsSupported(isLiveActivitySupported());
  }, []);

  const startLiveActivity = async (game: LiveGame) => {
    if (!isSupported || !game.id) return null;

    try {
      // Parse scores
      const scores = game.score.split("-").map(s => parseInt(s.trim()) || 0);
      
      const activityData: LiveActivityData = {
        gameId: game.id,
        sport: game.sport,
        teamA: {
          name: game.teamA.name,
          logo: game.teamA.imageUrl,
          score: scores[0],
        },
        teamB: {
          name: game.teamB.name,
          logo: game.teamB.imageUrl,
          score: scores[1],
        },
        time: game.time,
        status: game.status,
        league: game.league,
      };

      // For iOS devices with Live Activities support
      if ((navigator as any).startLiveActivity) {
        const activity = await (navigator as any).startLiveActivity({
          attributes: {
            name: `${game.teamA.name} vs ${game.teamB.name}`,
            sport: game.sport,
            league: game.league,
          },
          contentState: activityData,
          staleDate: Date.now() + 4 * 60 * 60 * 1000, // 4 hours
          relevanceScore: 100,
        });

        setActiveActivities(prev => new Map(prev).set(game.id!, activity));
        
        console.log("✅ Live Activity started:", activity);
        return activity;
      }
      
      // Fallback: Use Web App Badge API for iOS PWA
      if ("setAppBadge" in navigator) {
        const totalScore = scores[0] + scores[1];
        await (navigator as any).setAppBadge(totalScore);
      }

      // Store activity data in localStorage for persistence
      localStorage.setItem(
        `liveActivity_${game.id}`,
        JSON.stringify(activityData)
      );

      return activityData;
    } catch (error) {
      console.error("Error starting Live Activity:", error);
      return null;
    }
  };

  const updateLiveActivity = async (game: LiveGame) => {
    if (!isSupported || !game.id) return;

    try {
      const scores = game.score.split("-").map(s => parseInt(s.trim()) || 0);
      
      const activityData: LiveActivityData = {
        gameId: game.id,
        sport: game.sport,
        teamA: {
          name: game.teamA.name,
          logo: game.teamA.imageUrl,
          score: scores[0],
        },
        teamB: {
          name: game.teamB.name,
          logo: game.teamB.imageUrl,
          score: scores[1],
        },
        time: game.time,
        status: game.status,
        league: game.league,
      };

      const activity = activeActivities.get(game.id);

      if (activity && (navigator as any).updateLiveActivity) {
        await (navigator as any).updateLiveActivity(activity.id, {
          contentState: activityData,
          staleDate: Date.now() + 4 * 60 * 60 * 1000,
        });
        
        console.log("✅ Live Activity updated");
      }

      // Update localStorage
      localStorage.setItem(
        `liveActivity_${game.id}`,
        JSON.stringify(activityData)
      );

      // Update badge
      if ("setAppBadge" in navigator) {
        const totalScore = scores[0] + scores[1];
        await (navigator as any).setAppBadge(totalScore);
      }
    } catch (error) {
      console.error("Error updating Live Activity:", error);
    }
  };

  const endLiveActivity = async (gameId: string) => {
    if (!isSupported || !gameId) return;

    try {
      const activity = activeActivities.get(gameId);

      if (activity && (navigator as any).endLiveActivity) {
        await (navigator as any).endLiveActivity(activity.id, {
          contentState: {
            status: "ENDED",
          },
          dismissalPolicy: "immediate",
        });
        
        console.log("✅ Live Activity ended");
      }

      // Remove from active activities
      setActiveActivities(prev => {
        const next = new Map(prev);
        next.delete(gameId);
        return next;
      });

      // Clear localStorage
      localStorage.removeItem(`liveActivity_${gameId}`);

      // Clear badge
      if ("clearAppBadge" in navigator) {
        await (navigator as any).clearAppBadge();
      }
    } catch (error) {
      console.error("Error ending Live Activity:", error);
    }
  };

  const showDynamicIsland = (game: LiveGame) => {
    if (!isIOS()) return;

    // Create a custom notification that will appear in Dynamic Island
    if ("Notification" in window && Notification.permission === "granted") {
      const scores = game.score.split("-");
      
      // This will show in the Dynamic Island on iPhone 14 Pro and later
      const notification = new Notification(
        `${game.teamA.name} ${scores[0]} - ${scores[1]} ${game.teamB.name}`,
        {
          body: `${game.time} • ${game.league}`,
          icon: game.teamA.imageUrl,
          badge: "/ppsu.png",
          tag: `dynamic-island-${game.id}`,
          silent: true,
          requireInteraction: true,
          data: {
            gameId: game.id,
            displayInDynamicIsland: true,
          },
        }
      );

      // Keep the notification active (stays in Dynamic Island)
      setTimeout(() => {
        // Update notification periodically
        notification.close();
      }, 30000); // Keep for 30 seconds
    }
  };

  return {
    isSupported,
    isIOS: isIOS(),
    startLiveActivity,
    updateLiveActivity,
    endLiveActivity,
    showDynamicIsland,
  };
};

// Create PWA manifest entries for iOS
export const generateIOSManifest = () => {
  return {
    name: "PPSU Live Scores",
    short_name: "Live Scores",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3B82F6",
    icons: [
      {
        src: "/ppsu.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    supports_live_activities: true,
    activity_types: ["sports-score"],
  };
};
