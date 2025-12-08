'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Fixture } from '@/types/fixtureTypes';
import type { Team } from '@/types/afcon';
import FixtureCard from '@/components/afcon/FixtureCard';
import { Loader2 } from 'lucide-react';
import dayjs from 'dayjs';

type FilterType = 'all' | 'today' | 'live' | 'finished';

const filterOptions: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'live', label: 'Live' },
  { id: 'finished', label: 'Finished' },
];

export default function FixturesListPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [teams, setTeams] = useState<Map<string, Team>>(new Map());
  const [filteredFixtures, setFilteredFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Fetch teams first
  useEffect(() => {
    const fetchTeams = async () => {
      const q = query(collection(db, 'afcon_teams'), orderBy('name'));
      const snapshot = await getDocs(q);
      const teamsMap = new Map<string, Team>();
      snapshot.docs.forEach(doc => {
        teamsMap.set(doc.id, { id: doc.id, ...doc.data() } as Team);
      });
      setTeams(teamsMap);
    };
    fetchTeams();
  }, []);

  // Subscribe to fixtures with team data population
  useEffect(() => {
    const q = query(collection(db, 'fixtures'), orderBy('kickoffDateTime', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fixturesData = snapshot.docs.map(doc => {
        const data = doc.data();
        const homeTeam = teams.get(data.homeTeamId);
        const awayTeam = teams.get(data.awayTeamId);

        return {
          id: doc.id,
          ...data,
          homeTeamName: homeTeam?.name || 'TBD',
          homeTeamLogoUrl: homeTeam?.flag_url || homeTeam?.crest_url || '',
          awayTeamName: awayTeam?.name || 'TBD',
          awayTeamLogoUrl: awayTeam?.flag_url || awayTeam?.crest_url || '',
        } as Fixture;
      });

      setFixtures(fixturesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teams]);

  // Filter fixtures based on active filter
  useEffect(() => {
    let filtered = [...fixtures];

    switch (activeFilter) {
      case 'today':
        const today = dayjs().startOf('day');
        filtered = fixtures.filter(f => {
          const kickoff = f.kickoffDateTime instanceof Date
            ? dayjs(f.kickoffDateTime)
            : dayjs((f.kickoffDateTime as any).toDate?.() || f.kickoffDateTime);
          return kickoff.isSame(today, 'day');
        });
        break;
      case 'live':
        filtered = fixtures.filter(f => f.status === 'live' || f.status === 'ht');
        break;
      case 'finished':
        filtered = fixtures.filter(f => f.status === 'ft');
        break;
      default:
        filtered = fixtures;
    }

    setFilteredFixtures(filtered);
  }, [fixtures, activeFilter]);

  // Group fixtures by date
  const groupedFixtures = filteredFixtures.reduce((acc, fixture) => {
    const kickoff = fixture.kickoffDateTime instanceof Date
      ? fixture.kickoffDateTime
      : (fixture.kickoffDateTime as any).toDate?.() || new Date(fixture.kickoffDateTime as any);
    const dateKey = dayjs(kickoff).format('YYYY-MM-DD');

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(fixture);
    return acc;
  }, {} as Record<string, Fixture[]>);

  const formatDateHeader = (dateKey: string) => {
    const date = dayjs(dateKey);
    const today = dayjs();
    const tomorrow = today.add(1, 'day');

    if (date.isSame(today, 'day')) return 'Today';
    if (date.isSame(tomorrow, 'day')) return 'Tomorrow';
    return date.format('dddd, MMMM D');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f13]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-[#0f0f13]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800/50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-black dark:text-white mb-4">AFCON 25 Fixtures</h1>

          {/* Filter Pills - Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {filterOptions.map((filter) => (
              <motion.button
                key={filter.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeFilter === filter.id
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {filter.label}
                {filter.id === 'live' && fixtures.some(f => f.status === 'live') && (
                  <span className="ml-2 w-2 h-2 bg-red-500 rounded-full inline-block animate-pulse" />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        ) : filteredFixtures.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚽</span>
            </div>
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">No Fixtures Found</h3>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              {activeFilter === 'all'
                ? 'No fixtures have been added yet'
                : `No ${activeFilter} matches at the moment`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFixtures)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([dateKey, dateFixtures]) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {formatDateHeader(dateKey)}
                    </span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                  </div>

                  {/* Fixtures for this date */}
                  <div className="space-y-3">
                    {dateFixtures.map((fixture, index) => (
                      <motion.div
                        key={fixture.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <FixtureCard fixture={fixture} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Custom scrollbar hide CSS */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
