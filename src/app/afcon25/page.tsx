'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Trophy, CalendarOff, Shuffle } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import HeroSection from '@/components/afcon/HeroSection';
import StatsRow from '@/components/afcon/StatsRow';
import NavCards from '@/components/afcon/NavCards';
import FixtureCard from '@/components/afcon/FixtureCard';
import type { Fixture } from '@/types/fixtureTypes';
import type { Team } from '@/types/afcon';

// The final fixture ID
const FINAL_FIXTURE_ID = 'defhFOoFnIsd8HuLKcTG';

interface FinalFixtureData {
  id: string;
  kickoffDateTime: Date;
  venue: string;
  homeTeamName: string;
  homeTeamFlag: string;
  awayTeamName: string;
  awayTeamFlag: string;
}

export default function AFCON25Page() {
  const [upcomingFixtures, setUpcomingFixtures] = useState<Fixture[]>([]);
  const [finalFixture, setFinalFixture] = useState<FinalFixtureData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get teams
        const teamsQuery = query(collection(db, 'afcon_teams'), orderBy('name'));
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsMap = new Map<string, Team>();
        teamsSnapshot.docs.forEach(docSnap => {
          teamsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Team);
        });

        // Fetch the final fixture
        try {
          const finalDoc = await getDoc(doc(db, 'fixtures', FINAL_FIXTURE_ID));
          if (finalDoc.exists()) {
            const data = finalDoc.data();
            const homeTeam = teamsMap.get(data.homeTeamId);
            const awayTeam = teamsMap.get(data.awayTeamId);

            let kickoffDate: Date;
            if (data.kickoffDateTime instanceof Timestamp) {
              kickoffDate = data.kickoffDateTime.toDate();
            } else if (data.kickoffDateTime instanceof Date) {
              kickoffDate = data.kickoffDateTime;
            } else {
              kickoffDate = new Date('2026-01-05T16:30:00');
            }

            setFinalFixture({
              id: finalDoc.id,
              kickoffDateTime: kickoffDate,
              venue: data.venue || 'Main Stadium',
              homeTeamName: homeTeam?.name || 'Liberia',
              homeTeamFlag: homeTeam?.flag_url || homeTeam?.crest_url || '',
              awayTeamName: awayTeam?.name || 'Nigeria',
              awayTeamFlag: awayTeam?.flag_url || awayTeam?.crest_url || '',
            });
          }
        } catch (error) {
          console.log('Final fixture not found, using defaults');
        }

        // Subscribe to fixtures
        const fixturesQuery = query(collection(db, 'fixtures'), orderBy('kickoffDateTime', 'asc'));

        const unsubscribe = onSnapshot(fixturesQuery, (snapshot) => {
          const fixturesData = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const homeTeam = teamsMap.get(data.homeTeamId);
            const awayTeam = teamsMap.get(data.awayTeamId);

            return {
              id: docSnap.id,
              ...data,
              homeTeamName: homeTeam?.name || 'TBD',
              homeTeamLogoUrl: homeTeam?.flag_url || homeTeam?.crest_url || '',
              awayTeamName: awayTeam?.name || 'TBD',
              awayTeamLogoUrl: awayTeam?.flag_url || awayTeam?.crest_url || '',
            } as Fixture;
          });

          // Filter for scheduled/upcoming matches (excluding the final) and take first 6
          const scheduled = fixturesData
            .filter(f => {
              const status = (f.status as any) || '';
              const isUpcoming = status === 'scheduled' || status === 'upcoming' || status === '';
              const isNotFinal = f.id !== FINAL_FIXTURE_ID;
              return isUpcoming && isNotFinal;
            })
            .slice(0, 6);

          setUpcomingFixtures(scheduled);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error fetching fixtures:', error);
        setLoading(false);
      }
    };

    let unsubscribe: (() => void) | undefined;
    fetchData().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <HeroSection
        finalFixtureId={finalFixture?.id || FINAL_FIXTURE_ID}
        kickoffDateTime={finalFixture?.kickoffDateTime}
        venue={finalFixture?.venue}
        homeTeamName={finalFixture?.homeTeamName}
        homeTeamFlag={finalFixture?.homeTeamFlag}
        awayTeamName={finalFixture?.awayTeamName}
        awayTeamFlag={finalFixture?.awayTeamFlag}
        upcomingMatchUrl={upcomingFixtures.length > 0 ? `/afcon25/fixtures/${upcomingFixtures[0].id}` : undefined}
      />

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
        <Link
          href="/afcon25/draw"
          className="group w-full sm:w-auto min-w-[200px] px-8 py-4 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-bold text-lg rounded-xl border border-gray-200 dark:border-white/10 hover:border-afcon-gold transition-all hover:shadow-lg hover:-translate-y-1 text-center flex items-center justify-center gap-3"
        >
          <span className="font-display uppercase tracking-wider">Draw</span>
          <Shuffle className="w-5 h-5" />
        </Link>
      </div>

      <StatsRow />

      <NavCards />

      <main className="max-w-7xl mx-auto px-4 pb-24">
        {/* Upcoming Matches */}
        <section className="mt-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div className="flex items-center gap-4">
              <div className="h-10 w-2 bg-gradient-to-b from-afcon-gold to-yellow-600 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
              <div>
                <h2 className="text-3xl md:text-5xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                  Tournament <span className="text-afcon-gold">Action</span>
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">
                  Relive the journey to the grand finale
                </p>
              </div>
            </div>
            {upcomingFixtures.length > 0 && (
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
          ) : upcomingFixtures.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingFixtures.map(fixture => (
                <FixtureCard
                  key={fixture.id}
                  fixture={fixture}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-12 md:p-24 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                <CalendarOff className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-3">
                All Eyes on The Final!
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">
                The tournament has reached its climax. Watch the grand final between Liberia and Nigeria!
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
