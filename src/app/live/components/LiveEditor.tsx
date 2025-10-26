// src/app/live/components/LiveEditor.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { LiveEditorProps, LiveGame, MatchStatus } from "@/app/live/types";
import { db, storage } from "@/firebase/config";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function LiveEditor({
  isOpen,
  onClose,
  sport,
  game,
}: LiveEditorProps) {
  const [formData, setFormData] = useState({
    teamAName: "",
    teamBName: "",
    score: "",
    time: "",
    status: "LIVE" as MatchStatus,
    league: "",
    location: "",
    description: "",
  });

  const [teamAImage, setTeamAImage] = useState<File | null>(null);
  const [teamBImage, setTeamBImage] = useState<File | null>(null);
  const [teamAPreview, setTeamAPreview] = useState<string>("");
  const [teamBPreview, setTeamBPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (game) {
      setFormData({
        teamAName: game.teamA.name,
        teamBName: game.teamB.name,
        score: game.score,
        time: game.time,
        status: game.status,
        league: game.league,
        location: game.location,
        description: game.description || "",
      });
      setTeamAPreview(game.teamA.imageUrl);
      setTeamBPreview(game.teamB.imageUrl);
    } else {
      resetForm();
    }
  }, [game, isOpen]);

  const resetForm = () => {
    setFormData({
      teamAName: "",
      teamBName: "",
      score: sport === "Football" ? "0 - 0" : "0 - 0",
      time: sport === "Football" ? "0'" : "Q1 0:00",
      status: "LIVE",
      league: "",
      location: "",
      description: "",
    });
    setTeamAImage(null);
    setTeamBImage(null);
    setTeamAPreview("");
    setTeamBPreview("");
    setError("");
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    team: "A" | "B"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (team === "A") {
        setTeamAImage(file);
        setTeamAPreview(URL.createObjectURL(file));
      } else {
        setTeamBImage(file);
        setTeamBPreview(URL.createObjectURL(file));
      }
    }
  };

  const uploadImage = async (
    file: File,
    matchId: string,
    team: "A" | "B"
  ): Promise<string> => {
    const fileName = `${team}.${file.name.split(".").pop()}`;
    const storageRef = ref(storage, `teamImages/${matchId}/${fileName}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate required fields
      if (
        !formData.teamAName ||
        !formData.teamBName ||
        !formData.league ||
        !formData.location
      ) {
        throw new Error("Please fill in all required fields");
      }

      if (!game && (!teamAImage || !teamBImage)) {
        throw new Error("Please upload images for both teams");
      }

      let teamAImageUrl = teamAPreview;
      let teamBImageUrl = teamBPreview;

      if (game && game.id) {
        // Update existing game
        if (teamAImage) {
          teamAImageUrl = await uploadImage(teamAImage, game.id, "A");
        }
        if (teamBImage) {
          teamBImageUrl = await uploadImage(teamBImage, game.id, "B");
        }

        const gameRef = doc(db, "liveGames", game.id);
        const updateData: any = {
          sport,
          teamA: {
            name: formData.teamAName,
            imageUrl: teamAImageUrl,
          },
          teamB: {
            name: formData.teamBName,
            imageUrl: teamBImageUrl,
          },
          score: formData.score,
          time: formData.time,
          status: formData.status,
          league: formData.league,
          location: formData.location,
          description: formData.description,
          lastUpdated: serverTimestamp(),
        };

        // Set startTime if changing to LIVE status
        if (formData.status === "LIVE" && game.status !== "LIVE") {
          updateData.startTime = serverTimestamp();
          updateData.pausedAt = 0;
        }

        await updateDoc(gameRef, updateData);
      } else {
        // Create new game
        const newGameData: any = {
          sport,
          teamA: { name: formData.teamAName, imageUrl: "" },
          teamB: { name: formData.teamBName, imageUrl: "" },
          score: formData.score,
          time: formData.time,
          status: formData.status,
          league: formData.league,
          location: formData.location,
          description: formData.description,
          lastUpdated: serverTimestamp(),
        };

        // Set startTime if creating a LIVE match
        if (formData.status === "LIVE") {
          newGameData.startTime = serverTimestamp();
          newGameData.pausedAt = 0;
        }

        const docRef = await addDoc(collection(db, "liveGames"), newGameData);

        // Upload images with the new document ID
        teamAImageUrl = await uploadImage(teamAImage!, docRef.id, "A");
        teamBImageUrl = await uploadImage(teamBImage!, docRef.id, "B");

        // Update with image URLs
        await updateDoc(docRef, {
          "teamA.imageUrl": teamAImageUrl,
          "teamB.imageUrl": teamBImageUrl,
        });
      }

      resetForm();
      onClose();
    } catch (err: any) {
      console.error("Error saving game:", err);
      setError(err.message || "Failed to save game");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {game ? "Edit" : "Add"} {sport} Live Match
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Team A Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-gray-700">Team A</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team A Name *
              </label>
              <input
                type="text"
                required
                value={formData.teamAName}
                onChange={(e) =>
                  setFormData({ ...formData, teamAName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter team name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team A Logo *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, "A")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required={!game}
              />
              {teamAPreview && (
                <div className="mt-2">
                  <img
                    src={teamAPreview}
                    alt="Team A Preview"
                    className="h-20 w-20 object-contain border rounded"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Team B Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-gray-700">Team B</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team B Name *
              </label>
              <input
                type="text"
                required
                value={formData.teamBName}
                onChange={(e) =>
                  setFormData({ ...formData, teamBName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter team name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team B Logo *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, "B")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required={!game}
              />
              {teamBPreview && (
                <div className="mt-2">
                  <img
                    src={teamBPreview}
                    alt="Team B Preview"
                    className="h-20 w-20 object-contain border rounded"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Match Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Score *
              </label>
              <input
                type="text"
                required
                value={formData.score}
                onChange={(e) =>
                  setFormData({ ...formData, score: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={sport === "Football" ? "0 - 0" : "0 - 0"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time *
              </label>
              <input
                type="text"
                required
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={sport === "Football" ? "45'" : "Q1 12:00"}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as MatchStatus,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="LIVE">LIVE</option>
              <option value="HALFTIME">HALFTIME</option>
              <option value="FULLTIME">FULLTIME</option>
              <option value="UPCOMING">UPCOMING</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              League / Tournament *
            </label>
            <input
              type="text"
              required
              value={formData.league}
              onChange={(e) =>
                setFormData({ ...formData, league: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Premier League, NBA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location / Stadium *
            </label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Old Trafford, Madison Square Garden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description / Commentary
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional match commentary or notes"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loading ? "Saving..." : game ? "Update Match" : "Add Match"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
