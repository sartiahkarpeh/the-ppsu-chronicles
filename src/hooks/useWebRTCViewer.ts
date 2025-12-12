// React Hook for Viewing Multiple Camera Streams (Admin Side)

import { useState, useEffect, useCallback, useRef } from 'react';
import { WebRTCManager } from '@/lib/webrtc/webrtc';
import type { StreamRoom, CameraConnection } from '@/types/signalingTypes';

interface UseWebRTCViewerOptions {
    fixtureId: string;
}

interface CameraStream {
    cameraId: string;
    stream: MediaStream;
    connection: CameraConnection;
}

interface ViewerState {
    streams: Map<string, CameraStream>;
    room: StreamRoom | null;
    activeCameraId: 1 | 2 | 3 | 4 | null;
    isConnecting: boolean;
    error: string | null;
}

export function useWebRTCViewer(options: UseWebRTCViewerOptions) {
    const { fixtureId } = options;

    const managerRef = useRef<WebRTCManager | null>(null);
    const [state, setState] = useState<ViewerState>({
        streams: new Map(),
        room: null,
        activeCameraId: null,
        isConnecting: false,
        error: null,
    });

    // Initialize WebRTC manager
    useEffect(() => {
        managerRef.current = new WebRTCManager(fixtureId, 'admin');

        // Initialize room first
        managerRef.current.initializeRoom().catch(console.error);

        // Subscribe to room updates
        managerRef.current.subscribeToRoom((room) => {
            setState(prev => ({
                ...prev,
                room,
                activeCameraId: room.activeCameraId,
            }));
        });

        // Listen for camera offers
        managerRef.current.listenForOffers((cameraId, stream) => {
            console.log(`Received stream from ${cameraId}`);

            setState(prev => {
                const newStreams = new Map(prev.streams);
                const camera = prev.room?.cameras[cameraId];

                if (camera) {
                    newStreams.set(cameraId, {
                        cameraId,
                        stream,
                        connection: camera,
                    });
                }

                return { ...prev, streams: newStreams };
            });
        });

        return () => {
            if (managerRef.current) {
                managerRef.current.destroy();
                managerRef.current = null;
            }
        };
    }, [fixtureId]);

    // Set active camera for broadcast
    const setActiveCamera = useCallback(async (cameraId: 1 | 2 | 3 | 4 | null) => {
        if (!managerRef.current) return;

        try {
            await managerRef.current.setActiveCamera(cameraId);
            setState(prev => ({ ...prev, activeCameraId: cameraId }));
        } catch (error) {
            console.error('Error setting active camera:', error);
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to set active camera'
            }));
        }
    }, []);

    // Go live with specific camera
    const goLive = useCallback(async (cameraId: 1 | 2 | 3 | 4) => {
        await setActiveCamera(cameraId);
    }, [setActiveCamera]);

    // Stop live broadcast
    const stopLive = useCallback(async () => {
        await setActiveCamera(null);
    }, [setActiveCamera]);

    // Get stream for specific camera
    const getStream = useCallback((cameraId: string): MediaStream | null => {
        return state.streams.get(cameraId)?.stream || null;
    }, [state.streams]);

    // Get all connected cameras
    const getConnectedCameras = useCallback((): CameraConnection[] => {
        if (!state.room?.cameras) return [];
        return Object.values(state.room.cameras).filter(Boolean) as CameraConnection[];
    }, [state.room]);

    // Get active stream (the one being broadcast)
    const getActiveStream = useCallback((): MediaStream | null => {
        if (!state.activeCameraId) return null;
        return state.streams.get(`camera${state.activeCameraId}`)?.stream || null;
    }, [state.activeCameraId, state.streams]);

    return {
        ...state,
        streamsArray: Array.from(state.streams.values()),
        setActiveCamera,
        goLive,
        stopLive,
        getStream,
        getConnectedCameras,
        getActiveStream,
    };
}
