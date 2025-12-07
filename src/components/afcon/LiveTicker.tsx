'use client';

import React, { useEffect, useState } from 'react';
import { subscribeToLiveMatches, getTeam } from '@/lib/afcon/firestore';
import type { Match, Team } from '@/types/afcon';
import Link from 'next/link';
import { Radio } from 'lucide-react';

interface MatchWithTeams extends Match {
  homeTeam?: Team;
  awayTeam?: Team;
}

export default function LiveTicker() {
  const [liveMatches, setLiveMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToLiveMatches(async (matches) => {
      const matchesWithTeams = await Promise.all(
        matches.map(async (match) => {
          const [homeTeam, awayTeam] = await Promise.all([
            getTeam(match.homeTeamId),
            getTeam(match.awayTeamId),
          ]);
          return {
            ...match,
            homeTeam: homeTeam || undefined,
            awayTeam: awayTeam || undefined,
          };
        })
      );
      setLiveMatches(matchesWithTeams);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading || liveMatches.length === 0) return null;

  return (
    <div className="w-full bg-afcon-black border-y border-white/10 overflow-hidden relative h-14 flex items-center">
      <div className="absolute left-0 top-0 bottom-0 bg-afcon-green px-4 flex items-center z-20 font-bold text-white uppercase tracking-wider text-sm shadow-lg gap-2">
        <Radio className="w-4 h-4 animate-pulse text-white" />
        Live
      </div>

      <div className="flex animate-scroll whitespace-nowrap pl-24">
        {liveMatches.map((match) => (
          <Link
            key={match.id}
            href={`/afcon25/match/${match.id}`}
            className="inline-flex items-center space-x-4 px-6 py-2 border-r border-white/10 hover:bg-white/5 transition-colors group"
          >
            <span className="text-gray-400 text-xs font-mono">{match.minute}'</span>
            <div className="flex items-center space-x-2">
              <span className="text-white font-bold group-hover:text-afcon-gold">{match.homeTeam?.name || 'Home'}</span>
              <span className="text-afcon-gold font-display font-bold text-lg px-2 bg-white/5 rounded">
                {match.homeScore} - {match.awayScore}
              </span>
              <span className="text-white font-bold group-hover:text-afcon-gold">{match.awayTeam?.name || 'Away'}</span>
            </div>
          </Link>
        ))}
        {/* Duplicate for seamless loop */}
        {liveMatches.map((match) => (
          <Link
            key={`dup-${match.id}`}
            href={`/afcon25/match/${match.id}`}
            className="inline-flex items-center space-x-4 px-6 py-2 border-r border-white/10 hover:bg-white/5 transition-colors group"
          >
            <span className="text-gray-400 text-xs font-mono">{match.minute}'</span>
            <div className="flex items-center space-x-2">
              <span className="text-white font-bold group-hover:text-afcon-gold">{match.homeTeam?.name || 'Home'}</span>
              <span className="text-afcon-gold font-display font-bold text-lg px-2 bg-white/5 rounded">
                {match.homeScore} - {match.awayScore}
              </span>
              <span className="text-white font-bold group-hover:text-afcon-gold">{match.awayTeam?.name || 'Away'}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
