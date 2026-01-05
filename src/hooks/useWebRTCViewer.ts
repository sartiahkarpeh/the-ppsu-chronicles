// React Hook for Viewing Multiple Camera Streams (Admin Side)

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/firebase/config';
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

interface CameraFallbackState {
    isUsingFallback: boolean;
    fallbackUrl: string | null;
    isUploading: boolean;
}

interface ViewerState {
    streams: Map<string, CameraStream>;
    room: StreamRoom | null;
    activeCameraId: 1 | 2 | 3 | 4 | null;
    isConnecting: boolean;
    error: string | null;
    fallbackUploading: Map<string, boolean>;
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
        fallbackUploading: new Map(),
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

    // ============= FALLBACK MANAGEMENT =============

    // Upload fallback image for a camera
    const uploadCameraFallback = useCallback(async (cameraId: 1 | 2 | 3 | 4, file: File): Promise<string> => {
        const cameraKey = `camera${cameraId}`;

        // Set uploading state
        setState(prev => {
            const newUploading = new Map(prev.fallbackUploading);
            newUploading.set(cameraKey, true);
            return { ...prev, fallbackUploading: newUploading };
        });

        try {
            const ext = file.name.split('.').pop() || 'jpg';
            const fileName = `broadcast_fallbacks/${fixtureId}/${cameraKey}_${Date.now()}.${ext}`;
            const storageRef = ref(storage, fileName);

            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            // Update the camera connection in Firestore
            const roomRef = doc(db, 'broadcast_rooms', fixtureId);
            await updateDoc(roomRef, {
                [`cameras.${cameraKey}.fallbackImageUrl`]: downloadUrl,
            });

            console.log(`[Fallback] Uploaded fallback for ${cameraKey}: ${downloadUrl}`);
            return downloadUrl;
        } catch (error) {
            console.error(`[Fallback] Error uploading fallback for ${cameraKey}:`, error);
            throw error;
        } finally {
            setState(prev => {
                const newUploading = new Map(prev.fallbackUploading);
                newUploading.set(cameraKey, false);
                return { ...prev, fallbackUploading: newUploading };
            });
        }
    }, [fixtureId]);

    // Remove fallback image for a camera
    const removeCameraFallback = useCallback(async (cameraId: 1 | 2 | 3 | 4): Promise<void> => {
        const cameraKey = `camera${cameraId}`;
        const camera = state.room?.cameras[cameraKey];

        try {
            // Delete from storage if URL exists
            if (camera?.fallbackImageUrl) {
                try {
                    const storageRef = ref(storage, camera.fallbackImageUrl);
                    await deleteObject(storageRef);
                } catch (e) {
                    // Ignore if file doesn't exist
                    console.warn(`[Fallback] Could not delete storage file:`, e);
                }
            }

            // Update Firestore
            const roomRef = doc(db, 'broadcast_rooms', fixtureId);
            await updateDoc(roomRef, {
                [`cameras.${cameraKey}.fallbackImageUrl`]: null,
                [`cameras.${cameraKey}.isUsingFallback`]: false,
            });

            console.log(`[Fallback] Removed fallback for ${cameraKey}`);
        } catch (error) {
            console.error(`[Fallback] Error removing fallback for ${cameraKey}:`, error);
            throw error;
        }
    }, [fixtureId, state.room]);

    // Toggle fallback mode for a camera
    const toggleCameraFallback = useCallback(async (cameraId: 1 | 2 | 3 | 4): Promise<void> => {
        const cameraKey = `camera${cameraId}`;
        const camera = state.room?.cameras[cameraKey];

        if (!camera?.fallbackImageUrl) {
            console.warn(`[Fallback] No fallback image set for ${cameraKey}`);
            return;
        }

        const newState = !camera.isUsingFallback;

        try {
            const roomRef = doc(db, 'broadcast_rooms', fixtureId);
            await updateDoc(roomRef, {
                [`cameras.${cameraKey}.isUsingFallback`]: newState,
            });

            console.log(`[Fallback] ${cameraKey} fallback ${newState ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error(`[Fallback] Error toggling fallback for ${cameraKey}:`, error);
            throw error;
        }
    }, [fixtureId, state.room]);

    // Get fallback state for a camera
    const getCameraFallbackState = useCallback((cameraId: 1 | 2 | 3 | 4): CameraFallbackState => {
        const cameraKey = `camera${cameraId}`;
        const camera = state.room?.cameras[cameraKey];

        return {
            isUsingFallback: camera?.isUsingFallback || false,
            fallbackUrl: camera?.fallbackImageUrl || null,
            isUploading: state.fallbackUploading.get(cameraKey) || false,
        };
    }, [state.room, state.fallbackUploading]);

    return {
        ...state,
        streamsArray: Array.from(state.streams.values()),
        setActiveCamera,
        goLive,
        stopLive,
        getStream,
        getConnectedCameras,
        getActiveStream,
        // Fallback management
        uploadCameraFallback,
        removeCameraFallback,
        toggleCameraFallback,
        getCameraFallbackState,
    };
}

