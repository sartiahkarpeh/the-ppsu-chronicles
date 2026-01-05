/**
 * useBroadcastRecorder Hook
 * React hook for managing broadcast recording in the admin dashboard
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BroadcastRecorder } from '@/lib/broadcast/BroadcastRecorder';
import type { CameraEvent } from '@/types/recordingTypes';

interface UseBroadcastRecorderOptions {
    fixtureId: string;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
}

interface UseBroadcastRecorderReturn {
    isRecording: boolean;
    recordingId: string | null;
    recordingDuration: number;
    startRecording: (stream: MediaStream, cameraId: 1 | 2 | 3 | 4) => Promise<string>;
    stopRecording: () => Promise<string | null>;
    recordCameraSwitch: (fromCameraId: 1 | 2 | 3 | 4 | undefined, toCameraId: 1 | 2 | 3 | 4) => void;
    recordFallbackToggle: (isOn: boolean, fallbackImageUrl?: string) => void;
    switchStream: (newStream: MediaStream, cameraId: 1 | 2 | 3 | 4) => Promise<void>;
}

export function useBroadcastRecorder(options: UseBroadcastRecorderOptions): UseBroadcastRecorderReturn {
    const recorderRef = useRef<BroadcastRecorder | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingId, setRecordingId] = useState<string | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);

    // Initialize recorder
    useEffect(() => {
        recorderRef.current = new BroadcastRecorder(options);

        // Set duration update callback
        recorderRef.current.setOnDurationUpdate((duration) => {
            setRecordingDuration(duration);
        });

        // Cleanup on unmount - try to save recording
        return () => {
            if (recorderRef.current?.isRecording()) {
                console.warn('[useBroadcastRecorder] Component unmounting while recording - stopping...');
                recorderRef.current.stopRecording().catch(console.error);
            }
        };
    }, [options.fixtureId]);

    // Handle beforeunload - warn user and try to save
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isRecording) {
                e.preventDefault();
                e.returnValue = 'Recording in progress. Are you sure you want to leave?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isRecording]);

    // Start recording
    const startRecording = useCallback(async (stream: MediaStream, cameraId: 1 | 2 | 3 | 4): Promise<string> => {
        if (!recorderRef.current) {
            throw new Error('Recorder not initialized');
        }

        const id = await recorderRef.current.startRecording(stream, cameraId);
        setIsRecording(true);
        setRecordingId(id);
        setRecordingDuration(0);
        return id;
    }, []);

    // Stop recording
    const stopRecording = useCallback(async (): Promise<string | null> => {
        if (!recorderRef.current) {
            return null;
        }

        const id = await recorderRef.current.stopRecording();
        setIsRecording(false);
        setRecordingId(null);
        setRecordingDuration(0);
        return id;
    }, []);

    // Record camera switch
    const recordCameraSwitch = useCallback((fromCameraId: 1 | 2 | 3 | 4 | undefined, toCameraId: 1 | 2 | 3 | 4) => {
        recorderRef.current?.recordCameraSwitch(fromCameraId, toCameraId);
    }, []);

    // Record fallback toggle
    const recordFallbackToggle = useCallback((isOn: boolean, fallbackImageUrl?: string) => {
        recorderRef.current?.recordFallbackToggle(isOn, fallbackImageUrl);
    }, []);

    // Switch stream
    const switchStream = useCallback(async (newStream: MediaStream, cameraId: 1 | 2 | 3 | 4) => {
        await recorderRef.current?.switchStream(newStream, cameraId);
    }, []);

    return {
        isRecording,
        recordingId,
        recordingDuration,
        startRecording,
        stopRecording,
        recordCameraSwitch,
        recordFallbackToggle,
        switchStream,
    };
}

/**
 * Format duration for display (MM:SS or HH:MM:SS)
 */
export function formatRecordingTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
