'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Trophy, CalendarOff } from 'lucide-react';
import HeroSection from '@/components/afcon/HeroSection';
import StatsRow from '@/components/afcon/StatsRow';
import NavCards from '@/components/afcon/NavCards';
import MatchCard from '@/components/afcon/MatchCard';
import { subscribeToMatches, getTeam } from '@/lib/afcon/firestore';
import type { Match, Team } from '@/types/afcon';

export default function AFCON25Page() {
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToMatches(async (matches) => {
      // Filter for scheduled matches and sort by kickoff time
      const scheduled = matches
        .filter(m => m.status === 'scheduled')
        .sort((a, b) => new Date(a.kickoffUTC).getTime() - new Date(b.kickoffUTC).getTime())
        .slice(0, 6); // Show first 6 upcoming matches

      setUpcomingMatches(scheduled);

      // Fetch teams for all matches
      const teamIds = new Set<string>();
      scheduled.forEach(match => {
        teamIds.add(match.homeTeamId);
        teamIds.add(match.awayTeamId);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <HeroSection />

      {/* CTA Section */}
      <div className="relative z-20 py-12 bg-white dark:bg-black flex flex-col sm:flex-row gap-6 justify-center items-center px-4 border-b border-gray-100 dark:border-white/5">
        <Link
          href="/afcon25/fixtures"
          className="group relative w-full sm:w-auto min-w-[200px] px-8 py-4 bg-afcon-green text-black font-bold text-lg rounded-xl overflow-hidden shadow-md transition-all hover:shadow-xl hover:-translate-y-1 text-center flex items-center justify-center gap-3"
        >
          <span className="relative z-10 font-display uppercase tracking-wider">View Fixtures</span>
          <Calendar className="w-5 h-5 relative z-10" />
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        </Link>
        <Link
          href="/afcon25/standings"
          className="group w-full sm:w-auto min-w-[200px] px-8 py-4 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-bold text-lg rounded-xl border border-gray-200 dark:border-white/10 hover:border-afcon-gold transition-all hover:shadow-lg hover:-translate-y-1 text-center flex items-center justify-center gap-3"
        >
          <span className="font-display uppercase tracking-wider">Team Standings</span>
          <Trophy className="w-5 h-5" />
        </Link>
      </div>

      <StatsRow />

      <NavCards />

      <main className="max-w-7xl mx-auto px-4 pb-24">
        {/* Upcoming Matches */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="h-8 w-2 bg-afcon-green rounded-full"></div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 dark:text-white uppercase">
                Upcoming Matches
              </h2>
            </div>
            {upcomingMatches.length > 0 && (
              <Link
                href="/afcon25/fixtures"
                className="text-afcon-green dark:text-afcon-gold hover:underline font-bold"
              >
                View All →
              </Link>
            )}
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : upcomingMatches.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingMatches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  homeTeam={teams[match.homeTeamId]}
                  awayTeam={teams[match.awayTeamId]}
                  showVenue={false}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-12 md:p-24 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                <CalendarOff className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-3">
                No Upcoming Matches
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">
                All scheduled matches will appear here. Check back soon or view the fixtures page for the full schedule.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
