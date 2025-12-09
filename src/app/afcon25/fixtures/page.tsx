'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, query, orderBy, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Fixture } from '@/types/fixtureTypes';
import type { Team } from '@/types/afcon';
import FixtureCard from '@/components/afcon/FixtureCard';
import { Loader2, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import dayjs from 'dayjs';

type FilterType = 'all' | 'today' | 'live' | 'scheduled' | 'finished';

const filterOptions: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'live', label: 'Live' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'finished', label: 'Finished' },
];

export default function FixturesListPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [teams, setTeams] = useState<Map<string, Team>>(new Map());
  const [filteredFixtures, setFilteredFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
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
      case 'scheduled':
        filtered = fixtures.filter(f => f.status === 'scheduled' || f.status === 'upcoming' || !f.status);
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

  // Get scheduled count for badge
  const scheduledCount = fixtures.filter(f => f.status === 'scheduled' || f.status === 'upcoming' || !f.status).length;

  // Show countdown when draw is not published
  if (!loading && !isDrawPublished) {
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
                <Calendar className="w-8 h-8 md:w-10 md:h-10 text-afcon-green" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-display font-bold text-white uppercase tracking-wider mb-2">
                Fixtures
              </h1>
              <p className="text-base md:text-xl text-afcon-gold font-medium">
                AFCON 2025 Match Schedule
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Content */}
        <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col items-center justify-center py-8 md:py-16">
            {/* Calendar Icon */}
            <div className="mb-6 w-24 h-24 bg-gradient-to-br from-afcon-green to-afcon-gold rounded-full flex items-center justify-center">
              <Calendar className="w-12 h-12 text-black" />
            </div>

            <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white text-center mb-3">
              Fixtures Coming Soon
            </h2>
            <p className="text-base text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
              The draw has been completed! Match fixtures will be announced shortly.
              Stay tuned for the complete match schedule!
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f13]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-[#0f0f13]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800/50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/afcon25"
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-black dark:text-white">AFCON 25 Fixtures</h1>
          </div>

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
                {filter.id === 'scheduled' && scheduledCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">{scheduledCount}</span>
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
                : activeFilter === 'scheduled'
                  ? 'No scheduled matches at the moment'
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
