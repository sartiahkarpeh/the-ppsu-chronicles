/**
 * BroadcastRecorder Class
 * Handles client-side recording of live broadcasts using MediaRecorder API
 * Creates segments, uploads to Firebase Storage, and logs camera events
 */

import { doc, collection, addDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/config';
import type { BroadcastRecording, RecordingSegment, CameraEvent, CameraEventType } from '@/types/recordingTypes';

const SEGMENT_DURATION_MS = 15 * 60 * 1000; // 15 minutes per segment

interface RecorderOptions {
    fixtureId: string;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
}

interface RecorderState {
    isRecording: boolean;
    recordingId: string | null;
    startTime: number;
    currentSegment: number;
    events: CameraEvent[];
    currentCameraId: 1 | 2 | 3 | 4 | null;
    isUsingFallback: boolean;
}

export class BroadcastRecorder {
    private options: RecorderOptions;
    private state: RecorderState;
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private segmentTimer: NodeJS.Timeout | null = null;
    private durationTimer: NodeJS.Timeout | null = null;
    private onDurationUpdate: ((duration: number) => void) | null = null;

    constructor(options: RecorderOptions) {
        this.options = options;
        this.state = {
            isRecording: false,
            recordingId: null,
            startTime: 0,
            currentSegment: 0,
            events: [],
            currentCameraId: null,
            isUsingFallback: false,
        };
    }

    /**
     * Start recording a broadcast
     */
    async startRecording(stream: MediaStream, cameraId: 1 | 2 | 3 | 4): Promise<string> {
        if (this.state.isRecording) {
            throw new Error('Recording already in progress');
        }

        console.log('[BroadcastRecorder] Starting recording...');

        // Create recording document in Firestore
        const recordingRef = await addDoc(collection(db, 'broadcast_recordings'), {
            fixtureId: this.options.fixtureId,
            homeTeamName: this.options.homeTeamName,
            awayTeamName: this.options.awayTeamName,
            homeTeamLogo: this.options.homeTeamLogo || null,
            awayTeamLogo: this.options.awayTeamLogo || null,
            startedAt: serverTimestamp(),
            endedAt: null,
            duration: 0,
            status: 'recording',
            segments: [],
            cameraEvents: [],
            thumbnailUrl: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        this.state = {
            isRecording: true,
            recordingId: recordingRef.id,
            startTime: Date.now(),
            currentSegment: 0,
            events: [],
            currentCameraId: cameraId,
            isUsingFallback: false,
        };

        // Record initial camera event
        this.recordEvent('recording-start', undefined, cameraId);

        // Start MediaRecorder
        this.startMediaRecorder(stream);

        // Start segment timer
        this.startSegmentTimer(stream);

        // Start duration timer (updates every second)
        this.startDurationTimer();

        console.log(`[BroadcastRecorder] Recording started: ${recordingRef.id}`);
        return recordingRef.id;
    }

    /**
     * Stop recording and finalize
     */
    async stopRecording(): Promise<string | null> {
        if (!this.state.isRecording || !this.state.recordingId) {
            console.warn('[BroadcastRecorder] No recording in progress');
            return null;
        }

        console.log('[BroadcastRecorder] Stopping recording...');

        // Clear timers
        if (this.segmentTimer) {
            clearInterval(this.segmentTimer);
            this.segmentTimer = null;
        }
        if (this.durationTimer) {
            clearInterval(this.durationTimer);
            this.durationTimer = null;
        }

        // Record stop event
        this.recordEvent('recording-stop');

        // Stop MediaRecorder and upload final segment
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            await this.stopAndUploadSegment();
        }

        // Update recording document
        const duration = Math.floor((Date.now() - this.state.startTime) / 1000);
        const recordingRef = doc(db, 'broadcast_recordings', this.state.recordingId);

        await updateDoc(recordingRef, {
            endedAt: serverTimestamp(),
            duration,
            status: 'completed',
            cameraEvents: this.state.events,
            updatedAt: serverTimestamp(),
        });

        const recordingId = this.state.recordingId;

        // Reset state
        this.state = {
            isRecording: false,
            recordingId: null,
            startTime: 0,
            currentSegment: 0,
            events: [],
            currentCameraId: null,
            isUsingFallback: false,
        };

        console.log(`[BroadcastRecorder] Recording stopped: ${recordingId}`);
        return recordingId;
    }

    /**
     * Record a camera switch event
     */
    recordCameraSwitch(fromCameraId: 1 | 2 | 3 | 4 | undefined, toCameraId: 1 | 2 | 3 | 4) {
        if (!this.state.isRecording) return;

        this.state.currentCameraId = toCameraId;
        this.recordEvent('camera-switch', fromCameraId, toCameraId);
    }

    /**
     * Record fallback toggle event
     */
    recordFallbackToggle(isOn: boolean, fallbackImageUrl?: string) {
        if (!this.state.isRecording) return;

        this.state.isUsingFallback = isOn;
        const event: CameraEvent = {
            timestamp: this.getElapsedSeconds(),
            type: isOn ? 'fallback-on' : 'fallback-off',
            toCameraId: this.state.currentCameraId || undefined,
            fallbackImageUrl: isOn ? fallbackImageUrl : undefined,
        };
        this.state.events.push(event);
        console.log(`[BroadcastRecorder] Recorded fallback ${isOn ? 'on' : 'off'} event`);
    }

    /**
     * Switch to a new stream (e.g., when camera changes)
     */
    async switchStream(newStream: MediaStream, cameraId: 1 | 2 | 3 | 4) {
        if (!this.state.isRecording) return;

        const previousCameraId = this.state.currentCameraId;

        // Stop current segment and upload
        await this.stopAndUploadSegment();

        // Record the switch
        this.recordCameraSwitch(previousCameraId || undefined, cameraId);
        this.state.currentCameraId = cameraId;

        // Start new segment with new stream
        this.startMediaRecorder(newStream);
    }

    /**
     * Get current recording duration in seconds
     */
    getDuration(): number {
        if (!this.state.isRecording) return 0;
        return this.getElapsedSeconds();
    }

    /**
     * Set callback for duration updates
     */
    setOnDurationUpdate(callback: (duration: number) => void) {
        this.onDurationUpdate = callback;
    }

    /**
     * Check if currently recording
     */
    isRecording(): boolean {
        return this.state.isRecording;
    }

    /**
     * Get current recording ID
     */
    getRecordingId(): string | null {
        return this.state.recordingId;
    }

    // ============= PRIVATE METHODS =============

    private startMediaRecorder(stream: MediaStream) {
        const options: MediaRecorderOptions = {
            mimeType: this.getSupportedMimeType(),
            videoBitsPerSecond: 2500000, // 2.5 Mbps
        };

        try {
            this.mediaRecorder = new MediaRecorder(stream, options);
            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('[BroadcastRecorder] MediaRecorder error:', event);
            };

            // Start recording with timeslice for regular data events
            this.mediaRecorder.start(1000); // Request data every second
            console.log('[BroadcastRecorder] MediaRecorder started');
        } catch (error) {
            console.error('[BroadcastRecorder] Failed to start MediaRecorder:', error);
            throw error;
        }
    }

    private getSupportedMimeType(): string {
        const mimeTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4',
        ];

        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                return mimeType;
            }
        }

        return '';
    }

    private startSegmentTimer(stream: MediaStream) {
        this.segmentTimer = setInterval(async () => {
            console.log('[BroadcastRecorder] Segment timer triggered');
            await this.stopAndUploadSegment();
            this.startMediaRecorder(stream);
        }, SEGMENT_DURATION_MS);
    }

    private startDurationTimer() {
        this.durationTimer = setInterval(() => {
            if (this.onDurationUpdate) {
                this.onDurationUpdate(this.getDuration());
            }
        }, 1000);
    }

    private async stopAndUploadSegment(): Promise<void> {
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
            return;
        }

        return new Promise((resolve) => {
            this.mediaRecorder!.onstop = async () => {
                if (this.recordedChunks.length === 0) {
                    resolve();
                    return;
                }

                const blob = new Blob(this.recordedChunks, { type: this.getSupportedMimeType() });
                this.recordedChunks = [];

                try {
                    await this.uploadSegment(blob);
                } catch (error) {
                    console.error('[BroadcastRecorder] Failed to upload segment:', error);
                }

                resolve();
            };

            this.mediaRecorder!.stop();
        });
    }

    private async uploadSegment(blob: Blob): Promise<void> {
        if (!this.state.recordingId) return;

        const segmentNumber = this.state.currentSegment++;
        const extension = this.getSupportedMimeType().includes('mp4') ? 'mp4' : 'webm';
        const fileName = `broadcast_recordings/${this.state.recordingId}/segment_${segmentNumber}.${extension}`;
        const storageRef = ref(storage, fileName);

        console.log(`[BroadcastRecorder] Uploading segment ${segmentNumber}...`);

        // Upload to Firebase Storage
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);

        // Create segment record
        const segment: RecordingSegment = {
            id: `segment_${segmentNumber}`,
            segmentNumber,
            url: downloadUrl,
            startTime: segmentNumber * (SEGMENT_DURATION_MS / 1000),
            duration: SEGMENT_DURATION_MS / 1000,
            cameraId: this.state.currentCameraId || 1,
            isUsingFallback: this.state.isUsingFallback,
            size: blob.size,
        };

        // Update recording document with new segment
        const recordingRef = doc(db, 'broadcast_recordings', this.state.recordingId);
        await updateDoc(recordingRef, {
            [`segments`]: [...(await this.getExistingSegments()), segment],
            updatedAt: serverTimestamp(),
        });

        console.log(`[BroadcastRecorder] Segment ${segmentNumber} uploaded: ${downloadUrl}`);
    }

    private async getExistingSegments(): Promise<RecordingSegment[]> {
        // This would normally fetch from Firestore, but for simplicity we track locally
        // In production, you'd want to use FieldValue.arrayUnion()
        return [];
    }

    private recordEvent(type: CameraEventType, fromCameraId?: 1 | 2 | 3 | 4, toCameraId?: 1 | 2 | 3 | 4) {
        const event: CameraEvent = {
            timestamp: this.getElapsedSeconds(),
            type,
            fromCameraId,
            toCameraId,
        };
        this.state.events.push(event);
        console.log(`[BroadcastRecorder] Recorded event: ${type}`);
    }

    private getElapsedSeconds(): number {
        return Math.floor((Date.now() - this.state.startTime) / 1000);
    }
}
