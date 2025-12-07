'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import StandingsTable from '@/components/afcon/StandingsTable';
import { Trophy, Users } from 'lucide-react';
import SectionHeader from '@/components/afcon/SectionHeader';
import { subscribeToStandings, getTeam } from '@/lib/afcon/firestore';
import type { GroupStandings, Team } from '@/types/afcon';

export default function StandingsPage() {
  const [standings, setStandings] = useState<GroupStandings[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToStandings(async (data) => {
      // Sort groups by name (A, B, C, etc.)
      const sorted = data.sort((a, b) => a.groupName.localeCompare(b.groupName));
      setStandings(sorted);

      // Fetch full team data for all teams
      const teamIds = new Set<string>();
      data.forEach(group => {
        group.teams.forEach(team => teamIds.add(team.teamId));
      });

      const teamsData: Record<string, Team> = {};
      await Promise.all(
        Array.from(teamIds).map(async (id) => {
          const team = await getTeam(id);
          if (team) teamsData[id] = team;
        })
      );

      setTeams(teamsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-afcon-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-afcon-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-afcon-black py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/afcon25"
            className="text-afcon-green dark:text-afcon-gold hover:underline mb-4 inline-block font-bold"
          >
            ← Back to AFCON 2025
          </Link>
          <SectionHeader
            title="Group Standings"
            subtitle="Live tournament standings with full squad rosters"
          />
        </div>

        {/* Standings Tables with Squad Lists */}
        {standings.length > 0 ? (
          <div className="space-y-12">
            {standings.map(group => (
              <div key={group.id || group.groupId} className="space-y-6">
                {/* Standings Table */}
                <StandingsTable standings={group} />

                {/* Squad Lists for this Group */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {group.teams
                    .slice() // Create copy
                    .sort((a, b) => {
                      if (b.points !== a.points) return b.points - a.points;
                      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
                      return b.goalsFor - a.goalsFor;
                    })
                    .map(standingTeam => {
                      const fullTeam = teams[standingTeam.teamId];
                      if (!fullTeam) return null;

                      return (
                        <div
                          key={standingTeam.teamId}
                          className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden hover:border-afcon-gold transition-colors"
                        >
                          {/* Team Header */}
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-white/10 dark:to-white/5 px-4 py-3 flex items-center gap-3 border-b border-gray-200 dark:border-white/10">
                            {fullTeam.flag_url && (
                              <div className="w-10 h-10 flex items-center justify-center">
                                <img
                                  src={fullTeam.flag_url}
                                  alt={`${fullTeam.name} flag`}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 dark:text-white">{fullTeam.name}</h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {standingTeam.points} pts • {standingTeam.played} games
                              </p>
                            </div>
                          </div>

                          {/* Squad List */}
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Users className="w-4 h-4 text-afcon-green dark:text-afcon-gold" />
                              <h5 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                Squad ({fullTeam.players?.length || 0})
                              </h5>
                            </div>

                            {fullTeam.players && fullTeam.players.length > 0 ? (
                              <ul className="space-y-2">
                                {fullTeam.players.map((player, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                                  >
                                    <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-white/10 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400">
                                      {idx + 1}
                                    </span>
                                    <span>{player}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                No squad members added yet
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
            <div className="mb-6 inline-flex items-center justify-center w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Trophy className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No Standings Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Group standings will appear once matches are completed
            </p>
          </div>
        )}

        {/* Legend */}
        {standings.length > 0 && (
          <div className="mt-12 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
              Table Key
            </h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="space-y-2">
                <p><strong className="text-afcon-black dark:text-white">P</strong> - Played</p>
                <p><strong className="text-afcon-black dark:text-white">W</strong> - Won</p>
                <p><strong className="text-afcon-black dark:text-white">D</strong> - Drawn</p>
                <p><strong className="text-afcon-black dark:text-white">L</strong> - Lost</p>
              </div>
              <div className="space-y-2">
                <p><strong className="text-afcon-black dark:text-white">GF</strong> - Goals For</p>
                <p><strong className="text-afcon-black dark:text-white">GA</strong> - Goals Against</p>
                <p><strong className="text-afcon-black dark:text-white">GD</strong> - Goal Difference</p>
                <p><strong className="text-afcon-black dark:text-white">Pts</strong> - Points</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
