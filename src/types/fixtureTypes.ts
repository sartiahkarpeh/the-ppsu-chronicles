/**
 * AFCON 2025 Fixtures Type Definitions
 * Extended fixture types with Zod validation
 */

import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// ============= STATUS ENUMS =============

export const FixtureStatus = {
    UPCOMING: 'upcoming',
    LIVE: 'live',
    HT: 'ht',
    FT: 'ft',
    POSTPONED: 'postponed',
    CANCELLED: 'cancelled',
} as const;

export type FixtureStatusType = typeof FixtureStatus[keyof typeof FixtureStatus];

export const FormResult = {
    WIN: 'W',
    DRAW: 'D',
    LOSS: 'L',
} as const;

export type FormResultType = typeof FormResult[keyof typeof FormResult];

// ============= ZOD SCHEMAS =============

export const formResultSchema = z.enum(['W', 'D', 'L']);

export const fixtureStatusSchema = z.enum([
    'upcoming',
    'live',
    'ht',
    'ft',
    'postponed',
    'cancelled',
]);

// Base fixture schema for validation
export const fixtureSchema = z.object({
    id: z.string().optional(),
    tournament: z.string().default('AFCON 2025'),
    homeTeamId: z.string().min(1, 'Home team is required'),
    awayTeamId: z.string().min(1, 'Away team is required'),
    homeRecentForm: z.array(formResultSchema).max(5).default([]),
    awayRecentForm: z.array(formResultSchema).max(5).default([]),
    kickoffDateTime: z.any(), // Firestore Timestamp, validated separately
    venue: z.string().min(1, 'Venue is required'),
    groupOrStage: z.string().min(1, 'Group or stage is required'),
    status: fixtureStatusSchema.default('upcoming'),
    currentMinute: z.number().nullable().default(null),
    homeScore: z.number().int().min(0).default(0),
    awayScore: z.number().int().min(0).default(0),
    extraTime: z.boolean().default(false),
    penalties: z.boolean().default(false),
    homePenScore: z.number().int().min(0).optional(),
    awayPenScore: z.number().int().min(0).optional(),
    slug: z.string().min(1, 'Slug is required'),
    isFeatured: z.boolean().default(false),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional(),
});

// For creating new fixtures
export const createFixtureSchema = fixtureSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

// For updating fixtures (all fields optional except id)
export const updateFixtureSchema = fixtureSchema.partial().omit({
    id: true,
    createdAt: true,
});

// ============= TYPESCRIPT INTERFACES =============

export interface Fixture {
    id: string;
    tournament: string;
    homeTeamId: string; // Reference to afcon_teams document
    awayTeamId: string; // Reference to afcon_teams document
    // Optional: populated from team data for display
    homeTeamName?: string;
    homeTeamLogoUrl?: string;
    awayTeamName?: string;
    awayTeamLogoUrl?: string;
    homeRecentForm: FormResultType[];
    awayRecentForm: FormResultType[];
    kickoffDateTime: Timestamp | Date;
    venue: string;
    groupOrStage: string;
    status: FixtureStatusType;
    currentMinute: number | null;
    homeScore: number;
    awayScore: number;
    extraTime: boolean;
    penalties: boolean;
    homePenScore?: number;
    awayPenScore?: number;
    slug: string;
    isFeatured: boolean;
    // Clock fields for real-time sync
    clockStartedAt?: Timestamp | null; // When the clock was started
    clockOffsetMs?: number; // Accumulated time in milliseconds when paused
    clockIsRunning?: boolean; // Whether the clock is currently running
    addedTime?: number; // Added time in minutes (stoppage time)
    period?: 'first' | 'second' | 'et1' | 'et2' | 'penalties'; // Current period
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// For when we need to work with Date objects instead of Timestamps
export interface FixtureWithDate extends Omit<Fixture, 'kickoffDateTime' | 'createdAt' | 'updatedAt'> {
    kickoffDateTime: Date;
    createdAt: Date;
    updatedAt: Date;
}

// ============= NOTIFICATION SUBSCRIPTION =============

export const notificationChannelSchema = z.enum(['push', 'inApp']);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

export const subscriptionSchema = z.object({
    id: z.string().optional(),
    fixtureId: z.string().min(1, 'Fixture ID is required'),
    userIdentifier: z.string().min(1, 'User identifier is required'),
    channel: notificationChannelSchema.default('inApp'),
    createdAt: z.any().optional(),
});

export const createSubscriptionSchema = subscriptionSchema.omit({
    id: true,
    createdAt: true,
});

export interface FixtureNotificationSubscription {
    id: string;
    fixtureId: string;
    userIdentifier: string;
    channel: NotificationChannel;
    createdAt: Timestamp;
}

// ============= HELPER TYPES =============

// API Response types
export interface FixturesListResponse {
    fixtures: Fixture[];
    total: number;
}

export interface FixtureResponse {
    fixture: Fixture;
}

export interface SubscriptionResponse {
    subscription: FixtureNotificationSubscription;
    isSubscribed: boolean;
}

// Filter options for listing fixtures
export interface FixtureFilters {
    status?: FixtureStatusType;
    date?: string; // ISO date string for filtering by day
    team?: string; // Search by team name
    groupOrStage?: string;
    limit?: number;
    featured?: boolean;
}

// ============= UTILITY FUNCTIONS =============

/**
 * Generate a URL-friendly slug from team names and year
 * Format: {home-team}-vs-{away-team}-{year}
 * Example: liberia-vs-eswatini-2025
 */
export function generateFixtureSlug(
    homeTeam: string,
    awayTeam: string,
    kickoffDate: Date
): string {
    const homeSlug = homeTeam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const awaySlug = awayTeam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const year = kickoffDate.getFullYear();
    return `${homeSlug}-vs-${awaySlug}-${year}`;
}

/**
 * Convert Firestore Timestamp to Date
 */
export function timestampToDate(timestamp: Timestamp | Date): Date {
    if (timestamp instanceof Date) return timestamp;
    return timestamp.toDate();
}

/**
 * Check if a fixture is currently active (live or half-time)
 */
export function isFixtureActive(status: FixtureStatusType): boolean {
    return status === 'live' || status === 'ht';
}

/**
 * Get display text for fixture status
 */
export function getStatusDisplayText(status: FixtureStatusType): string {
    const statusMap: Record<FixtureStatusType, string> = {
        upcoming: 'Upcoming',
        live: 'LIVE',
        ht: 'Half Time',
        ft: 'Full Time',
        postponed: 'Postponed',
        cancelled: 'Cancelled',
    };
    return statusMap[status];
}
