// src/app/live/hooks/useLiveUpdates.ts
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/firebase/config";
import { LiveGame } from "@/app/live/types";

export const useLiveUpdates = () => {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "liveGames"),
      orderBy("lastUpdated", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const gamesData: LiveGame[] = [];
        snapshot.forEach((doc) => {
          gamesData.push({
            id: doc.id,
            ...doc.data(),
          } as LiveGame);
        });
        setGames(gamesData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching live games:", err);
        setError("Failed to load live games");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { games, loading, error };
};
