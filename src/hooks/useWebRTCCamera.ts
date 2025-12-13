// React Hook for Camera Streaming (Smartphone Side)

import { useState, useEffect, useCallback, useRef } from 'react';
import { WebRTCManager } from '@/lib/webrtc/webrtc';
import type { StreamRoom } from '@/types/signalingTypes';

interface UseCameraStreamOptions {
    fixtureId: string;
    cameraId: 1 | 2 | 3 | 4;
    deviceName?: string;
    autoStart?: boolean;
}

interface ZoomCapabilities {
    min: number;
    max: number;
    step: number;
    supported: boolean;
}

interface CameraStreamState {
    localStream: MediaStream | null;
    isConnecting: boolean;
    isConnected: boolean;
    isStreaming: boolean;
    isLive: boolean; // Is this camera the active broadcast
    error: string | null;
    room: StreamRoom | null;
    zoomLevel: number;
    zoomCapabilities: ZoomCapabilities;
}

// Predefined zoom levels to match native camera apps
const ZOOM_PRESETS = [0.5, 1, 2, 5];

export function useWebRTCCamera(options: UseCameraStreamOptions) {
    const { fixtureId, cameraId, deviceName, autoStart = false } = options;

    const managerRef = useRef<WebRTCManager | null>(null);
    const [state, setState] = useState<CameraStreamState>({
        localStream: null,
        isConnecting: false,
        isConnected: false,
        isStreaming: false,
        isLive: false,
        error: null,
        room: null,
        zoomLevel: 1,
        zoomCapabilities: { min: 1, max: 1, step: 0.1, supported: false },
    });

    // Initialize WebRTC manager
    useEffect(() => {
        managerRef.current = new WebRTCManager(fixtureId, 'camera');

        // Subscribe to room updates
        managerRef.current.subscribeToRoom((room) => {
            setState(prev => ({
                ...prev,
                room,
                isLive: room.activeCameraId === cameraId,
            }));
        });

        return () => {
            if (managerRef.current) {
                managerRef.current.destroy();
                managerRef.current = null;
            }
        };
    }, [fixtureId, cameraId]);

    // Get zoom capabilities from video track
    const updateZoomCapabilities = useCallback((stream: MediaStream) => {
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) return;

        try {
            // Get capabilities - note: this may not be available in all browsers
            const capabilities = videoTrack.getCapabilities?.() as any;

            if (capabilities?.zoom) {
                setState(prev => ({
                    ...prev,
                    zoomCapabilities: {
                        min: capabilities.zoom.min || 1,
                        max: capabilities.zoom.max || 1,
                        step: capabilities.zoom.step || 0.1,
                        supported: true,
                    },
                }));
            } else {
                setState(prev => ({
                    ...prev,
                    zoomCapabilities: { min: 1, max: 1, step: 0.1, supported: false },
                }));
            }
        } catch (error) {
            console.warn('Zoom capabilities not available:', error);
        }
    }, []);

    // Set zoom level
    const setZoom = useCallback(async (level: number) => {
        if (!state.localStream) return;

        const videoTrack = state.localStream.getVideoTracks()[0];
        if (!videoTrack) return;

        try {
            // Clamp level to available range
            const { min, max } = state.zoomCapabilities;
            const clampedLevel = Math.max(min, Math.min(max, level));

            // Apply zoom constraint
            await videoTrack.applyConstraints({
                advanced: [{ zoom: clampedLevel } as any],
            });

            setState(prev => ({ ...prev, zoomLevel: clampedLevel }));
        } catch (error) {
            console.error('Error setting zoom:', error);
            // Zoom might not be supported
        }
    }, [state.localStream, state.zoomCapabilities]);

    // Start camera preview
    const startPreview = useCallback(async () => {
        if (!managerRef.current) return;

        setState(prev => ({ ...prev, isConnecting: true, error: null }));

        try {
            const stream = await managerRef.current.getLocalStream('environment');

            // Update zoom capabilities after getting stream
            updateZoomCapabilities(stream);

            setState(prev => ({
                ...prev,
                localStream: stream,
                isConnecting: false,
                zoomLevel: 1, // Reset zoom to 1x
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
            setState(prev => ({
                ...prev,
                isConnecting: false,
                error: errorMessage
            }));
        }
    }, [updateZoomCapabilities]);

    // Stop camera preview
    const stopPreview = useCallback(() => {
        if (state.localStream) {
            state.localStream.getTracks().forEach(track => track.stop());
            setState(prev => ({
                ...prev,
                localStream: null,
                zoomLevel: 1,
                zoomCapabilities: { min: 1, max: 1, step: 0.1, supported: false },
            }));
        }
    }, [state.localStream]);

    // Start streaming to admin
    const startStreaming = useCallback(async () => {
        if (!managerRef.current || !state.localStream) {
            setState(prev => ({ ...prev, error: 'Camera not ready' }));
            return;
        }

        setState(prev => ({ ...prev, isConnecting: true, error: null }));

        try {
            // Initialize room
            await managerRef.current.initializeRoom();

            // Register camera
            await managerRef.current.registerCamera(cameraId, deviceName);

            // Create offer and start streaming
            await managerRef.current.createOffer();

            // Listen for answers and remote zoom commands
            managerRef.current.listenForAnswers((zoomLevel) => {
                // Handle remote zoom command from admin
                setZoom(zoomLevel);
            });

            setState(prev => ({
                ...prev,
                isConnecting: false,
                isConnected: true,
                isStreaming: true
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to start streaming';
            setState(prev => ({
                ...prev,
                isConnecting: false,
                error: errorMessage
            }));
        }
    }, [cameraId, deviceName, state.localStream]);

    // Stop streaming
    const stopStreaming = useCallback(async () => {
        if (!managerRef.current) return;

        try {
            await managerRef.current.unregisterCamera();
            managerRef.current.destroy();

            // Reinitialize for potential reconnection
            managerRef.current = new WebRTCManager(fixtureId, 'camera');

            setState(prev => ({
                ...prev,
                isConnected: false,
                isStreaming: false,
                isLive: false,
            }));
        } catch (error) {
            console.error('Error stopping stream:', error);
        }
    }, [fixtureId]);

    // Toggle camera (front/back)
    const toggleCamera = useCallback(async () => {
        if (!managerRef.current || !state.localStream) return;

        const videoTrack = state.localStream.getVideoTracks()[0];
        if (!videoTrack) return;

        const settings = videoTrack.getSettings();
        const currentFacing = settings.facingMode;
        const newFacing = currentFacing === 'environment' ? 'user' : 'environment';

        // Get new stream with different camera
        try {
            const stream = await managerRef.current.getLocalStream(newFacing);

            // Update zoom capabilities for new camera
            updateZoomCapabilities(stream);

            setState(prev => ({
                ...prev,
                localStream: stream,
                zoomLevel: 1, // Reset zoom when switching cameras
            }));
        } catch (error) {
            console.error('Error toggling camera:', error);
        }
    }, [state.localStream, updateZoomCapabilities]);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (!state.localStream) return;

        const audioTrack = state.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
        }
    }, [state.localStream]);

    // Auto-start if enabled
    useEffect(() => {
        if (autoStart && !state.localStream && !state.isConnecting) {
            startPreview();
        }
    }, [autoStart, state.localStream, state.isConnecting, startPreview]);

    // Get available zoom presets based on capabilities
    const availableZoomPresets = ZOOM_PRESETS.filter(
        level => level >= state.zoomCapabilities.min && level <= state.zoomCapabilities.max
    );

    return {
        ...state,
        startPreview,
        stopPreview,
        startStreaming,
        stopStreaming,
        toggleCamera,
        toggleMute,
        setZoom,
        availableZoomPresets,
    };
}

