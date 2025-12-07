/**
 * Utility functions for AFCON 2025
 */

import type { Match, MatchEvent, EventType } from '@/types/afcon';

/**
 * Format kickoff time in a user-friendly way
 */
export const formatKickoffTime = (kickoffUTC: string): string => {
  const date = new Date(kickoffUTC);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffMs < 0) {
    // Match has started or finished
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (diffHours < 24) {
    return `Kickoff in ${diffHours}h ${diffMinutes}m`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get event icon based on event type
 */
export const getEventIcon = (type: EventType): string => {
  switch (type) {
    case 'goal':
      return '⚽';
    case 'yellow':
      return '🟨';
    case 'red':
      return '🟥';
    case 'sub':
      return '🔄';
    case 'var':
      return '📺';
    case 'injury':
      return '🏥';
    default:
      return '•';
  }
};

/**
 * Get match status badge color
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'live':
      return 'bg-red-600 text-white';
    case 'scheduled':
      return 'bg-blue-600 text-white';
    case 'finished':
      return 'bg-gray-600 text-white';
    case 'postponed':
      return 'bg-yellow-600 text-white';
    default:
      return 'bg-gray-400 text-white';
  }
};

/**
 * Get match status text
 */
export const getStatusText = (match: Match): string => {
  switch (match.status) {
    case 'live':
      return `${match.minute}'`;
    case 'scheduled':
      return 'Upcoming';
    case 'finished':
      return 'FT';
    case 'postponed':
      return 'Postponed';
    default:
      return match.status;
  }
};

/**
 * Calculate time until kickoff
 */
export const getTimeUntilKickoff = (kickoffUTC: string): {
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
} => {
  const date = new Date(kickoffUTC);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) {
    return { hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, isPast: false };
};

/**
 * Format match score
 */
export const formatScore = (homeScore: number, awayScore: number): string => {
  return `${homeScore} - ${awayScore}`;
};

/**
 * Group events by half (first/second half)
 */
export const groupEventsByHalf = (events: MatchEvent[]): {
  firstHalf: MatchEvent[];
  secondHalf: MatchEvent[];
} => {
  const firstHalf = events.filter(e => e.minute <= 45);
  const secondHalf = events.filter(e => e.minute > 45);
  return { firstHalf, secondHalf };
};

/**
 * Get YouTube thumbnail URL
 */
export const getYouTubeThumbnail = (youtubeId: string, quality: 'default' | 'hq' | 'maxres' = 'hq'): string => {
  switch (quality) {
    case 'maxres':
      return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    case 'hq':
      return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    default:
      return `https://img.youtube.com/vi/${youtubeId}/default.jpg`;
  }
};

/**
 * Validate YouTube ID format
 */
export const isValidYouTubeId = (id: string): boolean => {
  const regex = /^[a-zA-Z0-9_-]{11}$/;
  return regex.test(id);
};

