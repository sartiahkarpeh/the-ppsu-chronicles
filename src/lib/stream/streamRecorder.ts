/**
 * StreamRecorder
 * 
 * Client-side recording of outgoing broadcast stream using MediaRecorder API.
 * Records in WebM format and offers auto-download + optional Firebase Storage upload.
 * Adapted from the existing BroadcastRecorder pattern.
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/firebase/config';

export class StreamRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private isRecording = false;
    private startTime = 0;
    private onDurationUpdate?: (seconds: number) => void;
    private durationInterval: NodeJS.Timeout | null = null;

    constructor(callbacks?: { onDurationUpdate?: (seconds: number) => void }) {
        this.onDurationUpdate = callbacks?.onDurationUpdate;
    }

    // Start recording a stream
    startRecording(stream: MediaStream): void {
        if (this.isRecording) return;

        const mimeType = this.getSupportedMimeType();
        if (!mimeType) {
            console.error('[StreamRecorder] No supported mime type found');
            return;
        }

        try {
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 2500000, // 2.5 Mbps
            });

            this.recordedChunks = [];
            this.startTime = Date.now();
            this.isRecording = true;

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('[StreamRecorder] Error:', event);
            };

            this.mediaRecorder.start(1000); // Request data every second

            // Duration timer
            this.durationInterval = setInterval(() => {
                const seconds = Math.floor((Date.now() - this.startTime) / 1000);
                this.onDurationUpdate?.(seconds);
            }, 1000);

            console.log('[StreamRecorder] Recording started');
        } catch (error) {
            console.error('[StreamRecorder] Failed to start recording:', error);
        }
    }

    // Stop recording and return the blob
    async stopRecording(): Promise<Blob | null> {
        if (!this.isRecording || !this.mediaRecorder) return null;

        if (this.durationInterval) {
            clearInterval(this.durationInterval);
            this.durationInterval = null;
        }

        return new Promise((resolve) => {
            this.mediaRecorder!.onstop = () => {
                const mimeType = this.getSupportedMimeType();
                const blob = new Blob(this.recordedChunks, { type: mimeType });
                this.recordedChunks = [];
                this.isRecording = false;
                console.log(`[StreamRecorder] Recording stopped. Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
                resolve(blob);
            };

            if (this.mediaRecorder!.state !== 'inactive') {
                this.mediaRecorder!.stop();
            } else {
                this.isRecording = false;
                resolve(null);
            }
        });
    }

    // Auto-download the recording
    downloadRecording(blob: Blob, gameId: string): void {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stream_${gameId}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Upload recording to Firebase Storage
    async uploadRecording(blob: Blob, streamId: string, gameId: string): Promise<string> {
        const fileName = `stream_recordings/${gameId}/${streamId}.webm`;
        const storageRef = ref(storage, fileName);

        console.log('[StreamRecorder] Uploading recording...');
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);

        // Update stream doc with recording URL
        await updateDoc(doc(db, 'basketball_streams', streamId), {
            recordingUrl: downloadUrl,
            updatedAt: serverTimestamp(),
        });

        console.log('[StreamRecorder] Recording uploaded:', downloadUrl);
        return downloadUrl;
    }

    // Get duration in seconds
    getDuration(): number {
        if (!this.isRecording) return 0;
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    // Check if recording
    getIsRecording(): boolean {
        return this.isRecording;
    }

    private getSupportedMimeType(): string {
        const mimeTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4',
        ];

        for (const mimeType of mimeTypes) {
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)) {
                return mimeType;
            }
        }

        return 'video/webm';
    }
}
