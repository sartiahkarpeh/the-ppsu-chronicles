/**
 * Halala Khumalo memorial live stream types.
 *
 * Architecture mirrors the basketball stream (LiveKit Cloud SFU): the admin's
 * phone publishes one WebRTC connection to LiveKit, which fans out to unlimited
 * viewers on /halala. Firestore holds the stream status, chat and reactions.
 *
 * Unlike basketball there is only ever ONE memorial stream, so the status lives
 * in a single fixed document rather than a per-game collection.
 */

import { Timestamp } from 'firebase/firestore';

/** LiveKit room the memorial service is broadcast to. */
export const MEMORIAL_ROOM = 'halala-memorial';

/** Firestore paths. */
export const MEMORIAL_STREAM_DOC = 'halala_stream/current';
export const MEMORIAL_STREAM_COLLECTION = 'halala_stream';
export const MEMORIAL_STREAM_DOC_ID = 'current';
export const MEMORIAL_MESSAGES = 'halala_stream_messages';
export const MEMORIAL_REACTIONS = 'halala_stream_reactions';

export type MemorialStreamStatus = 'offline' | 'live' | 'ended';

export interface MemorialStreamState {
    status: MemorialStreamStatus;
    startedAt: Timestamp | null;
    endedAt: Timestamp | null;
    currentViewers: number;
    viewerPeak: number;
    /** Optional line shown under the player, e.g. "Funeral service — Mbabane". */
    title: string;
    updatedAt: Timestamp | null;
}

export interface MemorialMessage {
    id?: string;
    guestId: string;
    guestName: string;
    country: string;
    text: string;
    createdAt: Timestamp | null;
}

export interface MemorialReaction {
    id?: string;
    guestId: string;
    emoji: string;
    createdAt: Timestamp | null;
}

/**
 * Reactions are deliberately gentle — this is a funeral service, not a match.
 */
export const MEMORIAL_REACTION_EMOJIS = ['🕯️', '❤️', '🙏', '🕊️', '🌹'] as const;

export const MAX_MESSAGE_LENGTH = 300;

export interface BroadcasterSettings {
    resolution: '1280x720' | '1920x1080';
    frameRate: 30 | 60;
    facingMode: 'user' | 'environment';
}

export const DEFAULT_MEMORIAL_BROADCASTER_SETTINGS: BroadcasterSettings = {
    resolution: '1280x720',
    frameRate: 30,
    facingMode: 'environment',
};
