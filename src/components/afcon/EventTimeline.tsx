'use client';

import React from 'react';
import type { MatchEvent } from '@/types/afcon';
import { getEventIcon } from '@/lib/afcon/utils';

interface EventTimelineProps {
  events: MatchEvent[];
  homeTeamId: string;
}

export default function EventTimeline({ events, homeTeamId }: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No events recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((event) => {
        const isHomeTeam = event.teamId === homeTeamId;
        
        return (
          <div
            key={event.id}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              isHomeTeam
                ? 'flex-row bg-blue-50 dark:bg-blue-900/20'
                : 'flex-row-reverse bg-red-50 dark:bg-red-900/20'
            }`}
          >
            {/* Event details */}
            <div className={`flex-1 ${isHomeTeam ? 'text-left' : 'text-right'}`}>
              <div className="flex items-center gap-2 justify-start">
                <span className="text-2xl">{getEventIcon(event.type)}</span>
                <div>
                  {event.playerName && (
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {event.playerName}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Minute marker */}
            <div className="flex-shrink-0 w-14 text-center">
              <div className="bg-gray-800 dark:bg-gray-700 text-white rounded-full px-2 py-1 text-sm font-bold">
                {event.minute}&apos;
              </div>
            </div>

            {/* Spacer for alignment */}
            <div className="flex-1"></div>
          </div>
        );
      })}
    </div>
  );
}

