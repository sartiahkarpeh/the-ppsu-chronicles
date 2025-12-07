// Live Match Data Models

export type MatchStatus = 'scheduled' | 'postponed' | 'live' | 'finished';
export type Period = '1H' | 'HT' | '2H' | 'ET1' | 'ET2' | 'PS';
export type TeamSide = 'home' | 'away';

export type EventType =
    | 'goal'
    | 'own_goal'
    | 'assist'
    | 'yellow_card'
    | 'red_card'
    | 'substitution'
    | 'injury'
    | 'var'
    | 'penalty_awarded'
    | 'penalty_scored'
    | 'penalty_missed'
    | 'offside'
    | 'kickoff'
    | 'end_half'
    | 'end_match'
    | 'custom';

export interface Match {
    id: string;
    homeTeamId: string;
    awayTeamId: string;
    venue: string;
    scheduledAt: any; // Firestore Timestamp
    status: MatchStatus;
    referee?: string;
    competition: string; // 'AFCON25'
    round?: string;
    group?: string;
}

export interface LiveState {
    matchId: string;
    homeScore: number;
    awayScore: number;
    clockMs: number; // milliseconds elapsed
    period: Period;
    isRunning: boolean;
    startedAt: any; // Firestore Timestamp
    pausedAt?: any; // Firestore Timestamp
    extraTime: number; // added minutes
    penalties?: {
        home: PenaltyResult[];
        away: PenaltyResult[];
    };
    updatedAt: any; // Firestore Timestamp
}

export interface PenaltyResult {
    playerId: string;
    playerName: string;
    outcome: 'scored' | 'missed' | 'saved';
    order: number;
}

export interface MatchEvent {
    id: string;
    matchId: string;
    type: EventType;
    team: TeamSide;
    playerId?: string;
    playerName?: string;
    minute: number;
    second: number;
    note?: string;
    mediaUrl?: string;
    isPublic: boolean; // visible on public frontend
    createdBy: string;
    createdByName: string;
    createdAt: any; // Firestore Timestamp
    editedAt?: any; // Firestore Timestamp
    // For specific event types
    assistPlayerId?: string; // for goals
    assistPlayerName?: string;
    playerInId?: string; // for substitutions
    playerInName?: string;
    playerOutId?: string;
    playerOutName?: string;
}

export interface Player {
    id: string;
    name: string;
    number: number;
    position: string;
}

export interface TeamLineup {
    formation: string; // e.g., "4-4-2"
    starters: Player[];
    substitutes: Player[];
    substitutionCount: number;
}

export interface Lineups {
    matchId: string;
    home: TeamLineup;
    away: TeamLineup;
    updatedAt: any; // Firestore Timestamp
}

export interface AuditLog {
    id: string;
    matchId: string;
    action: string; // 'start_match', 'add_event', 'update_score', etc.
    userId: string;
    userName: string;
    timestamp: any; // Firestore Timestamp
    details: any; // action-specific data
    reason?: string;
}

export interface BroadcastSettings {
    matchId: string;
    streamUrl?: string;
    showCrests: boolean;
    showBadge: boolean;
    showSponsor: boolean;
    sponsorText?: string;
    overlayEnabled: boolean;
}

export interface Commentary {
    id: string;
    matchId: string;
    text: string;
    minute: number;
    isPublished: boolean;
    createdBy: string;
    createdAt: any; // Firestore Timestamp
}

// Helper types for UI state
export interface ClockState {
    displayTime: string; // "45:00"
    period: Period;
    isRunning: boolean;
}

export interface ScoreboardData {
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    homeLogo?: string;
    awayLogo?: string;
}
