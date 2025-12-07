'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Clock } from 'lucide-react';
import type { Match, Team } from '@/types/afcon';
import { formatKickoffTime, getStatusColor, getStatusText } from '@/lib/afcon/utils';

interface MatchCardProps {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  showVenue?: boolean;
}

export default function MatchCard({ match, homeTeam, awayTeam, showVenue = true }: MatchCardProps) {
  const isLive = match.status === 'live';

  return (
    <Link
      href={`/afcon25/match/${match.id}`}
      className="group relative block bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
    >
      {/* Status Bar */}
      <div className={`h-2 ${isLive ? 'bg-gradient-to-r from-red-500 to-pink-500 animate-pulse' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}></div>

      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </span>
            )}
            <span className={`text-xs font-bold uppercase tracking-widest ${isLive ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {isLive ? 'Live Now' : getStatusText(match)}
            </span>
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
            {match.stage}
          </span>
        </div>

        {/* Teams */}
        <div className="space-y-6">
          {/* Home Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {(homeTeam?.flag_url || homeTeam?.crest_url) && (
                <div className="w-16 h-16 relative flex items-center justify-center">
                  {homeTeam?.flag_url ? (
                    <img src={homeTeam.flag_url} alt={`${homeTeam.name} flag`} className="w-full h-full object-contain" />
                  ) : (
                    <img src={homeTeam.crest_url} alt={homeTeam.name} className="w-full h-full object-contain" />
                  )}
                </div>
              )}
              <span className="font-display font-bold text-xl text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {homeTeam?.name || 'TBD'}
              </span>
            </div>
            <span className={`text-4xl font-display font-black ${isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
              {match.status !== 'scheduled' ? match.homeScore : '-'}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-800"></div>

          {/* Away Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {(awayTeam?.flag_url || awayTeam?.crest_url) && (
                <div className="w-16 h-16 relative flex items-center justify-center">
                  {awayTeam?.flag_url ? (
                    <img src={awayTeam.flag_url} alt={`${awayTeam.name} flag`} className="w-full h-full object-contain" />
                  ) : (
                    <img src={awayTeam.crest_url} alt={awayTeam.name} className="w-full h-full object-contain" />
                  )}
                </div>
              )}
              <span className="font-display font-bold text-xl text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {awayTeam?.name || 'TBD'}
              </span>
            </div>
            <span className={`text-4xl font-display font-black ${isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
              {match.status !== 'scheduled' ? match.awayScore : '-'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
          {showVenue && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate max-w-[200px]">{match.venue}</span>
            </div>
          )}
          {match.status === 'scheduled' && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatKickoffTime(match.kickoffUTC)}</span>
          )}
          {isLive && (
            <span className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400 animate-pulse">
              <Clock className="w-4 h-4" /> {match.minute}'
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
