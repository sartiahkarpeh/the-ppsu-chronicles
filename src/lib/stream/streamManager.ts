/**
 * BasketballStreamManager
 * 
 * Manages video streaming for basketball games using LiveKit Cloud.
 * 
 * Architecture: LiveKit Cloud SFU
 * - Broadcaster's phone sends one WebRTC connection to LiveKit
 * - LiveKit fans out to unlimited viewers
 * - No peer-to-peer mesh, no manual signaling
 * - Firestore still used for stream sessions, comments, reactions
 */

import { db } from '@/firebase/config';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    addDoc,
    query,
    orderBy,
    where,
    serverTimestamp,
    increment,
    Timestamp,
    getDocs,
    limit,
    writeBatch,
} from 'firebase/firestore';
import type {
    StreamSession,
    BroadcasterSettings,
    StreamComment,
    StreamReaction,
} from '@/types/streamTypes';
import { DEFAULT_BROADCASTER_SETTINGS } from '@/types/streamTypes';
import {
    Room,
    RoomEvent,
    Track,
    type RemoteTrack,
    type RemoteTrackPublication,
    type RemoteParticipant,
    ConnectionState,
} from 'livekit-client';

// ============= BROADCASTER CLASS =============

export class StreamBroadcaster {
    private gameId: string;
    private streamId: string | null = null;
    private room: Room | null = null;
    private localStream: MediaStream | null = null;
    private settings: BroadcasterSettings;
    private viewerCount = 0;
    private viewerPeak = 0;
    private onViewerCountChange?: (count: number) => void;
    private onConnectionStateChange?: (state: string) => void;
    private unsubscribers: (() => void)[] = [];

    constructor(
        gameId: string,
        settings?: Partial<BroadcasterSettings>,
        callbacks?: {
            onViewerCountChange?: (count: number) => void;
            onConnectionStateChange?: (state: string) => void;
        }
    ) {
        this.gameId = gameId;
        this.settings = { ...DEFAULT_BROADCASTER_SETTINGS, ...settings };
        this.onViewerCountChange = callbacks?.onViewerCountChange;
        this.onConnectionStateChange = callbacks?.onConnectionStateChange;
    }

    // Get the local camera/mic stream for preview (before connecting to LiveKit)
    async getLocalStream(): Promise<MediaStream> {
        const [width, height] = this.settings.resolution.split('x').map(Number);

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: this.settings.facingMode,
                    width: { ideal: width },
                    height: { ideal: height },
                    frameRate: { ideal: this.settings.frameRate },
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            return this.localStream;
        } catch (error) {
            console.error('[StreamBroadcaster] Error getting media stream:', error);
            throw error;
        }
    }

    // Switch camera (front/rear)
    async switchCamera(): Promise<MediaStream> {
        this.settings.facingMode = this.settings.facingMode === 'user' ? 'environment' : 'user';

        // Stop current video tracks
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => track.stop());
        }

        const [width, height] = this.settings.resolution.split('x').map(Number);
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: this.settings.facingMode,
                width: { ideal: width },
                height: { ideal: height },
                frameRate: { ideal: this.settings.frameRate },
            },
            audio: false,
        });

        const newVideoTrack = newStream.getVideoTracks()[0];

        // Replace track in LiveKit room if connected
        if (this.room && this.room.localParticipant) {
            // Unpublish old camera tracks
            const existingPubs = this.room.localParticipant.trackPublications;
            for (const [, pub] of existingPubs) {
                if (pub.source === Track.Source.Camera) {
                    try {
                        await this.room.localParticipant.unpublishTrack(pub.track!);
                    } catch { /* may already be unpublished */ }
                }
            }

            await this.room.localParticipant.publishTrack(newVideoTrack, {
                simulcast: false,
                source: Track.Source.Camera,
                name: 'camera',
            });
        }

        // Update local stream
        if (this.localStream) {
            const oldVideoTrack = this.localStream.getVideoTracks()[0];
            if (oldVideoTrack) this.localStream.removeTrack(oldVideoTrack);
            this.localStream.addTrack(newVideoTrack);
        }

        return this.localStream!;
    }

    // Toggle mic
    toggleMic(): boolean {
        if (!this.localStream) return false;
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            // Also mute/unmute in LiveKit via room's local participant
            if (this.room) {
                this.room.localParticipant.trackPublications.forEach(pub => {
                    if (pub.source === Track.Source.Microphone && pub.track) {
                        audioTrack.enabled ? pub.track.unmute() : pub.track.mute();
                    }
                });
            }
            return audioTrack.enabled;
        }
        return false;
    }

    // Toggle camera
    toggleCamera(): boolean {
        if (!this.localStream) return false;
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            // Also mute/unmute in LiveKit via room's local participant
            if (this.room) {
                this.room.localParticipant.trackPublications.forEach(pub => {
                    if (pub.source === Track.Source.Camera && pub.track) {
                        videoTrack.enabled ? pub.track.unmute() : pub.track.mute();
                    }
                });
            }
            return videoTrack.enabled;
        }
        return false;
    }

    // Toggle torch/flashlight
    async toggleTorch(): Promise<boolean> {
        if (!this.localStream) return false;
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (!videoTrack) return false;

        try {
            const capabilities = videoTrack.getCapabilities() as any;
            if (!capabilities?.torch) return false;

            const settings = videoTrack.getSettings() as any;
            const newTorch = !settings.torch;
            await videoTrack.applyConstraints({
                advanced: [{ torch: newTorch } as any],
            });
            return newTorch;
        } catch {
            return false;
        }
    }

    // Start streaming — connect to LiveKit room, publish tracks
    async startStream(): Promise<string> {
        if (!this.localStream) {
            throw new Error('Call getLocalStream() before startStream()');
        }

        // Check for existing active stream on this game
        const existingStreams = await getDocs(
            query(
                collection(db, 'basketball_streams'),
                where('gameId', '==', this.gameId),
                where('status', '==', 'live')
            )
        );

        // Auto-clean any stale/orphaned streams from previous sessions
        if (!existingStreams.empty) {
            const batch = writeBatch(db);
            existingStreams.docs.forEach(d => {
                batch.update(d.ref, {
                    status: 'ended',
                    endedAt: serverTimestamp(),
                    currentViewers: 0,
                    updatedAt: serverTimestamp(),
                });
            });
            await batch.commit();
            console.log(`[StreamBroadcaster] Cleaned up ${existingStreams.size} stale stream(s)`);
        }

        // Create stream session in Firestore
        const streamRef = await addDoc(collection(db, 'basketball_streams'), {
            gameId: this.gameId,
            status: 'live',
            startedAt: serverTimestamp(),
            endedAt: null,
            viewerPeak: 0,
            currentViewers: 0,
            roomId: `basketball-game-${this.gameId}`,
            broadcasterId: 'admin',
            resolution: this.settings.resolution,
            recordingUrl: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        this.streamId = streamRef.id;

        // Update game's isStreaming flag
        await updateDoc(doc(db, 'basketball_games', this.gameId), {
            isStreaming: true,
            updatedAt: serverTimestamp(),
        });

        // Fetch LiveKit token
        const tokenRes = await fetch(`/api/basketball/stream/${this.gameId}/token?role=broadcaster`);
        if (!tokenRes.ok) {
            throw new Error('Failed to get LiveKit token');
        }
        const { token, url } = await tokenRes.json();

        // Create and connect to LiveKit room
        this.room = new Room({
            adaptiveStream: true,
            dynacast: true,
        });

        // Track participant count changes
        this.room.on(RoomEvent.ParticipantConnected, () => {
            this.updateViewerCount();
        });
        this.room.on(RoomEvent.ParticipantDisconnected, () => {
            this.updateViewerCount();
        });
        this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
            this.onConnectionStateChange?.(state);
        });

        await this.room.connect(url, token);

        // Publish tracks from the existing local stream
        // Use raw MediaStreamTracks — LiveKit wraps them internally
        const videoTrack = this.localStream.getVideoTracks()[0];
        const audioTrack = this.localStream.getAudioTracks()[0];

        if (videoTrack) {
            await this.room.localParticipant.publishTrack(videoTrack, {
                simulcast: false,
                source: Track.Source.Camera,
                name: 'camera',
            });
        }

        if (audioTrack) {
            await this.room.localParticipant.publishTrack(audioTrack, {
                source: Track.Source.Microphone,
                name: 'microphone',
            });
        }

        // Listen for viewer count from Firestore (updated by webhook)
        this.listenForViewerCount();

        console.log(`[StreamBroadcaster] Stream started via LiveKit: ${this.streamId}`);
        return this.streamId;
    }

    // Update viewer count from LiveKit room
    private updateViewerCount() {
        if (!this.room) return;
        // numParticipants includes the broadcaster, so subtract 1
        const count = Math.max(0, this.room.numParticipants - 1);
        this.viewerCount = count;
        if (count > this.viewerPeak) this.viewerPeak = count;
        this.onViewerCountChange?.(count);
    }

    // Listen for viewer count from Firestore (fallback/sync)
    private listenForViewerCount() {
        if (!this.streamId) return;
        const streamRef = doc(db, 'basketball_streams', this.streamId);
        const unsubscribe = onSnapshot(streamRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const count = data.currentViewers || 0;
                this.viewerCount = count;
                this.onViewerCountChange?.(count);
            }
        });
        this.unsubscribers.push(unsubscribe);
    }

    // End stream
    async endStream() {
        if (!this.streamId) return;

        console.log('[StreamBroadcaster] Ending stream...');

        // Disconnect from LiveKit room
        if (this.room) {
            this.room.disconnect();
            this.room = null;
        }

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Unsubscribe from all listeners
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];

        // Update stream session
        await updateDoc(doc(db, 'basketball_streams', this.streamId), {
            status: 'ended',
            endedAt: serverTimestamp(),
            currentViewers: 0,
            viewerPeak: this.viewerPeak,
            updatedAt: serverTimestamp(),
        });

        // Update game's isStreaming flag
        await updateDoc(doc(db, 'basketball_games', this.gameId), {
            isStreaming: false,
            updatedAt: serverTimestamp(),
        });

        console.log('[StreamBroadcaster] Stream ended');
        this.streamId = null;
    }

    // Get stream ID
    getStreamId(): string | null {
        return this.streamId;
    }

    // Get current settings
    getSettings(): BroadcasterSettings {
        return { ...this.settings };
    }

    // Update settings
    updateSettings(settings: Partial<BroadcasterSettings>) {
        this.settings = { ...this.settings, ...settings };
    }

    // Cleanup
    destroy() {
        if (this.room) {
            this.room.disconnect();
            this.room = null;
        }
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
    }
}

// ============= VIEWER CLASS =============

export class StreamViewer {
    private gameId: string;
    private streamId: string | null = null;
    private viewerId: string;
    private room: Room | null = null;
    private unsubscribers: (() => void)[] = [];
    private onStream?: (stream: MediaStream) => void;
    private onStreamEnd?: () => void;
    private onViewerCountChange?: (count: number) => void;
    private onReconnecting?: () => void;

    constructor(
        gameId: string,
        callbacks?: {
            onStream?: (stream: MediaStream) => void;
            onStreamEnd?: () => void;
            onViewerCountChange?: (count: number) => void;
            onReconnecting?: () => void;
        }
    ) {
        this.gameId = gameId;
        this.viewerId = this.getOrCreateGuestId();
        this.onStream = callbacks?.onStream;
        this.onStreamEnd = callbacks?.onStreamEnd;
        this.onViewerCountChange = callbacks?.onViewerCountChange;
        this.onReconnecting = callbacks?.onReconnecting;
    }

    // Get or create guest ID from localStorage
    private getOrCreateGuestId(): string {
        if (typeof window === 'undefined') return `viewer_${Date.now()}`;

        let guestId = localStorage.getItem('stream_guest_id');
        if (!guestId) {
            guestId = `viewer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('stream_guest_id', guestId);
        }
        return guestId;
    }

    // Find active stream for this game
    async findActiveStream(): Promise<string | null> {
        const streamsQuery = query(
            collection(db, 'basketball_streams'),
            where('gameId', '==', this.gameId),
            where('status', '==', 'live'),
            limit(1)
        );

        const snapshot = await getDocs(streamsQuery);
        if (snapshot.empty) return null;

        this.streamId = snapshot.docs[0].id;
        return this.streamId;
    }

    // Join the stream via LiveKit
    async joinStream(): Promise<void> {
        if (!this.streamId) {
            const found = await this.findActiveStream();
            if (!found) throw new Error('No active stream found for this game');
        }

        console.log(`[StreamViewer] Joining stream ${this.streamId} as ${this.viewerId}`);

        // Fetch LiveKit token
        const tokenRes = await fetch(`/api/basketball/stream/${this.gameId}/token?role=viewer`);
        if (!tokenRes.ok) {
            throw new Error('Failed to get LiveKit token');
        }
        const { token, url } = await tokenRes.json();

        // Create and connect to LiveKit room
        this.room = new Room({
            adaptiveStream: true,
            dynacast: true,
        });

        // Handle incoming tracks (the broadcaster's video/audio)
        this.room.on(RoomEvent.TrackSubscribed, (
            track: RemoteTrack,
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
        ) => {
            console.log(`[StreamViewer] Track subscribed: ${track.kind}`);

            if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
                const mediaStream = new MediaStream();

                // Gather all tracks from the broadcaster
                this.room?.remoteParticipants.forEach(p => {
                    p.trackPublications.forEach(pub => {
                        if (pub.track && pub.isSubscribed) {
                            mediaStream.addTrack(pub.track.mediaStreamTrack);
                        }
                    });
                });

                this.onStream?.(mediaStream);
            }
        });

        // Handle track unsubscribed
        this.room.on(RoomEvent.TrackUnsubscribed, () => {
            console.log(`[StreamViewer] Track unsubscribed`);
        });

        // Handle participant disconnect (broadcaster left)
        this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
            if (participant.identity.startsWith('broadcaster')) {
                this.onStreamEnd?.();
            }
        });

        // Handle connection state
        this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
            console.log(`[StreamViewer] Connection state: ${state}`);
            if (state === ConnectionState.Reconnecting) {
                this.onReconnecting?.();
            } else if (state === ConnectionState.Disconnected) {
                this.onStreamEnd?.();
            }
        });

        // Handle reconnected
        this.room.on(RoomEvent.Reconnected, () => {
            console.log('[StreamViewer] Reconnected');
            // Re-gather tracks
            const mediaStream = new MediaStream();
            this.room?.remoteParticipants.forEach(p => {
                p.trackPublications.forEach(pub => {
                    if (pub.track && pub.isSubscribed) {
                        mediaStream.addTrack(pub.track.mediaStreamTrack);
                    }
                });
            });
            if (mediaStream.getTracks().length > 0) {
                this.onStream?.(mediaStream);
            }
        });

        // Handle room disconnected
        this.room.on(RoomEvent.Disconnected, () => {
            this.onStreamEnd?.();
        });

        // Connect to the room
        await this.room.connect(url, token);

        // Check if broadcaster is already publishing
        this.room.remoteParticipants.forEach(participant => {
            participant.trackPublications.forEach(pub => {
                if (pub.track && pub.isSubscribed) {
                    const mediaStream = new MediaStream();
                    this.room?.remoteParticipants.forEach(p => {
                        p.trackPublications.forEach(pub2 => {
                            if (pub2.track && pub2.isSubscribed) {
                                mediaStream.addTrack(pub2.track.mediaStreamTrack);
                            }
                        });
                    });
                    this.onStream?.(mediaStream);
                }
            });
        });

        // Listen for viewer count from Firestore
        this.listenForViewerCount();

        // Listen for stream end from Firestore
        this.listenForStreamEnd();
    }

    // Listen for stream end via Firestore
    private listenForStreamEnd() {
        if (!this.streamId) return;

        const streamRef = doc(db, 'basketball_streams', this.streamId);
        const unsubscribe = onSnapshot(streamRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'ended') {
                    this.onStreamEnd?.();
                }
            }
        });
        this.unsubscribers.push(unsubscribe);
    }

    // Listen for viewer count changes
    private listenForViewerCount() {
        if (!this.streamId) return;

        const streamRef = doc(db, 'basketball_streams', this.streamId);
        const unsubscribe = onSnapshot(streamRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                this.onViewerCountChange?.(data.currentViewers || 0);
            }
        });
        this.unsubscribers.push(unsubscribe);
    }

    // Get stream ID
    getStreamId(): string | null {
        return this.streamId;
    }

    // Get viewer ID
    getViewerId(): string {
        return this.viewerId;
    }

    // Cleanup
    destroy() {
        if (this.room) {
            this.room.disconnect();
            this.room = null;
        }
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
    }
}

// ============= HELPER FUNCTIONS =============

// Send a comment to a stream
export async function sendStreamComment(
    streamId: string,
    gameId: string,
    text: string,
    guestName: string,
    guestId?: string
): Promise<void> {
    const id = guestId || localStorage.getItem('stream_guest_id') || 'anonymous';
    await addDoc(collection(db, 'basketball_streams', streamId, 'comments'), {
        streamId,
        gameId,
        guestId: id,
        guestName,
        text,
        timestamp: serverTimestamp(),
    });
}

// Send a reaction to a stream
export async function sendStreamReaction(
    streamId: string,
    gameId: string,
    emoji: string,
    guestId?: string
): Promise<void> {
    const id = guestId || localStorage.getItem('stream_guest_id') || 'anonymous';
    await addDoc(collection(db, 'basketball_streams', streamId, 'reactions'), {
        streamId,
        gameId,
        guestId: id,
        emoji,
        timestamp: serverTimestamp(),
    });
}

// Check if a game has an active stream
export async function checkGameStreamStatus(gameId: string): Promise<{ isLive: boolean; streamId: string | null }> {
    const streamsQuery = query(
        collection(db, 'basketball_streams'),
        where('gameId', '==', gameId),
        where('status', '==', 'live'),
        limit(1)
    );

    const snapshot = await getDocs(streamsQuery);
    if (snapshot.empty) {
        return { isLive: false, streamId: null };
    }

    return { isLive: true, streamId: snapshot.docs[0].id };
}
