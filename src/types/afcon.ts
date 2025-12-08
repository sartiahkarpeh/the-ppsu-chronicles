/**
 * AFCON 2025 TypeScript Type Definitions
 * Firestore document schemas for teams, players, matches, and events
 */

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';
export type EventType = 'goal' | 'yellow' | 'red' | 'sub' | 'var' | 'injury';
export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW';

export interface Team {
  id?: string;
  name: string;
  shortName?: string;
  country: string;
  group?: string;
  coach?: string;
  color?: string;
  crest_url: string;
  flag_url?: string;  // Country flag image
  primary_color: string;
  secondary_color: string;
  fifa_code: string;
  players?: string[];  // Array of player names (max 12)
  updatedAt: number;
}

export interface Player {
  id?: string;
  teamId: string;
  name: string;
  number: number;
  position: PlayerPosition;
  photo_url?: string;
  updatedAt: number;
}

export interface Match {
  id?: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffUTC: string;
  venue: string;
  stage: string;
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
  minute: number;
  youtubeLiveId?: string;
  streamingUrl?: string;
  autoImport?: boolean; // Allow webhook updates
  createdBy: string;
  updatedAt: number;
}

export interface MatchEvent {
  id?: string;
  minute: number;
  type: EventType;
  teamId: string;
  playerId?: string;
  playerName?: string;
  description: string;
  createdBy: string;
  createdAt: number;
}

export interface StandingTeam {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

// TeamStanding with group info (stored in afcon_standings collection)
export interface TeamStanding extends StandingTeam {
  id?: string;
  group: string;
  updatedAt?: number;
}

export interface GroupStandings {
  groupId: string;
  groupName: string;
  teams: StandingTeam[];
  updatedAt: number;
}

export interface Highlight {
  id?: string;
  matchId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  mediaType?: 'video' | 'image';  // Type of uploaded media
  uploadedAt: number;
  createdBy?: string;
}

export interface AdminLog {
  id?: string;
  userId: string;
  userEmail: string;
  action: string;
  collection: string;
  documentId: string;
  timestamp: number;
  details?: Record<string, any>;
}

// Extended Match with team data for display
export interface MatchWithTeams extends Match {
  homeTeam?: Team;
  awayTeam?: Team;
  events?: MatchEvent[];
}

