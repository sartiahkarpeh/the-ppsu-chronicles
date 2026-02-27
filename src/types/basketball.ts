import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// ============= STATUS ENUMS =============

export const GameStatus = {
    SCHEDULED: 'scheduled',
    LIVE: 'live',
    HT: 'ht', // Half-time
    FT: 'ft', // Full-time
    POSTPONED: 'postponed',
    CANCELLED: 'cancelled',
} as const;

export type GameStatusType = typeof GameStatus[keyof typeof GameStatus];

export const GameType = {
    PRESEASON: 'preseason',
    REGULAR_SEASON: 'regular_season',
    PLAYOFF: 'playoff',
} as const;

export type GameTypeType = typeof GameType[keyof typeof GameType];

export const PlayerStatus = {
    ACTIVE: 'active',
    INJURED: 'injured',
    OUT: 'out',
} as const;

export type PlayerStatusType = typeof PlayerStatus[keyof typeof PlayerStatus];

// ============= ZOD SCHEMAS =============

export const gameStatusSchema = z.enum([
    'scheduled',
    'live',
    'ht',
    'ft',
    'postponed',
    'cancelled',
]);

export const gameTypeSchema = z.enum([
    'preseason',
    'regular_season',
    'playoff',
]);

export const playerStatusSchema = z.enum([
    'active',
    'injured',
    'out',
]);

// --- Base Team Schema ---
export const teamSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Team name is required'),
    city: z.string().min(1, 'City is required'),
    abbreviation: z.string().min(1, 'Abbreviation is required').max(4),
    logo: z.string().url('Must be a valid URL').optional().or(z.literal('')),
    conference: z.string().optional(),
    division: z.string().optional(),
    primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color').default('#000000'),
    secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color').default('#FFFFFF'),
    arena: z.string().optional(),
    headCoach: z.string().optional(),
    wins: z.number().int().min(0).default(0),
    losses: z.number().int().min(0).default(0),
    standingOrRank: z.number().int().positive().optional(),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional(),
});

export const createTeamSchema = teamSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const updateTeamSchema = teamSchema.partial().omit({
    id: true,
    createdAt: true,
});

// --- Base Player Schema ---
export const playerSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Player name is required'),
    number: z.number().int().min(0).max(99),
    position: z.string().min(1, 'Position is required'),
    teamId: z.string().min(1, 'Team ID is required'),
    headshot: z.string().url('Must be a valid URL').optional().or(z.literal('')),
    height: z.string().optional(), // e.g. "6-6"
    weight: z.number().positive().optional(), // lbs
    age: z.number().int().positive().optional(),
    college: z.string().optional(),
    draftInfo: z.string().optional(),
    status: playerStatusSchema.default('active'),
    injuryDescription: z.string().optional(),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional(),
});

export const createPlayerSchema = playerSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const updatePlayerSchema = playerSchema.partial().omit({
    id: true,
    createdAt: true,
});

// --- Base Game Schema ---
export const gameSchema = z.object({
    id: z.string().optional(),
    homeTeamId: z.string().min(1, 'Home team ID is required'),
    awayTeamId: z.string().min(1, 'Away team ID is required'),
    date: z.any(), // Firestore Timestamp
    venue: z.string().min(1, 'Venue is required'),
    status: gameStatusSchema.default('scheduled'),
    gameType: gameTypeSchema.default('regular_season'),
    homeScore: z.number().int().min(0).default(0),
    awayScore: z.number().int().min(0).default(0),
    period: z.number().int().min(0).default(0), // 1-4 for quarters, 5+ for OT, 0 for not started
    clock: z.string().default('12:00'), // e.g. "12:00"
    broadcastInfo: z.string().optional(),
    isFeatured: z.boolean().default(false),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional(),
});

export const createGameSchema = gameSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const updateGameSchema = gameSchema.partial().omit({
    id: true,
    createdAt: true,
});

// --- Config Schemas ---
export const scoresTickerConfigSchema = z.object({
    id: z.string().optional(),
    isActive: z.boolean().default(true),
    showLiveOnly: z.boolean().default(false),
    featuredGameIds: z.array(z.string()).default([]), // If empty, show all active/recent
    speed: z.number().int().positive().default(50),
    updatedAt: z.any().optional(),
});

export const pageConfigSchema = z.object({
    id: z.string().optional(),
    heroGameId: z.string().optional(),
    heroText: z.string().optional(),
    heroBgImage: z.string().optional(),
    showHeroSection: z.boolean().default(true),
    showScoresTicker: z.boolean().default(true),
    showScoreboard: z.boolean().default(true),
    showTeamGrid: z.boolean().default(true),
    showInjuryReport: z.boolean().default(true),
    seoTitle: z.string().default('Basketball | PPSU Chronicles'),
    seoDescription: z.string().default('Latest basketball scores, teams, and players.'),
    ogImage: z.string().optional(),
    updatedAt: z.any().optional(),
});

// ============= TYPESCRIPT INTERFACES =============

export interface BasketballTeam {
    id: string;
    name: string;
    city: string;
    abbreviation: string;
    logo?: string;
    conference?: string;
    division?: string;
    primaryColor: string;
    secondaryColor: string;
    arena?: string;
    headCoach?: string;
    wins: number;
    losses: number;
    standingOrRank?: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface BasketballPlayer {
    id: string;
    name: string;
    number: number;
    position: string;
    teamId: string;
    // Optional populated fields for UI
    teamName?: string;
    teamAbbreviation?: string;
    headshot?: string;
    height?: string;
    weight?: number;
    age?: number;
    college?: string;
    draftInfo?: string;
    status: PlayerStatusType;
    bio?: string;
    stats?: {
        pointsPerGame?: number;
        reboundsPerGame?: number;
        assistsPerGame?: number;
        blocksPerGame?: number;
        stealsPerGame?: number;
        turnoversPerGame?: number;
        gamesPlayed?: number;
    };
    injuryDescription?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface BasketballGame {
    id: string;
    homeTeamId: string;
    awayTeamId: string;
    // Optional populated fields for UI
    homeTeamName?: string;
    homeTeamLogo?: string;
    homeTeamAbbr?: string;
    awayTeamName?: string;
    awayTeamLogo?: string;
    awayTeamAbbr?: string;
    date: Timestamp | Date;
    venue: string;
    status: GameStatusType;
    gameType: GameTypeType;
    homeScore: number;
    awayScore: number;
    period: number;
    clock: string;
    broadcastInfo?: string;
    isFeatured: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface ScoresTickerConfig {
    id?: string;
    isActive: boolean;
    showLiveOnly: boolean;
    featuredGameIds: string[];
    speed: number;
    updatedAt: Timestamp;
}

export interface BasketballPageConfig {
    id?: string;
    heroGameId?: string;
    heroText?: string;
    heroBgImage?: string;
    showHeroSection: boolean;
    showScoresTicker: boolean;
    showScoreboard: boolean;
    showTeamGrid: boolean;
    showInjuryReport: boolean;
    seoTitle: string;
    seoDescription: string;
    ogImage?: string;
    updatedAt: Timestamp;
}
