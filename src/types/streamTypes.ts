// Basketball Live Stream Types
// Used for real-time video streaming from admin broadcaster to public viewers
// Architecture: LiveKit Cloud SFU (broadcaster -> LiveKit -> unlimited viewers)

import { Timestamp } from 'firebase/firestore';

// ============= STREAM SESSION =============

export type StreamStatus = 'idle' | 'live' | 'ended';

export interface StreamSession {
    id: string;
    gameId: string;
    status: StreamStatus;
    startedAt: Timestamp | null;
    endedAt: Timestamp | null;
    viewerPeak: number;
    currentViewers: number;
    roomId: string;
    broadcasterId: string;
    resolution: string; // e.g. "1280x720"
    recordingUrl?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============= STREAM COMMENTS & REACTIONS =============

export interface StreamComment {
    id?: string;
    streamId: string;
    gameId: string;
    guestId: string;
    guestName: string;
    text: string;
    timestamp: Timestamp;
}

export interface StreamReaction {
    id?: string;
    streamId: string;
    gameId: string;
    guestId: string;
    emoji: string;
    timestamp: Timestamp;
}

export const STREAM_REACTIONS = ['🏀', '🔥', '👏', '😱', '💯'] as const;

// ============= VIEWER TRACKING =============

export interface StreamViewer {
    id: string;
    streamId: string;
    guestId: string;
    joinedAt: Timestamp;
    isActive: boolean;
}

// ============= BROADCASTER SETTINGS =============

export interface BroadcasterSettings {
    resolution: '1280x720' | '1920x1080';
    frameRate: 30 | 60;
    facingMode: 'user' | 'environment';
    audioBitrate: number;
    videoBitrate: number;
}

export const DEFAULT_BROADCASTER_SETTINGS: BroadcasterSettings = {
    resolution: '1280x720',
    frameRate: 30,
    facingMode: 'environment',
    audioBitrate: 128000,
    videoBitrate: 2500000,
};
