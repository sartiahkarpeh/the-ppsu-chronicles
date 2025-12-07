'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getMatches, getTeams, createMatch, updateMatch, deleteMatch, logAdminAction } from '@/lib/afcon/firestore';
import type { Match, Team, MatchStatus } from '@/types/afcon';

export default function MatchesAdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [formData, setFormData] = useState<Partial<Match>>({
    homeTeamId: '',
    awayTeamId: '',
    kickoffUTC: '',
    venue: '',
    stage: 'Group A',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
    minute: 0,
    youtubeLiveId: '',
    streamingUrl: '',
    autoImport: false,
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

  const fetchData = async () => {
    try {
      const [matchesData, teamsData] = await Promise.all([
        getMatches(),
        getTeams(),
      ]);
      setMatches(matchesData);
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      if (editingMatch && editingMatch.id) {
        // Update existing match
        await updateMatch(editingMatch.id, formData);
        await logAdminAction(
          user.uid,
          user.email || 'unknown',
          'update',
          'matches',
          editingMatch.id,
          formData
        );
        alert('Match updated successfully!');
      } else {
        // Create new match
        const matchId = await createMatch(formData as Omit<Match, 'id'>, user.uid);
        await logAdminAction(
          user.uid,
          user.email || 'unknown',
          'create',
          'matches',
          matchId,
          formData
        );
        alert('Match created successfully!');
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving match:', error);
      alert('Error saving match');
    }
  };

  const handleEdit = (match: Match) => {
    setEditingMatch(match);
    setFormData(match);
    setIsFormOpen(true);
  };

  const handleDelete = async (matchId: string) => {
    if (!user || !confirm('Are you sure you want to delete this match?')) return;

    try {
      await deleteMatch(matchId);
      await logAdminAction(
        user.uid,
        user.email || 'unknown',
        'delete',
        'matches',
        matchId
      );
      alert('Match deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('Error deleting match');
    }
  };

  const resetForm = () => {
    setFormData({
      homeTeamId: '',
      awayTeamId: '',
      kickoffUTC: '',
      venue: '',
      stage: 'Group A',
      status: 'scheduled',
      homeScore: 0,
      awayScore: 0,
      minute: 0,
      youtubeLiveId: '',
      streamingUrl: '',
      autoImport: false,
    });
    setEditingMatch(null);
    setIsFormOpen(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Manage Matches
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {matches.length} total matches
            </p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            + Add Match
          </button>
        </div>

        {/* Match Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {editingMatch ? 'Edit Match' : 'Add New Match'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Home Team *
                    </label>
                    <select
                      required
                      value={formData.homeTeamId}
                      onChange={(e) => setFormData({ ...formData, homeTeamId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select team</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Away Team *
                    </label>
                    <select
                      required
                      value={formData.awayTeamId}
                      onChange={(e) => setFormData({ ...formData, awayTeamId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select team</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Kickoff Time (UTC) *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.kickoffUTC ? formData.kickoffUTC.slice(0, 16) : ''}
                    onChange={(e) => setFormData({ ...formData, kickoffUTC: new Date(e.target.value).toISOString() })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Venue *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., National Stadium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Stage *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.stage}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., Group A"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Status *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as MatchStatus })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="live">Live</option>
                      <option value="finished">Finished</option>
                      <option value="postponed">Postponed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Home Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.homeScore}
                      onChange={(e) => setFormData({ ...formData, homeScore: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Away Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.awayScore}
                      onChange={(e) => setFormData({ ...formData, awayScore: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    YouTube Live ID (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.youtubeLiveId}
                    onChange={(e) => setFormData({ ...formData, youtubeLiveId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="11-character YouTube video ID"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoImport"
                    checked={formData.autoImport}
                    onChange={(e) => setFormData({ ...formData, autoImport: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="autoImport" className="text-sm text-gray-700 dark:text-gray-300">
                    Allow webhook auto-updates for this match
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingMatch ? 'Update Match' : 'Create Match'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Matches List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Match</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Venue</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Score</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {matches.map(match => {
                const homeTeam = teams.find(t => t.id === match.homeTeamId);
                const awayTeam = teams.find(t => t.id === match.awayTeamId);
                
                return (
                  <tr key={match.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-semibold">
                        {homeTeam?.name || 'TBD'} vs {awayTeam?.name || 'TBD'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{match.stage}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{match.venue}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        match.status === 'live' ? 'bg-red-600 text-white' :
                        match.status === 'scheduled' ? 'bg-blue-600 text-white' :
                        match.status === 'finished' ? 'bg-gray-600 text-white' :
                        'bg-yellow-600 text-white'
                      }`}>
                        {match.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-semibold">
                      {match.status === 'scheduled' ? '-' : `${match.homeScore} - ${match.awayScore}`}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(match)}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => match.id && handleDelete(match.id)}
                        className="text-red-600 hover:text-red-800 font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {matches.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No matches yet. Click &quot;Add Match&quot; to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

