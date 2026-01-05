/**
 * Broadcast Recording Types
 * Types for recording live broadcasts and replay functionality
 */

import { Timestamp } from 'firebase/firestore';

// ============= RECORDING TYPES =============

export interface BroadcastRecording {
    id: string;
    fixtureId: string;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    startedAt: Timestamp;
    endedAt: Timestamp | null;
    duration: number; // in seconds
    status: RecordingStatus;
    segments: RecordingSegment[];
    cameraEvents: CameraEvent[];
    thumbnailUrl?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export type RecordingStatus = 'recording' | 'processing' | 'completed' | 'failed';

export interface RecordingSegment {
    id: string;
    segmentNumber: number;
    url: string;
    startTime: number; // offset from recording start in seconds
    duration: number;
    cameraId: 1 | 2 | 3 | 4;
    isUsingFallback: boolean;
    size?: number; // bytes
}

export interface CameraEvent {
    timestamp: number; // offset from recording start in seconds
    type: CameraEventType;
    fromCameraId?: 1 | 2 | 3 | 4;
    toCameraId?: 1 | 2 | 3 | 4;
    fallbackImageUrl?: string;
}

export type CameraEventType = 'camera-switch' | 'fallback-on' | 'fallback-off' | 'recording-start' | 'recording-stop';

// ============= RECORDING SESSION =============

export interface RecordingSession {
    recordingId: string;
    fixtureId: string;
    startTime: number; // Date.now() when recording started
    currentSegment: number;
    isActive: boolean;
    events: CameraEvent[];
}

// ============= REPLAY TYPES =============

export interface ReplayState {
    recording: BroadcastRecording | null;
    isLoading: boolean;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    currentSegmentIndex: number;
    error: string | null;
}

// ============= API RESPONSE TYPES =============

export interface RecordingsListResponse {
    recordings: BroadcastRecording[];
    total: number;
}

export interface RecordingResponse {
    recording: BroadcastRecording;
}

// ============= UTILITY FUNCTIONS =============

/**
 * Find the camera event active at a given timestamp
 */
export function getCameraStateAtTime(
    events: CameraEvent[],
    timestamp: number
): { cameraId: 1 | 2 | 3 | 4 | null; isUsingFallback: boolean; fallbackUrl?: string } {
    let currentCameraId: 1 | 2 | 3 | 4 | null = null;
    let isUsingFallback = false;
    let fallbackUrl: string | undefined;

    // Sort events by timestamp and find state at given time
    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

    for (const event of sortedEvents) {
        if (event.timestamp > timestamp) break;

        switch (event.type) {
            case 'camera-switch':
                currentCameraId = event.toCameraId || null;
                isUsingFallback = false;
                break;
            case 'fallback-on':
                isUsingFallback = true;
                fallbackUrl = event.fallbackImageUrl;
                break;
            case 'fallback-off':
                isUsingFallback = false;
                break;
        }
    }

    return { cameraId: currentCameraId, isUsingFallback, fallbackUrl };
}

/**
 * Find segment containing the given timestamp
 */
export function findSegmentAtTime(
    segments: RecordingSegment[],
    timestamp: number
): RecordingSegment | null {
    for (const segment of segments) {
        if (timestamp >= segment.startTime && timestamp < segment.startTime + segment.duration) {
            return segment;
        }
    }
    return null;
}

/**
 * Format recording duration for display
 */
export function formatRecordingDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
