'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface LiveScoreProps {
  match: any;
}

export default function LiveScore({ match }: LiveScoreProps) {
  const [currentMatch, setCurrentMatch] = useState(match);
  const [isLoading, setIsLoading] = useState(false);
  const [liveData, setLiveData] = useState<any>(null);
  const [isLiveFeed, setIsLiveFeed] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Initial fetch
    fetchMatchData();

    // Refresh match data every 30 seconds if live
    const interval = setInterval(() => {
      if (currentMatch.status === 'live') {
        fetchMatchData();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [match.id, currentMatch.status]);

  const fetchMatchData = async () => {
    setIsLoading(true);
    try {
      // First, get the latest match data from Firestore
      const matchDoc = await getDoc(doc(db, 'prediction_matches', match.id));
      if (matchDoc.exists()) {
        const matchData: any = { id: matchDoc.id, ...matchDoc.data() };
        setCurrentMatch(matchData);

        // If match has an API fixture ID and is live, fetch live score
        if (matchData.apiFixtureId && matchData.status === 'live') {
          await fetchLiveScore(matchData.apiFixtureId, matchData.id);
        }
      }
    } catch (error) {
      console.error('Error fetching match data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLiveScore = async (fixtureId: string, matchId: string) => {
    try {
      const response = await fetch('/api/livescore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fixtureId }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setLiveData(result.data);
        setIsLiveFeed(true);
        setLastUpdate(new Date());

        // Update Firestore with live scores (optional - for persistence)
        if (result.data.homeScore !== null && result.data.awayScore !== null) {
          await updateDoc(doc(db, 'prediction_matches', matchId), {
            homeScore: result.data.homeScore,
            awayScore: result.data.awayScore,
            lastUpdated: new Date().toISOString(),
          });
        }
      } else {
        // Fallback to Firestore data
        setIsLiveFeed(false);
      }
    } catch (error) {
      console.error('Error fetching live score:', error);
      setIsLiveFeed(false);
    }
  };

  const hasScore = currentMatch.homeScore !== null && currentMatch.homeScore !== undefined;
  const displayData = isLiveFeed && liveData ? liveData : currentMatch;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8 mx-4">
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-3 sm:px-4 py-2 rounded-full mb-4 text-sm sm:text-base">
          <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-red-500"></span>
          </span>
          <span className="font-semibold">
            {isLiveFeed && liveData ? (
              <>LIVE {liveData.elapsed ? `${liveData.elapsed}'` : ''}</>
            ) : (
              currentMatch.status.toUpperCase()
            )}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {isLiveFeed ? 'Live Match' : 'Match Status'}
        </h2>
        {isLiveFeed && (
          <p className="text-xs text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      <div className="space-y-5 sm:space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-red-50 rounded-xl p-5 sm:p-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="text-center flex-1 min-w-0">
              {(isLiveFeed ? liveData.homeTeam.logo : currentMatch.homeTeam?.logoUrl) && (
                <img 
                  src={isLiveFeed ? liveData.homeTeam.logo : currentMatch.homeTeam.logoUrl} 
                  alt={isLiveFeed ? liveData.homeTeam.name : currentMatch.homeTeam.name} 
                  className="h-14 w-14 sm:h-20 sm:w-20 object-contain mx-auto mb-2 sm:mb-3 flex-shrink-0" 
                />
              )}
              <h3 className="font-bold text-sm sm:text-xl text-gray-900 break-words px-1">
                {isLiveFeed ? liveData.homeTeam.name : currentMatch.homeTeam?.name}
              </h3>
              {hasScore && (
                <div className="text-3xl sm:text-5xl font-bold text-indigo-600 mt-3 sm:mt-4">
                  {isLiveFeed ? liveData.homeScore : currentMatch.homeScore}
                </div>
              )}
            </div>
            
            <div className="px-2 sm:px-6 text-center flex-shrink-0">
              {!hasScore && <div className="text-xl sm:text-2xl font-bold text-gray-400 mb-2">VS</div>}
              {hasScore && <div className="text-3xl sm:text-4xl font-bold text-gray-400">:</div>}
              <div className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2 break-words">
                {isLiveFeed ? liveData.venue : currentMatch.venue}
              </div>
            </div>
            
            <div className="text-center flex-1 min-w-0">
              {(isLiveFeed ? liveData.awayTeam.logo : currentMatch.awayTeam?.logoUrl) && (
                <img 
                  src={isLiveFeed ? liveData.awayTeam.logo : currentMatch.awayTeam.logoUrl} 
                  alt={isLiveFeed ? liveData.awayTeam.name : currentMatch.awayTeam.name} 
                  className="h-14 w-14 sm:h-20 sm:w-20 object-contain mx-auto mb-2 sm:mb-3 flex-shrink-0" 
                />
              )}
              <h3 className="font-bold text-sm sm:text-xl text-gray-900 break-words px-1">
                {isLiveFeed ? liveData.awayTeam.name : currentMatch.awayTeam?.name}
              </h3>
              {hasScore && (
                <div className="text-3xl sm:text-5xl font-bold text-red-600 mt-3 sm:mt-4">
                  {isLiveFeed ? liveData.awayScore : currentMatch.awayScore}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Match Events - Show if live feed has events */}
        {isLiveFeed && liveData.events && liveData.events.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
            <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-3">Match Events</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {liveData.events.map((event: any, index: number) => (
                <div key={index} className="flex items-center gap-3 text-sm p-2 hover:bg-gray-50 rounded">
                  <span className="font-bold text-indigo-600 w-8">{event.time.elapsed}'</span>
                  <span className="text-lg">{event.type === 'Goal' ? '⚽' : event.type === 'Card' ? (event.detail === 'Yellow Card' ? '🟨' : '🟥') : '📋'}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{event.player?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{event.detail}</p>
                  </div>
                  <span className="text-xs text-gray-500">{event.team?.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-600">Match Date:</p>
          <p className="font-bold text-base sm:text-lg text-gray-900 break-words">
            {new Date(currentMatch.matchDateTime).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={fetchMatchData}
            className="text-sm text-indigo-600 hover:text-indigo-700 active:text-indigo-800 font-medium touch-manipulation py-2 px-4 disabled:opacity-50"
            disabled={isLoading}
          >
            🔄 {isLoading ? 'Refreshing...' : 'Refresh Score'}
          </button>
          {isLiveFeed && (
            <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live Feed Active
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 sm:mt-8 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-blue-800 text-center">
          💡 {isLiveFeed ? 'Scores update automatically from live feed' : 'Winners will be announced after the match concludes!'}
        </p>
      </div>
    </div>
  );
}
