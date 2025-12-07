'use client';

import React from 'react';
import type { GroupStandings } from '@/types/afcon';

interface StandingsTableProps {
  standings: GroupStandings;
}

export default function StandingsTable({ standings }: StandingsTableProps) {
  // Ensure teams array exists
  const teams = standings.teams || [];

  // Sort teams by points (descending), then goal difference, then goals for
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  return (
    <div className="bg-white dark:bg-white/5 backdrop-blur-md rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-lg">
      <div className="bg-gradient-to-r from-black to-gray-900 px-6 py-4 flex justify-between items-center">
        <h3 className="font-display font-bold text-xl text-white uppercase tracking-wider">{standings.groupName}</h3>
        <span className="text-white/60 text-xs font-mono">GROUP STAGE</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-black/20">
            <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-white/5">
              <th className="px-4 py-3 text-left font-semibold w-12">#</th>
              <th className="px-4 py-3 text-left font-semibold">Team</th>
              <th className="px-2 py-3 text-center font-semibold w-10" title="Played">P</th>
              <th className="px-2 py-3 text-center font-semibold w-10" title="Won">W</th>
              <th className="px-2 py-3 text-center font-semibold w-10" title="Drawn">D</th>
              <th className="px-2 py-3 text-center font-semibold w-10" title="Lost">L</th>
              <th className="px-2 py-3 text-center font-semibold w-10 hidden sm:table-cell" title="Goals For">GF</th>
              <th className="px-2 py-3 text-center font-semibold w-10 hidden sm:table-cell" title="Goals Against">GA</th>
              <th className="px-2 py-3 text-center font-semibold w-10" title="Goal Difference">GD</th>
              <th className="px-4 py-3 text-center font-bold text-afcon-black dark:text-white w-16" title="Points">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {sortedTeams.map((team, index) => {
              const isQualified = index < 2; // Top 2 teams qualify

              return (
                <tr
                  key={team.teamId}
                  className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isQualified
                        ? 'bg-afcon-gold text-afcon-black'
                        : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                        }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white group-hover:text-afcon-gold transition-colors">
                    {team.teamName}
                  </td>
                  <td className="px-2 py-3 text-center text-gray-600 dark:text-gray-400">
                    {team.played}
                  </td>
                  <td className="px-2 py-3 text-center text-gray-600 dark:text-gray-400">
                    {team.won}
                  </td>
                  <td className="px-2 py-3 text-center text-gray-600 dark:text-gray-400">
                    {team.drawn}
                  </td>
                  <td className="px-2 py-3 text-center text-gray-600 dark:text-gray-400">
                    {team.lost}
                  </td>
                  <td className="px-2 py-3 text-center text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {team.goalsFor}
                  </td>
                  <td className="px-2 py-3 text-center text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {team.goalsAgainst}
                  </td>
                  <td className="px-2 py-3 text-center font-semibold text-gray-900 dark:text-white">
                    {team.goalDifference > 0 ? '+' : ''}
                    {team.goalDifference}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-lg text-gray-900 dark:text-white group-hover:text-afcon-gold transition-colors">
                    {team.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-50 dark:bg-black/20 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-afcon-gold rounded-full"></span>
          <span>Qualification for Round of 16</span>
        </div>
      </div>
    </div>
  );
}
