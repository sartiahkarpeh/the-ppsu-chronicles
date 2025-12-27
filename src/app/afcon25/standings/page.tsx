'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Users, Clock } from 'lucide-react';
import StandingsTable from '@/components/afcon/StandingsTable';
import SectionHeader from '@/components/afcon/SectionHeader';
import { subscribeToStandings, getTeam } from '@/lib/afcon/firestore';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { GroupStandings, Team } from '@/types/afcon';

const GROUPS = ['A', 'B'];

export default function StandingsPage() {
  const [standings, setStandings] = useState<GroupStandings[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawPublished, setIsDrawPublished] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  // Check draw publish status
  useEffect(() => {
    const checkPublishStatus = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'afcon_settings', 'draw'));
        if (settingsDoc.exists()) {
          setIsDrawPublished(settingsDoc.data()?.isPublished || false);
        }
      } catch (error) {
        console.error('Error checking draw status:', error);
      }
    };
    checkPublishStatus();
  }, []);

  // Countdown timer to 9PM today
  useEffect(() => {
    if (isDrawPublished) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(21, 0, 0, 0); // 9PM today

      if (now >= target) {
        return { hours: 0, minutes: 0, seconds: 0 };
      }

      const diff = target.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [isDrawPublished]);

  // Subscribe to all teams (for draw-based display)
  useEffect(() => {
    const q = query(collection(db, 'afcon_teams'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setAllTeams(teamsData);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to standings
  useEffect(() => {
    const unsubscribe = subscribeToStandings(async (data) => {
      const sorted = data.sort((a, b) => a.groupName.localeCompare(b.groupName));
      setStandings(sorted);

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

  // Get teams by group from draw
  const getTeamsByGroup = (group: string): Team[] => {
    return allTeams.filter(t => t.group === group);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-afcon-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show countdown when draw is not published
  if (!isDrawPublished) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/afcon-pattern.svg')] opacity-5"></div>
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-afcon-green/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-afcon-gold/20 rounded-full blur-3xl"></div>

          <div className="relative max-w-7xl mx-auto px-4 py-6 md:py-10">
            <Link
              href="/afcon25"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 md:mb-6 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to AFCON 2025
            </Link>

            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-afcon-green/10 backdrop-blur-sm border border-afcon-green/20 rounded-xl mb-3">
                <Trophy className="w-8 h-8 md:w-10 md:h-10 text-afcon-green" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-display font-bold text-white uppercase tracking-wider mb-2">
                Team Standings
              </h1>
              <p className="text-base md:text-xl text-afcon-gold font-medium">
                AFCON 2025 Group Standings
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Content */}
        <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col items-center justify-center py-8 md:py-16">
            {/* Countdown Timer */}
            {timeLeft && (
              <div className="mb-8">
                <p className="text-center text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider mb-4">
                  Standings Available After Draw
                </p>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-900 dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-lg border border-gray-700">
                      <span className="text-2xl md:text-3xl font-bold text-white font-display">
                        {String(timeLeft.hours).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 uppercase">Hours</span>
                  </div>
                  <span className="text-2xl md:text-3xl font-bold text-gray-400 mb-6">:</span>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-900 dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-lg border border-gray-700">
                      <span className="text-2xl md:text-3xl font-bold text-white font-display">
                        {String(timeLeft.minutes).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 uppercase">Minutes</span>
                  </div>
                  <span className="text-2xl md:text-3xl font-bold text-gray-400 mb-6">:</span>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-afcon-green rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-2xl md:text-3xl font-bold text-black font-display">
                        {String(timeLeft.seconds).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 uppercase">Seconds</span>
                  </div>
                </div>
                <p className="text-center text-afcon-gold text-sm font-medium mt-4">
                  Today at 9:00 PM
                </p>
              </div>
            )}

            <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white text-center mb-3">
              Standings Coming Soon
            </h2>
            <p className="text-base text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
              Team standings will be available after the group stage draw is announced.
              Check back after the draw to see how teams are performing!
            </p>

            <Link
              href="/afcon25"
              className="inline-flex items-center gap-2 px-6 py-3 bg-afcon-green text-black font-bold rounded-xl hover:bg-afcon-green/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to AFCON 2025
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-8 md:py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <Link
            href="/afcon25"
            className="text-afcon-green dark:text-afcon-gold hover:underline mb-4 inline-block font-bold"
          >
            ← Back to AFCON 2025
          </Link>
          <SectionHeader
            title="Semi Finals Standings"
            subtitle="Knockout stage standings - auto-updates after each match"
          />
        </div>

        {/* Show standings by group from draw */}
        {standings.length > 0 ? (
          <div className="space-y-12">
            {standings
              .filter(group => GROUPS.includes(group.groupName.replace('Group ', '')))
              .map(group => (
                <div key={group.id || group.groupId} className="space-y-6">
                  <StandingsTable standings={group} teamsData={teams} isSemiFinals={true} />

                  {/* Squad Lists for this Group */}
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {group.teams
                      .slice()
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
          // Show groups from draw if no standings yet
          <div className="space-y-8">
            {GROUPS.map(group => {
              const groupTeams = getTeamsByGroup(group);
              return (
                <div key={group} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="bg-gradient-to-r from-afcon-green to-afcon-green/80 px-6 py-4">
                    <h2 className="text-xl font-display font-bold text-black">Group {group}</h2>
                    <p className="text-sm text-black/70">{groupTeams.length} Teams • Matches not started</p>
                  </div>

                  {groupTeams.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">#</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Team</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">P</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">W</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">D</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">L</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">GD</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Pts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {groupTeams.map((team, index) => (
                            <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{index + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {team.flag_url && (
                                    <img src={team.flag_url} alt={team.name} className="w-8 h-5 object-cover rounded" />
                                  )}
                                  <span className="font-medium text-gray-900 dark:text-white">{team.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">0</td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">0</td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">0</td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">0</td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">0</td>
                              <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-white">0</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      No teams in this group yet
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-12 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
            Table Key
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="space-y-2">
              <p><strong className="text-gray-900 dark:text-white">P</strong> - Played</p>
              <p><strong className="text-gray-900 dark:text-white">W</strong> - Won</p>
              <p><strong className="text-gray-900 dark:text-white">D</strong> - Drawn</p>
              <p><strong className="text-gray-900 dark:text-white">L</strong> - Lost</p>
            </div>
            <div className="space-y-2">
              <p><strong className="text-gray-900 dark:text-white">GF</strong> - Goals For</p>
              <p><strong className="text-gray-900 dark:text-white">GA</strong> - Goals Against</p>
              <p><strong className="text-gray-900 dark:text-white">GD</strong> - Goal Difference</p>
              <p><strong className="text-gray-900 dark:text-white">Pts</strong> - Points</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
