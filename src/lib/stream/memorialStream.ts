/**
 * Halala memorial stream — LiveKit Cloud SFU.
 *
 * The admin's phone publishes camera + mic into one LiveKit room; LiveKit fans
 * the feed out to every viewer on /halala. Stream status is written by the
 * server (POST /api/halala/stream) so the public page never needs Firestore
 * write access; viewers read status/chat over realtime Firestore listeners.
 */

import { auth } from '@/firebase/config';
import {
    Room,
    RoomEvent,
    Track,
    ConnectionState,
    type RemoteTrack,
    type RemoteParticipant,
} from 'livekit-client';
import {
    DEFAULT_MEMORIAL_BROADCASTER_SETTINGS,
    type BroadcasterSettings,
} from '@/types/memorialStream';

/** Attach the current admin's Firebase ID token for server-side verification. */
async function adminHeaders(): Promise<HeadersInit> {
    const user = auth.currentUser;
    if (!user) throw new Error('You must be signed in as an admin.');
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await user.getIdToken()}`,
    };
}

/**
 * Hold a photo over the live feed, or pass null to go back to the camera.
 *
 * The photo is composited on the viewer's page rather than into the video
 * track, so it stays crisp on every screen and costs no extra bandwidth —
 * and the camera's audio keeps playing underneath it.
 */
export async function setMemorialPhoto(photo: string | null): Promise<void> {
    const res = await fetch('/api/halala/stream', {
        method: 'POST',
        headers: await adminHeaders(),
        body: JSON.stringify({ action: 'photo', photo }),
    });

    if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: '' }));
        throw new Error(error || 'Could not update the photo.');
    }
}

// ============= BROADCASTER =============

export class MemorialBroadcaster {
    private room: Room | null = null;
    private localStream: MediaStream | null = null;
    private settings: BroadcasterSettings;
    private isLive = false;
    private onViewerCountChange?: (count: number) => void;
    private onConnectionStateChange?: (state: string) => void;

    constructor(
        settings?: Partial<BroadcasterSettings>,
        callbacks?: {
            onViewerCountChange?: (count: number) => void;
            onConnectionStateChange?: (state: string) => void;
        }
    ) {
        this.settings = { ...DEFAULT_MEMORIAL_BROADCASTER_SETTINGS, ...settings };
        this.onViewerCountChange = callbacks?.onViewerCountChange;
        this.onConnectionStateChange = callbacks?.onConnectionStateChange;
    }

    /** Camera/mic preview, before going live. */
    async getLocalStream(): Promise<MediaStream> {
        const [width, height] = this.settings.resolution.split('x').map(Number);

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
    }

    async switchCamera(): Promise<MediaStream> {
        this.settings.facingMode = this.settings.facingMode === 'user' ? 'environment' : 'user';

        this.localStream?.getVideoTracks().forEach((t) => t.stop());

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

        if (this.room?.localParticipant) {
            for (const [, pub] of this.room.localParticipant.trackPublications) {
                if (pub.source === Track.Source.Camera && pub.track) {
                    try {
                        await this.room.localParticipant.unpublishTrack(pub.track);
                    } catch {
                        /* already gone */
                    }
                }
            }
            await this.room.localParticipant.publishTrack(newVideoTrack, {
                simulcast: false,
                source: Track.Source.Camera,
                name: 'camera',
            });
        }

        if (this.localStream) {
            const old = this.localStream.getVideoTracks()[0];
            if (old) this.localStream.removeTrack(old);
            this.localStream.addTrack(newVideoTrack);
        }

        return this.localStream!;
    }

    /**
     * Native camera zoom, where the hardware exposes it (Android Chrome does;
     * iOS Safari does not). Returns null when unsupported so the UI can hide
     * the control rather than show one that does nothing.
     *
     * This zooms the actual published track, so viewers see it too — a CSS
     * transform would only scale the local preview.
     */
    getZoomRange(): { min: number; max: number; step: number; current: number } | null {
        const track = this.localStream?.getVideoTracks()[0];
        if (!track?.getCapabilities) return null;

        const caps = track.getCapabilities() as MediaTrackCapabilities & {
            zoom?: { min: number; max: number; step?: number };
        };
        if (!caps.zoom || caps.zoom.max <= caps.zoom.min) return null;

        const settings = track.getSettings() as MediaTrackSettings & { zoom?: number };

        return {
            min: caps.zoom.min,
            max: caps.zoom.max,
            step: caps.zoom.step || 0.1,
            current: settings.zoom ?? caps.zoom.min,
        };
    }

    async setZoom(value: number): Promise<boolean> {
        const track = this.localStream?.getVideoTracks()[0];
        if (!track) return false;

        try {
            await track.applyConstraints({
                advanced: [{ zoom: value } as unknown as MediaTrackConstraintSet],
            });
            return true;
        } catch {
            return false;
        }
    }

    toggleMic(): boolean {
        const track = this.localStream?.getAudioTracks()[0];
        if (!track) return false;

        track.enabled = !track.enabled;
        this.room?.localParticipant.trackPublications.forEach((pub) => {
            if (pub.source === Track.Source.Microphone && pub.track) {
                if (track.enabled) pub.track.unmute();
                else pub.track.mute();
            }
        });
        return track.enabled;
    }

    toggleCamera(): boolean {
        const track = this.localStream?.getVideoTracks()[0];
        if (!track) return false;

        track.enabled = !track.enabled;
        this.room?.localParticipant.trackPublications.forEach((pub) => {
            if (pub.source === Track.Source.Camera && pub.track) {
                if (track.enabled) pub.track.unmute();
                else pub.track.mute();
            }
        });
        return track.enabled;
    }

    /** Connect to LiveKit, publish tracks, and mark the memorial page live. */
    async startStream(title = ''): Promise<void> {
        if (!this.localStream) {
            throw new Error('Call getLocalStream() before startStream().');
        }

        const headers = await adminHeaders();

        const tokenRes = await fetch('/api/halala/stream/token?role=broadcaster', { headers });
        if (!tokenRes.ok) {
            const { error } = await tokenRes.json().catch(() => ({ error: '' }));
            throw new Error(error || 'Could not get a broadcast token.');
        }
        const { token, url } = await tokenRes.json();

        this.room = new Room({ adaptiveStream: true, dynacast: true });

        this.room.on(RoomEvent.ParticipantConnected, () => this.updateViewerCount());
        this.room.on(RoomEvent.ParticipantDisconnected, () => this.updateViewerCount());
        this.room.on(RoomEvent.ConnectionStateChanged, (state) =>
            this.onConnectionStateChange?.(state)
        );

        await this.room.connect(url, token);

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

        // Only flip the public page to "live" once media is actually flowing.
        const statusRes = await fetch('/api/halala/stream', {
            method: 'POST',
            headers,
            body: JSON.stringify({ action: 'start', title }),
        });

        if (!statusRes.ok) {
            // Don't leave a half-started broadcast behind.
            this.room.disconnect();
            this.room = null;
            const { error } = await statusRes.json().catch(() => ({ error: '' }));
            throw new Error(error || 'Could not start the stream.');
        }

        this.isLive = true;
    }

    private updateViewerCount() {
        if (!this.room) return;
        // numParticipants includes the broadcaster.
        this.onViewerCountChange?.(Math.max(0, this.room.numParticipants - 1));
    }

    async endStream(): Promise<void> {
        this.room?.disconnect();
        this.room = null;

        this.localStream?.getTracks().forEach((t) => t.stop());
        this.localStream = null;

        if (this.isLive) {
            this.isLive = false;
            try {
                await fetch('/api/halala/stream', {
                    method: 'POST',
                    headers: await adminHeaders(),
                    body: JSON.stringify({ action: 'end' }),
                });
            } catch (error) {
                console.error('[MemorialBroadcaster] Failed to mark stream ended:', error);
            }
        }
    }

    getSettings(): BroadcasterSettings {
        return { ...this.settings };
    }

    updateSettings(settings: Partial<BroadcasterSettings>) {
        this.settings = { ...this.settings, ...settings };
    }

    /** Synchronous teardown for unmount — media stops immediately. */
    destroy() {
        this.room?.disconnect();
        this.room = null;
        this.localStream?.getTracks().forEach((t) => t.stop());
        this.localStream = null;
    }
}

// ============= VIEWER =============

export class MemorialViewer {
    private room: Room | null = null;
    private onStream?: (stream: MediaStream) => void;
    private onStreamEnd?: () => void;
    private onReconnecting?: () => void;
    private onViewerCountChange?: (count: number) => void;

    constructor(callbacks?: {
        onStream?: (stream: MediaStream) => void;
        onStreamEnd?: () => void;
        onReconnecting?: () => void;
        onViewerCountChange?: (count: number) => void;
    }) {
        this.onStream = callbacks?.onStream;
        this.onStreamEnd = callbacks?.onStreamEnd;
        this.onReconnecting = callbacks?.onReconnecting;
        this.onViewerCountChange = callbacks?.onViewerCountChange;
    }

    /** Collect every subscribed remote track into one MediaStream. */
    private gatherTracks() {
        if (!this.room) return;

        const stream = new MediaStream();
        this.room.remoteParticipants.forEach((participant) => {
            participant.trackPublications.forEach((pub) => {
                if (pub.track && pub.isSubscribed) {
                    stream.addTrack(pub.track.mediaStreamTrack);
                }
            });
        });

        if (stream.getTracks().length > 0) {
            this.onStream?.(stream);
        }
    }

    async join(): Promise<void> {
        const res = await fetch('/api/halala/stream/token?role=viewer');
        if (!res.ok) {
            const { error } = await res.json().catch(() => ({ error: '' }));
            throw new Error(error || 'Could not connect to the service.');
        }
        const { token, url } = await res.json();

        // adaptiveStream pauses tracks whose <video> element isn't visible, which
        // would cut the feed the moment a mourner switches tabs or enters
        // picture-in-picture. Keeping it off costs a little bandwidth and keeps
        // the service playing in the background — the right trade for <100 viewers.
        this.room = new Room({ adaptiveStream: false, dynacast: true });

        this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
            if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
                this.gatherTracks();
            }
        });

        this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
            if (participant.identity.startsWith('broadcaster')) {
                this.onStreamEnd?.();
            }
        });

        this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
            if (state === ConnectionState.Reconnecting) this.onReconnecting?.();
        });

        this.room.on(RoomEvent.Reconnected, () => this.gatherTracks());
        this.room.on(RoomEvent.Disconnected, () => this.onStreamEnd?.());

        this.room.on(RoomEvent.ParticipantConnected, () => this.updateViewerCount());
        this.room.on(RoomEvent.ParticipantDisconnected, () => this.updateViewerCount());

        await this.room.connect(url, token);

        // The broadcaster may already be publishing when we arrive.
        this.gatherTracks();
        this.updateViewerCount();
    }

    private updateViewerCount() {
        if (!this.room) return;
        // Everyone except the broadcaster, plus ourselves.
        this.onViewerCountChange?.(Math.max(1, this.room.numParticipants));
    }

    destroy() {
        this.room?.disconnect();
        this.room = null;
    }
}
