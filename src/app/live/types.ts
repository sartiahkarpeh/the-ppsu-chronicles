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
}

export interface LiveEditorProps {
  isOpen: boolean;
  onClose: () => void;
  sport: Sport;
  game?: LiveGame | null;
}
