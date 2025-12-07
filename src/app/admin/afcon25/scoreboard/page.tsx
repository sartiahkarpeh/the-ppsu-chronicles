'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getMatches, getTeams, updateMatch, createMatchEvent, getMatchEvents, deleteMatchEvent, logAdminAction } from '@/lib/afcon/firestore';
import type { Match, Team, MatchEvent, EventType } from '@/types/afcon';

export default function ScoreboardAdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [eventForm, setEventForm] = useState<Partial<MatchEvent>>({
    minute: 0,
    type: 'goal',
    teamId: '',
    playerName: '',
    description: '',
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/login');
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedMatch && selectedMatch.id) {
      loadMatchEvents(selectedMatch.id);
    }
  }, [selectedMatch]);

  const fetchData = async () => {
    try {
      const [matches, teamsData] = await Promise.all([
        getMatches('live'),
        getTeams(),
      ]);
      setLiveMatches(matches);
      setTeams(teamsData);
      if (matches.length > 0 && !selectedMatch) {
        setSelectedMatch(matches[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const loadMatchEvents = async (matchId: string) => {
    try {
      const eventsData = await getMatchEvents(matchId);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const updateScore = async (field: 'homeScore' | 'awayScore' | 'minute', delta: number) => {
    if (!selectedMatch || !selectedMatch.id || !user) return;

    const newValue = Math.max(0, (selectedMatch[field] || 0) + delta);
    
    try {
      await updateMatch(selectedMatch.id, { [field]: newValue });
      setSelectedMatch({ ...selectedMatch, [field]: newValue });
      await logAdminAction(user.uid, user.email || 'unknown', 'update_score', 'matches', selectedMatch.id, { [field]: newValue });
    } catch (error) {
      console.error('Error updating score:', error);
      alert('Error updating score');
    }
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || !selectedMatch.id || !user) return;

    try {
      await createMatchEvent(selectedMatch.id, eventForm as Omit<MatchEvent, 'id'>, user.uid);
      await logAdminAction(user.uid, user.email || 'unknown', 'add_event', 'matches', selectedMatch.id, eventForm);
      alert('Event added successfully!');
      setEventForm({ minute: 0, type: 'goal', teamId: '', playerName: '', description: '' });
      loadMatchEvents(selectedMatch.id);
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Error adding event');
    }
  };

  const removeEvent = async (eventId: string) => {
    if (!selectedMatch || !selectedMatch.id || !user || !confirm('Delete this event?')) return;

    try {
      await deleteMatchEvent(selectedMatch.id, eventId);
      await logAdminAction(user.uid, user.email || 'unknown', 'delete_event', 'matches', selectedMatch.id, { eventId });
      loadMatchEvents(selectedMatch.id);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event');
    }
  };

  const setMatchStatus = async (status: 'live' | 'finished') => {
    if (!selectedMatch || !selectedMatch.id || !user) return;

    try {
      await updateMatch(selectedMatch.id, { status });
      await logAdminAction(user.uid, user.email || 'unknown', 'change_status', 'matches', selectedMatch.id, { status });
      alert(`Match marked as ${status}`);
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (!isAdmin) return null;

  const homeTeam = teams.find(t => t.id === selectedMatch?.homeTeamId);
  const awayTeam = teams.find(t => t.id === selectedMatch?.awayTeamId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Live Scoreboard
        </h1>

        {liveMatches.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No live matches at the moment. Set a match status to &quot;live&quot; in Match Management.
            </p>
          </div>
        ) : (
          <div className="grid gap-8">
            {/* Match Selector */}
            {liveMatches.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Select Match:
                </label>
                <select
                  value={selectedMatch?.id}
                  onChange={(e) => {
                    const match = liveMatches.find(m => m.id === e.target.value);
                    if (match) setSelectedMatch(match);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {liveMatches.map(match => {
                    const home = teams.find(t => t.id === match.homeTeamId);
                    const away = teams.find(t => t.id === match.awayTeamId);
                    return (
                      <option key={match.id} value={match.id}>
                        {home?.name} vs {away?.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Score Control */}
            {selectedMatch && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <div className="grid grid-cols-3 gap-8 items-center mb-8">
                  {/* Home Team */}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      {homeTeam?.name}
                    </h3>
                    <div className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
                      {selectedMatch.homeScore}
                    </div>
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => updateScore('homeScore', 1)}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => updateScore('homeScore', -1)}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-semibold"
                      >
                        -1
                      </button>
                    </div>
                  </div>

                  {/* Match Time */}
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                      {selectedMatch.minute}&apos;
                    </div>
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => updateScore('minute', 1)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => updateScore('minute', -1)}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                      >
                        -1
                      </button>
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      {awayTeam?.name}
                    </h3>
                    <div className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
                      {selectedMatch.awayScore}
                    </div>
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => updateScore('awayScore', 1)}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => updateScore('awayScore', -1)}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-semibold"
                      >
                        -1
                      </button>
                    </div>
                  </div>
                </div>

                {/* Match Actions */}
                <div className="flex justify-center space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setMatchStatus('finished')}
                    className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-900 font-semibold"
                  >
                    End Match
                  </button>
                </div>
              </div>
            )}

            {/* Add Event Form */}
            {selectedMatch && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Add Match Event
                </h3>
                <form onSubmit={addEvent} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Minute
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="120"
                      value={eventForm.minute}
                      onChange={(e) => setEventForm({ ...eventForm, minute: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Event Type
                    </label>
                    <select
                      required
                      value={eventForm.type}
                      onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as EventType })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="goal">⚽ Goal</option>
                      <option value="yellow">🟨 Yellow Card</option>
                      <option value="red">🟥 Red Card</option>
                      <option value="sub">🔄 Substitution</option>
                      <option value="var">📺 VAR</option>
                      <option value="injury">🏥 Injury</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Team
                    </label>
                    <select
                      required
                      value={eventForm.teamId}
                      onChange={(e) => setEventForm({ ...eventForm, teamId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select team</option>
                      <option value={selectedMatch.homeTeamId}>{homeTeam?.name}</option>
                      <option value={selectedMatch.awayTeamId}>{awayTeam?.name}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Player Name
                    </label>
                    <input
                      type="text"
                      value={eventForm.playerName}
                      onChange={(e) => setEventForm({ ...eventForm, playerName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Player name"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., Header from corner"
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
                    >
                      Add Event
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Events Timeline */}
            {selectedMatch && events.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Match Events
                </h3>
                <div className="space-y-2">
                  {events.map(event => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {event.type === 'goal' ? '⚽' :
                           event.type === 'yellow' ? '🟨' :
                           event.type === 'red' ? '🟥' :
                           event.type === 'sub' ? '🔄' :
                           event.type === 'var' ? '📺' : '🏥'}
                        </span>
                        <div>
                          <span className="font-bold text-gray-900 dark:text-white">{event.minute}&apos;</span>
                          <span className="text-gray-700 dark:text-gray-300 ml-2">
                            {event.playerName}
                          </span>
                          {event.description && (
                            <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                              - {event.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => event.id && removeEvent(event.id)}
                        className="text-red-600 hover:text-red-800 font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

