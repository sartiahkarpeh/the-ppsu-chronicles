'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Trophy, Users, Film, Settings, ArrowRight, Play } from 'lucide-react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '@/firebase/config';

export default function AFCONAdminDashboard() {
  const [stats, setStats] = useState({
    fixtures: 0,
    teams: 0,
    highlights: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const fixturesSnap = await getCountFromServer(collection(db, 'afcon_fixtures'));
        const teamsSnap = await getCountFromServer(collection(db, 'afcon_teams'));
        const highlightsSnap = await getCountFromServer(collection(db, 'afcon_highlights'));

        setStats({
          fixtures: fixturesSnap.data().count,
          teams: teamsSnap.data().count,
          highlights: highlightsSnap.data().count,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    { name: 'Fixtures', count: stats.fixtures, icon: Calendar, href: '/admin/afcon25/fixtures', color: 'bg-blue-500' },
    { name: 'Teams', count: stats.teams, icon: Users, href: '/admin/afcon25/teams', color: 'bg-afcon-green' },
    { name: 'Highlights', count: stats.highlights, icon: Film, href: '/admin/afcon25/highlights', color: 'bg-red-500' },
    { name: 'Standings', count: 'View', icon: Trophy, href: '/admin/afcon25/standings', color: 'bg-afcon-gold' },
  ];

  return (
    <div>
      <div className="mb-8 hidden md:block">
        <h1 className="text-3xl font-display font-bold text-black dark:text-white">Dashboard</h1>
        <p className="text-black dark:text-gray-400">Overview of AFCON 2025 tournament data.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Total Teams</h3>
            <div className="p-2 bg-white/10 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-4xl font-bold text-white mb-1">{stats.teams}</p>
          <p className="text-xs text-gray-400">Participating teams</p>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Total Matches</h3>
            <div className="p-2 bg-white/10 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-4xl font-bold text-white mb-1">{stats.fixtures}</p>
          <p className="text-xs text-gray-400">Scheduled games</p>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Highlights</h3>
            <div className="p-2 bg-white/10 rounded-lg">
              <Play className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-4xl font-bold text-white mb-1">{stats.highlights}</p>
          <p className="text-xs text-gray-400">Video moments</p>
        </div>

        <div className="bg-gradient-to-br from-afcon-green to-green-700 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white/90">Status</h3>
            <div className="p-2 bg-white/10 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-4xl font-bold text-white mb-1">Active</p>
          <p className="text-xs text-white/80">Tournament live</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
            <Settings className="w-6 h-6 text-black dark:text-gray-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white">Quick Actions</h2>
            <p className="text-sm text-black dark:text-gray-400">Common tasks and settings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/admin/afcon25/fixtures" className="p-6 bg-black text-white dark:bg-gray-800 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-700 transition-all shadow-lg hover:shadow-xl text-center group">
            <span className="block font-semibold text-white mb-1">Add New Fixture</span>
            <span className="text-xs text-gray-300">Schedule a match</span>
          </Link>
          <Link href="/admin/afcon25/highlights" className="p-6 bg-black text-white dark:bg-gray-800 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-700 transition-all shadow-lg hover:shadow-xl text-center group">
            <span className="block font-semibold text-white mb-1">Upload Highlight</span>
            <span className="text-xs text-gray-300">Add match video</span>
          </Link>
          <Link href="/admin/afcon25/settings" className="p-6 bg-black text-white dark:bg-gray-800 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-700 transition-all shadow-lg hover:shadow-xl text-center group">
            <span className="block font-semibold text-white mb-1">Tournament Settings</span>
            <span className="text-xs text-gray-300">Configure dates & visibility</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
