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
    /** Photo held over the live feed, or null to show the camera. */
    photo: string | null;
    updatedAt: Timestamp | null;
}

/**
 * Photos the broadcaster can hold over the live feed — e.g. resting on a
 * portrait of Halala while a eulogy is read. Audio keeps playing underneath.
 *
 * These are the files in /public/halala. Adding a photo there means adding a
 * line here too: the server only accepts a path from this list, so a stolen
 * admin token can't point the memorial page at an arbitrary image.
 */
export const MEMORIAL_PHOTOS = [
    { src: '/halala/pic1.jpeg', label: 'Photo 1' },
    { src: '/halala/pic2.jpeg', label: 'Photo 2' },
    { src: '/halala/pic3.jpeg', label: 'Photo 3' },
    { src: '/halala/pic4.jpeg', label: 'Photo 4' },
] as const;

export const MEMORIAL_PHOTO_SRCS: readonly string[] = MEMORIAL_PHOTOS.map((p) => p.src);

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
