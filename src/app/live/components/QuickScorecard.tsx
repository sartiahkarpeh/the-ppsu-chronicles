// src/app/live/components/QuickScorecard.tsx
"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import { LiveGame } from "@/app/live/types";

interface QuickScorecardProps {
  game: LiveGame;
  onClose: () => void;
}

export default function QuickScorecard({ game, onClose }: QuickScorecardProps) {
  const isFootball = game.sport === "Football";
  
  // Football state
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  
  // Basketball state
  const [teamAPoints, setTeamAPoints] = useState(0);
  const [teamBPoints, setTeamBPoints] = useState(0);
  
  // Timer state
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [quarter, setQuarter] = useState(1);
  const [half, setHalf] = useState(1);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Parse existing score
    if (game.score) {
      const scores = game.score.split("-").map(s => parseInt(s.trim()) || 0);
      if (isFootball) {
        setTeamAScore(scores[0] || 0);
        setTeamBScore(scores[1] || 0);
      } else {
        setTeamAPoints(scores[0] || 0);
        setTeamBPoints(scores[1] || 0);
      }
    }
    
    // Parse existing time
    if (game.time) {
      if (isFootball) {
        const match = game.time.match(/(\d+)[':]?(\d*)/);
        if (match) {
          setMinutes(parseInt(match[1]) || 0);
          setSeconds(parseInt(match[2]) || 0);
        }
      } else {
        const quarterMatch = game.time.match(/Q(\d+)/);
        const timeMatch = game.time.match(/(\d+):(\d+)/);
        if (quarterMatch) setQuarter(parseInt(quarterMatch[1]) || 1);
        if (timeMatch) {
          setMinutes(parseInt(timeMatch[1]) || 0);
          setSeconds(parseInt(timeMatch[2]) || 0);
        }
      }
    }
  }, [game, isFootball]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning && game.status === "LIVE") {
      interval = setInterval(() => {
        if (isFootball) {
          // Football: count up
          setSeconds(prev => {
            if (prev >= 59) {
              setMinutes(m => m + 1);
              return 0;
            }
            return prev + 1;
          });
        } else {
          // Basketball: count down
          setSeconds(prev => {
            if (prev <= 0) {
              if (minutes <= 0) {
                setIsTimerRunning(false);
                return 0;
              }
              setMinutes(m => m - 1);
              return 59;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isTimerRunning, game.status, isFootball, minutes]);

  const handleQuickSave = async () => {
    if (!game.id || saving) return;
    
    setSaving(true);
    try {
      const scoreStr = isFootball 
        ? `${teamAScore} - ${teamBScore}`
        : `${teamAPoints} - ${teamBPoints}`;
      
      const timeStr = isFootball
        ? `${minutes}'${seconds > 0 ? seconds.toString().padStart(2, '0') : ''}`
        : `Q${quarter} ${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      // Calculate elapsed seconds for pausedAt
      const elapsedSeconds = isFootball 
        ? (minutes * 60) + seconds
        : ((12 * 60) - ((minutes * 60) + seconds)); // For basketball, store elapsed from start
      
      const updateData: any = {
        score: scoreStr,
        time: timeStr,
        lastUpdated: serverTimestamp(),
        pausedAt: elapsedSeconds,
      };
      
      // Set startTime if this is the first save and timer is running
      if (!game.startTime && isTimerRunning) {
        updateData.startTime = serverTimestamp();
      }
      
      await updateDoc(doc(db, "liveGames", game.id), updateData);
      
      // Don't close, keep updating
    } catch (error) {
      console.error("Error updating score:", error);
      alert("Failed to update score");
    } finally {
      setSaving(false);
    }
  };

  // Auto-save every 5 seconds when timer is running
  useEffect(() => {
    if (isTimerRunning) {
      const autoSaveInterval = setInterval(handleQuickSave, 5000);
      return () => clearInterval(autoSaveInterval);
    }
  }, [isTimerRunning, teamAScore, teamBScore, teamAPoints, teamBPoints, minutes, seconds, quarter]);

  const handleScoreChange = (team: "A" | "B", change: number, isFootball: boolean) => {
    if (isFootball) {
      if (team === "A") setTeamAScore(prev => Math.max(0, prev + change));
      else setTeamBScore(prev => Math.max(0, prev + change));
    } else {
      if (team === "A") setTeamAPoints(prev => Math.max(0, prev + change));
      else setTeamBPoints(prev => Math.max(0, prev + change));
    }
    handleQuickSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className={`bg-gradient-to-br ${isFootball ? 'from-green-50 to-green-100' : 'from-orange-50 to-orange-100'} rounded-2xl shadow-2xl max-w-4xl w-full p-6`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">
              {isFootball ? "⚽ Football" : "🏀 Basketball"} Scorecard
            </h2>
            <p className="text-sm text-gray-600">{game.league} • {game.location}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Scoreboard */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 items-center mb-6">
            {/* Team A */}
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-3">
                {game.teamA.imageUrl ? (
                  <img
                    src={game.teamA.imageUrl}
                    alt={game.teamA.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400">
                      {game.teamA.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="font-bold text-lg text-gray-800">{game.teamA.name}</h3>
            </div>

            {/* Score Display */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className={`text-6xl font-bold ${isFootball ? 'text-green-600' : 'text-orange-600'}`}>
                  {isFootball ? teamAScore : teamAPoints}
                </div>
                <div className="text-4xl font-bold text-gray-400">-</div>
                <div className={`text-6xl font-bold ${isFootball ? 'text-green-600' : 'text-orange-600'}`}>
                  {isFootball ? teamBScore : teamBPoints}
                </div>
              </div>
              
              {/* Timer Display */}
              <div className="bg-gray-900 text-white rounded-lg py-3 px-6 mb-3">
                <div className="text-3xl font-mono font-bold">
                  {isFootball 
                    ? `${minutes}'${seconds > 0 ? seconds.toString().padStart(2, '0') : ''}`
                    : `${minutes}:${seconds.toString().padStart(2, '0')}`
                  }
                </div>
                {!isFootball && (
                  <div className="text-sm text-gray-300 mt-1">Quarter {quarter}</div>
                )}
              </div>
              
              {/* Timer Controls */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    isTimerRunning 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {isTimerRunning ? '⏸ Pause' : '▶ Start'}
                </button>
                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setMinutes(0);
                    setSeconds(0);
                  }}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold"
                >
                  🔄 Reset
                </button>
              </div>
            </div>

            {/* Team B */}
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-3">
                {game.teamB.imageUrl ? (
                  <img
                    src={game.teamB.imageUrl}
                    alt={game.teamB.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400">
                      {game.teamB.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="font-bold text-lg text-gray-800">{game.teamB.name}</h3>
            </div>
          </div>

          {/* Score Controls */}
          <div className="grid grid-cols-2 gap-6">
            {/* Team A Controls */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3 text-center">{game.teamA.name}</h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {isFootball ? (
                  <>
                    <button
                      onClick={() => handleScoreChange("A", 1, true)}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg"
                    >
                      +1 Goal
                    </button>
                    <button
                      onClick={() => handleScoreChange("A", -1, true)}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                    >
                      -1
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleScoreChange("A", 1, false)}
                      className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => handleScoreChange("A", 2, false)}
                      className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold"
                    >
                      +2
                    </button>
                    <button
                      onClick={() => handleScoreChange("A", 3, false)}
                      className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold"
                    >
                      +3
                    </button>
                    <button
                      onClick={() => handleScoreChange("A", -1, false)}
                      className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                    >
                      -1
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Team B Controls */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3 text-center">{game.teamB.name}</h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {isFootball ? (
                  <>
                    <button
                      onClick={() => handleScoreChange("B", 1, true)}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg"
                    >
                      +1 Goal
                    </button>
                    <button
                      onClick={() => handleScoreChange("B", -1, true)}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                    >
                      -1
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleScoreChange("B", 1, false)}
                      className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => handleScoreChange("B", 2, false)}
                      className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold"
                    >
                      +2
                    </button>
                    <button
                      onClick={() => handleScoreChange("B", 3, false)}
                      className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold"
                    >
                      +3
                    </button>
                    <button
                      onClick={() => handleScoreChange("B", -1, false)}
                      className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                    >
                      -1
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Basketball Quarter Controls */}
          {!isFootball && (
            <div className="mt-6 flex gap-2 justify-center">
              <button
                onClick={() => setQuarter(Math.max(1, quarter - 1))}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                ← Previous Quarter
              </button>
              <button
                onClick={() => setQuarter(Math.min(4, quarter + 1))}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Next Quarter →
              </button>
            </div>
          )}

          {/* Football Half Controls */}
          {isFootball && (
            <div className="mt-6 flex gap-2 justify-center">
              <button
                onClick={() => {
                  setHalf(1);
                  setMinutes(0);
                  setSeconds(0);
                }}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  half === 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                1st Half
              </button>
              <button
                onClick={() => {
                  setHalf(2);
                  setMinutes(45);
                  setSeconds(0);
                }}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  half === 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                2nd Half
              </button>
            </div>
          )}
        </div>

        {/* Status Info */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            {isTimerRunning && (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="font-semibold">Auto-saving every 5 seconds</span>
              </>
            )}
          </div>
          <button
            onClick={handleQuickSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? "Saving..." : "💾 Save Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
