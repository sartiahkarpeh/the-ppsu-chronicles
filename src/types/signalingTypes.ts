// WebRTC Signaling Types for Multi-Camera Streaming

export interface CameraConnection {
    cameraId: 1 | 2 | 3 | 4;
    fixtureId: string;
    status: 'connecting' | 'connected' | 'streaming' | 'disconnected';
    deviceName?: string;
    connectedAt?: string;
}

export interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'viewer-request';
    from: string; // Camera ID, 'admin', or viewer ID
    to: string;   // Camera ID, 'admin', or viewer ID
    fixtureId: string;
    payload?: RTCSessionDescriptionInit | RTCIceCandidateInit | Record<string, unknown>;
}

export interface StreamRoom {
    fixtureId: string;
    cameras: {
        [key: string]: CameraConnection;
    };
    activeCameraId: 1 | 2 | 3 | 4 | null;
    isLive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface BroadcastState {
    fixtureId: string;
    activeCameraId: 1 | 2 | 3 | 4 | null;
    isLive: boolean;
    viewerCount: number;
}

export interface WebRTCConfig {
    iceServers: RTCIceServer[];
    iceCandidatePoolSize?: number;
}

// Default STUN servers (free, public)
export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
];
