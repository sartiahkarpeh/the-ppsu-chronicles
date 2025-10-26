// src/app/live/types.ts
import { Timestamp } from "firebase/firestore";

export type Sport = "Football" | "Basketball";

export type MatchStatus = "LIVE" | "HALFTIME" | "FULLTIME" | "UPCOMING";

export interface Team {
  name: string;
  imageUrl: string;
}

export interface LiveGame {
  id?: string;
  sport: Sport;
  teamA: Team;
  teamB: Team;
  score: string;
  time: string;
  status: MatchStatus;
  league: string;
  location: string;
  description?: string;
  lastUpdated: Timestamp | Date;
  startTime?: Timestamp | Date; // When the match actually started
  pausedAt?: number; // Seconds elapsed when paused
}

export interface LiveEditorProps {
  isOpen: boolean;
  onClose: () => void;
  sport: Sport;
  game?: LiveGame | null;
}

// New types for live streaming
export interface LiveStream {
  id: string;
  isActive: boolean;
  streamKey?: string;
  playbackId?: string;
  playbackUrl?: string;
  matchId?: string; // Associated match for overlays
  startedAt?: Timestamp | Date;
  endedAt?: Timestamp | Date;
  viewerCount?: number;
  currentFrame?: string; // Data URL of current camera frame
  lastFrameUpdate?: Timestamp | Date; // When frame was last updated
}

export interface StreamOverlayData {
  teamA: string;
  teamB: string;
  teamALogo: string;
  teamBLogo: string;
  score: string;
  time: string;
  league: string;
  status: MatchStatus;
}
