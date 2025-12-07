'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react';
import { subscribeToMatch, subscribeToMatchEvents, getTeam } from '@/lib/afcon/firestore';
import { subscribeToLiveState } from '@/lib/liveMatch/firestore';
import type { Match, Team, MatchEvent } from '@/types/afcon';
import type { LiveState } from '@/types/liveMatch';
import VideoEmbed from '@/components/afcon/VideoEmbed';
import EventTimeline from '@/components/afcon/EventTimeline';
import { getStatusColor, formatKickoffTime } from '@/lib/afcon/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MatchPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.id;

  const [match, setMatch] = useState<Match | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to match updates
    const unsubscribeMatch = subscribeToMatch(matchId, async (matchData) => {
      setMatch(matchData);

      if (matchData) {
        // Fetch team data
        const [home, away] = await Promise.all([
          getTeam(matchData.homeTeamId),
          getTeam(matchData.awayTeamId),
        ]);
        setHomeTeam(home);
        setAwayTeam(away);
      }

      setLoading(false);
    });

    // Subscribe to match events
    const unsubscribeEvents = subscribeToMatchEvents(matchId, (eventsData) => {
      setEvents(eventsData);
    });

    // Subscribe to live state for real-time updates
    const unsubscribeLive = subscribeToLiveState(matchId, (liveData) => {
      setLiveState(liveData);
    });

    return () => {
      unsubscribeMatch();
      unsubscribeEvents();
      unsubscribeLive();
    };
  }, [matchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded"></div>
            <div className="h-96 bg-gray-300 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Match Not Found
          </h1>
          <Link href="/afcon25" className="text-blue-600 hover:underline">
            ← Back to AFCON 2025
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/afcon25"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to AFCON 2025
          </Link>
        </div>

        {/* Match Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 md:p-8 mb-6">
          {/* Status & Stage */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <span className={`px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold ${getStatusColor(match.status)}`}>
                {match.status === 'live' ? (
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    LIVE
                  </span>
                ) : match.status.toUpperCase()}
              </span>
              {liveState && match.status === 'live' && (
                <span className="px-3 md:px-4 py-2 bg-black text-white rounded-lg text-base md:text-xl font-mono font-bold">
                  {Math.floor(liveState.clockMs / 60000)}:{String(Math.floor((liveState.clockMs % 60000) / 1000)).padStart(2, '0')}
                </span>
              )}
            </div>
            <span className="text-sm md:text-base text-gray-600 dark:text-gray-400">{match.stage}</span>
          </div>

          {/* Teams & Score - Responsive Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-center mb-6">
            {/* Home Team */}
            <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-0">
              {(homeTeam?.flag_url || homeTeam?.crest_url) && (
                <div className="w-16 h-16 md:w-28 md:h-28 flex-shrink-0 md:mx-auto md:mb-4 flex items-center justify-center">
                  {homeTeam?.flag_url ? (
                    <img
                      src={homeTeam.flag_url}
                      alt={`${homeTeam.name} flag`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={homeTeam.crest_url}
                      alt={homeTeam.name}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              )}
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex-1 md:flex-initial">
                {homeTeam?.name || 'TBD'}
              </h2>
            </div>

            {/* Score - Centered on all screens */}
            <div className="text-center order-first md:order-none">
              <div className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white">
                {match.status === 'scheduled' ? (
                  <span className="text-3xl md:text-4xl text-gray-500">vs</span>
                ) : liveState ? (
                  `${liveState.homeScore} - ${liveState.awayScore}`
                ) : (
                  `${match.homeScore} - ${match.awayScore}`
                )}
              </div>
              {liveState && match.status === 'live' && (
                <div className="mt-2 text-xs md:text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  {liveState.period === '1H' && '1st Half'}
                  {liveState.period === 'HT' && 'Half Time'}
                  {liveState.period === '2H' && '2nd Half'}
                  {liveState.period === 'ET1' && 'Extra Time 1'}
                  {liveState.period === 'ET2' && 'Extra Time 2'}
                  {liveState.period === 'PS' && 'Penalties'}
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-0">
              {(awayTeam?.flag_url || awayTeam?.crest_url) && (
                <div className="w-16 h-16 md:w-28 md:h-28 flex-shrink-0 md:mx-auto md:mb-4 flex items-center justify-center">
                  {awayTeam?.flag_url ? (
                    <img
                      src={awayTeam.flag_url}
                      alt={`${awayTeam.name} flag`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={awayTeam.crest_url}
                      alt={awayTeam.name}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              )}
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex-1 md:flex-initial">
                {awayTeam?.name || 'TBD'}
              </h2>
            </div>
          </div>

          {/* Match Info */}
          <div className="text-center space-y-2 text-gray-600 dark:text-gray-400">
            <div className="flex items-center justify-center gap-2 text-base md:text-lg text-gray-300">
              <MapPin className="w-4 h-4 md:w-5 md:h-5 text-afcon-green" />
              <span>{match.venue}</span>
            </div>
            {match.status === 'scheduled' && (
              <p className="text-base md:text-lg">{formatKickoffTime(match.kickoffUTC)}</p>
            )}
          </div>
        </div>

        {/* Video Stream */}
        {(match.youtubeLiveId || match.streamingUrl) && match.status === 'live' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Live Stream
            </h3>
            <VideoEmbed
              youtubeId={match.youtubeLiveId}
              streamingUrl={match.streamingUrl}
              title={`${homeTeam?.name} vs ${awayTeam?.name}`}
            />
          </div>
        )}

        {/* Match Events */}
        {(match.status === 'live' || match.status === 'finished') && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Match Events
            </h3>
            <EventTimeline events={events} homeTeamId={match.homeTeamId} />
          </div>
        )}

        {/* Upcoming Match Info */}
        {match.status === 'scheduled' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 text-center">
            <p className="text-lg text-gray-700 dark:text-gray-300">
              This match hasn&apos;t started yet. Check back at kickoff time!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

