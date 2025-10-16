// src/app/live/hooks/useNotifications.ts
"use client";

import { useEffect, useState } from "react";
import { LiveGame } from "@/app/live/types";

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      console.warn("Notifications not supported");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        // Show welcome notification
        showNotification(
          "🔔 Live Scores Notifications Enabled!",
          "You'll receive real-time updates when scores change.",
          "/ppsu.png"
        );
        
        // Store permission in localStorage
        localStorage.setItem("liveScoresNotifications", "granted");
      }
      
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  };

  const showNotification = (title: string, body: string, icon?: string) => {
    if (permission !== "granted") return;

    const options: NotificationOptions = {
      body,
      icon: icon || "/ppsu.png",
      badge: "/ppsu.png",
      vibrate: [200, 100, 200],
      tag: "live-score-update",
      renotify: true,
      requireInteraction: false,
      silent: false,
    };

    try {
      const notification = new Notification(title, options);
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
  };
};

export const notifyScoreUpdate = (game: LiveGame, oldScore: string, newScore: string) => {
  if (Notification.permission !== "granted") return;

  const title = `⚽🏀 Score Update: ${game.teamA.name} vs ${game.teamB.name}`;
  const body = `${oldScore} → ${newScore}\n${game.league} • ${game.status}`;
  
  const options: NotificationOptions = {
    body,
    icon: game.teamA.imageUrl || "/ppsu.png",
    badge: "/ppsu.png",
    vibrate: [200, 100, 200, 100, 200],
    tag: `game-${game.id}`,
    renotify: true,
    requireInteraction: false,
    data: { gameId: game.id, type: "score_update" },
  };

  const notification = new Notification(title, options);
  
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
};

export const notifyGameStart = (game: LiveGame) => {
  if (Notification.permission !== "granted") return;

  const sport = game.sport === "Football" ? "⚽" : "🏀";
  const title = `${sport} Match Started!`;
  const body = `${game.teamA.name} vs ${game.teamB.name}\n${game.league} • LIVE NOW`;
  
  const options: NotificationOptions = {
    body,
    icon: game.teamA.imageUrl || "/ppsu.png",
    badge: "/ppsu.png",
    vibrate: [300, 100, 300],
    tag: `game-start-${game.id}`,
    requireInteraction: true,
    data: { gameId: game.id, type: "game_start" },
  };

  new Notification(title, options);
};

export const notifyGameEnd = (game: LiveGame) => {
  if (Notification.permission !== "granted") return;

  const sport = game.sport === "Football" ? "⚽" : "🏀";
  const title = `${sport} Match Ended`;
  const body = `${game.teamA.name} ${game.score} ${game.teamB.name}\n${game.league} • FULLTIME`;
  
  const options: NotificationOptions = {
    body,
    icon: "/ppsu.png",
    badge: "/ppsu.png",
    vibrate: [100, 50, 100, 50, 100],
    tag: `game-end-${game.id}`,
    requireInteraction: false,
    data: { gameId: game.id, type: "game_end" },
  };

  new Notification(title, options);
};
