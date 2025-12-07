// src/app/live/admin/page.tsx
"use client";

import { useState } from "react";
import { useLiveUpdates } from "@/app/live/hooks/useLiveUpdates";
import LiveCard from "@/app/live/components/LiveCard";
import LiveEditor from "@/app/live/components/LiveEditor";
import QuickScorecard from "@/app/live/components/QuickScorecard";
import AdminLiveStream from "@/app/live/components/AdminLiveStream";
import { Sport, LiveGame } from "@/app/live/types";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase/config";

export default function LiveAdminPage() {
  const { games, loading, error } = useLiveUpdates();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Sport>("Football");
  const [editingGame, setEditingGame] = useState<LiveGame | null>(null);
  const [scorecardGame, setScorecardGame] = useState<LiveGame | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddGame = (sport: Sport) => {
    setSelectedSport(sport);
    setEditingGame(null);
    setIsEditorOpen(true);
  };

  const handleEditGame = (game: LiveGame) => {
    setSelectedSport(game.sport);
    setEditingGame(game);
    setIsEditorOpen(true);
  };

  const handleEndMatch = async (gameId: string) => {
    if (!confirm("Are you sure you want to end this match?")) return;

    try {
      const gameRef = doc(db, "liveGames", gameId);
      await updateDoc(gameRef, {
        status: "FULLTIME",
      });
      showToast("Match ended successfully", "success");
    } catch (err) {
      console.error("Error ending match:", err);
      showToast("Failed to end match", "error");
    }
  };

  const handleDeleteMatch = async (gameId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this match? This action cannot be undone."
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "liveGames", gameId));
      showToast("Match deleted successfully", "success");
    } catch (err) {
      console.error("Error deleting match:", err);
      showToast("Failed to delete match", "error");
    }
  };

  const footballGames = games.filter((game) => game.sport === "Football");
  const basketballGames = games.filter((game) => game.sport === "Basketball");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            ⚙️ Live Scores Admin
          </h1>
          <p className="text-lg text-gray-600">
            Manage live matches and scores
          </p>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg animate-slide-in ${
              toast.type === "success"
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* Add Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <button
            onClick={() => handleAddGame("Football")}
            className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 font-semibold text-lg"
          >
            <span className="text-2xl">⚽</span>
            <span>➕ Add Football Live</span>
          </button>
          <button
            onClick={() => handleAddGame("Basketball")}
            className="flex items-center gap-3 bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 font-semibold text-lg"
          >
            <span className="text-2xl">🏀</span>
            <span>➕ Add Basketball Live</span>
          </button>
        </div>

        {/* Live Streaming Section */}
        <div className="mb-12">
          <AdminLiveStream 
            onStreamStart={(streamId) => showToast(`Stream started: ${streamId}`, "success")}
            onStreamEnd={() => showToast("Stream ended successfully", "success")}
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading matches...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* No Games Message */}
        {!loading && !error && games.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🏟️</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              No Live Matches
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by adding a new football or basketball match above.
            </p>
          </div>
        )}

        {/* Football Section */}
        {footballGames.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-green-500 rounded-full"></div>
              <h2 className="text-3xl font-bold text-gray-800">
                ⚽ Football Matches
              </h2>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                {footballGames.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {footballGames.map((game) => (
                <div key={game.id} className="relative">
                  <LiveCard
                    game={game}
                    onEdit={handleEditGame}
                    onEndMatch={handleEndMatch}
                    isAdmin
                  />
                  <button
                    onClick={() => handleDeleteMatch(game.id!)}
                    className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition z-10"
                    title="Delete match"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                  {game.status === "LIVE" && (
                    <button
                      onClick={() => setScorecardGame(game)}
                      className="absolute top-2 right-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-full shadow-lg transition z-10 text-sm font-semibold flex items-center gap-1"
                      title="Quick Scorecard"
                    >
                      <span>📊</span>
                      <span>Scorecard</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Basketball Section */}
        {basketballGames.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-orange-500 rounded-full"></div>
              <h2 className="text-3xl font-bold text-gray-800">
                🏀 Basketball Matches
              </h2>
              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                {basketballGames.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {basketballGames.map((game) => (
                <div key={game.id} className="relative">
                  <LiveCard
                    game={game}
                    onEdit={handleEditGame}
                    onEndMatch={handleEndMatch}
                    isAdmin
                  />
                  <button
                    onClick={() => handleDeleteMatch(game.id!)}
                    className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition z-10"
                    title="Delete match"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                  {game.status === "LIVE" && (
                    <button
                      onClick={() => setScorecardGame(game)}
                      className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-full shadow-lg transition z-10 text-sm font-semibold flex items-center gap-1"
                      title="Quick Scorecard"
                    >
                      <span>📊</span>
                      <span>Scorecard</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Instructions */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Guide</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Click &quot;Add Football Live&quot; or &quot;Add Basketball Live&quot; to create a new match</li>
            <li>• Use &quot;📊 Scorecard&quot; button on LIVE matches for quick score updates with live timer</li>
            <li>• Use &quot;Edit&quot; button on any card to update match details</li>
            <li>• Use &quot;End Match&quot; to mark a match as finished</li>
            <li>• Click the trash icon to permanently delete a match</li>
            <li>• All changes update in real-time on the live page</li>
          </ul>
        </div>
      </div>

      {/* Live Editor Modal */}
      <LiveEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingGame(null);
        }}
        sport={selectedSport}
        game={editingGame}
      />

      {/* Quick Scorecard Modal */}
      {scorecardGame && (
        <QuickScorecard
          game={scorecardGame}
          onClose={() => setScorecardGame(null)}
        />
      )}
    </div>
  );
}
