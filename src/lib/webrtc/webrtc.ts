// WebRTC Peer Connection Manager with Firebase Signaling

import { db } from '@/firebase/config';
import {
    collection,
    doc,
    setDoc,
    onSnapshot,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy,
    addDoc,
    getDocs,
    Timestamp
} from 'firebase/firestore';
import {
    SignalingMessage,
    CameraConnection,
    StreamRoom,
    DEFAULT_ICE_SERVERS,
    WebRTCConfig
} from '@/types/signalingTypes';

export class WebRTCManager {
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private localStream: MediaStream | null = null;
    private config: WebRTCConfig;
    private fixtureId: string;
    private role: 'camera' | 'admin';
    private cameraId: 1 | 2 | 3 | 4 | null = null;
    private unsubscribers: (() => void)[] = [];
    // Queue ICE candidates until remote description is set
    private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
    private remoteDescriptionSet: Map<string, boolean> = new Map();

    constructor(fixtureId: string, role: 'camera' | 'admin', config?: Partial<WebRTCConfig>) {
        this.fixtureId = fixtureId;
        this.role = role;
        this.config = {
            iceServers: config?.iceServers || DEFAULT_ICE_SERVERS,
            iceCandidatePoolSize: config?.iceCandidatePoolSize || 10,
        };
    }

    // Initialize room in Firebase
    async initializeRoom(): Promise<void> {
        const roomRef = doc(db, 'broadcast_rooms', this.fixtureId);
        const roomData: StreamRoom = {
            fixtureId: this.fixtureId,
            cameras: {},
            activeCameraId: null,
            isLive: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await setDoc(roomRef, roomData, { merge: true });
    }

    // Camera: Register camera in room
    async registerCamera(cameraId: 1 | 2 | 3 | 4, deviceName?: string): Promise<void> {
        this.cameraId = cameraId;
        const roomRef = doc(db, 'broadcast_rooms', this.fixtureId);

        const cameraData: CameraConnection = {
            cameraId,
            fixtureId: this.fixtureId,
            status: 'connecting',
            deviceName: deviceName || `Camera ${cameraId}`,
            connectedAt: new Date().toISOString(),
        };

        await updateDoc(roomRef, {
            [`cameras.camera${cameraId}`]: cameraData,
            updatedAt: new Date().toISOString(),
        });
    }

    // Camera: Unregister camera from room
    async unregisterCamera(): Promise<void> {
        if (!this.cameraId) return;

        const roomRef = doc(db, 'broadcast_rooms', this.fixtureId);
        await updateDoc(roomRef, {
            [`cameras.camera${this.cameraId}`]: null,
            updatedAt: new Date().toISOString(),
        });
    }

    // Get local media stream (camera + mic)
    async getLocalStream(facingMode: 'user' | 'environment' = 'environment'): Promise<MediaStream> {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            return this.localStream;
        } catch (error) {
            console.error('Error getting media stream:', error);
            throw error;
        }
    }

    // Create peer connection
    private createPeerConnection(peerId: string): RTCPeerConnection {
        const pc = new RTCPeerConnection({
            iceServers: this.config.iceServers,
            iceCandidatePoolSize: this.config.iceCandidatePoolSize,
        });

        // Add local tracks if available
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream!);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await this.sendSignalingMessage({
                    type: 'ice-candidate',
                    from: this.role === 'camera' ? `camera${this.cameraId}` : 'admin',
                    to: peerId,
                    fixtureId: this.fixtureId,
                    payload: event.candidate.toJSON(),
                });
            }
        };

        // Connection state changes
        pc.onconnectionstatechange = () => {
            console.log(`Peer ${peerId} connection state:`, pc.connectionState);
            if (pc.connectionState === 'connected' && this.cameraId) {
                this.updateCameraStatus('streaming');
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                if (this.cameraId) this.updateCameraStatus('disconnected');
            }
        };

        this.peerConnections.set(peerId, pc);
        return pc;
    }

    // Send signaling message via Firebase
    private async sendSignalingMessage(message: SignalingMessage): Promise<void> {
        const signalingRef = collection(db, 'broadcast_rooms', this.fixtureId, 'signaling');
        await addDoc(signalingRef, {
            ...message,
            timestamp: serverTimestamp(),
        });
    }

    // Camera: Create and send offer to admin
    async createOffer(): Promise<void> {
        if (!this.cameraId) throw new Error('Camera not registered');

        const pc = this.createPeerConnection('admin');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await this.sendSignalingMessage({
            type: 'offer',
            from: `camera${this.cameraId}`,
            to: 'admin',
            fixtureId: this.fixtureId,
            payload: offer,
        });

        await this.updateCameraStatus('connected');
    }

    // Admin: Listen for offers and respond with answers
    listenForOffers(onStream: (cameraId: string, stream: MediaStream) => void): void {
        const signalingRef = collection(db, 'broadcast_rooms', this.fixtureId, 'signaling');
        const q = query(signalingRef, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added') {
                    const message = change.doc.data() as SignalingMessage & { timestamp: Timestamp };

                    if (message.to !== 'admin') continue;

                    if (message.type === 'offer') {
                        await this.handleOffer(message, onStream);
                        // Clean up processed message
                        await deleteDoc(change.doc.ref);
                    } else if (message.type === 'ice-candidate') {
                        await this.handleIceCandidate(message);
                        await deleteDoc(change.doc.ref);
                    }
                }
            }
        });

        this.unsubscribers.push(unsubscribe);
    }

    // Camera: Listen for answers and viewer requests
    listenForAnswers(onZoomCommand?: (level: number) => void): void {
        if (!this.cameraId) return;

        console.log(`[Camera${this.cameraId}] Starting to listen for answers and viewer requests`);

        const signalingRef = collection(db, 'broadcast_rooms', this.fixtureId, 'signaling');
        const q = query(signalingRef, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added') {
                    const message = change.doc.data() as SignalingMessage & { timestamp: Timestamp };
                    const cameraKey = `camera${this.cameraId}`;

                    console.log(`[Camera${this.cameraId}] Received message: type=${message.type}, from=${message.from}, to=${message.to}`);

                    // Handle messages directed to this camera
                    if (message.to === cameraKey) {
                        console.log(`[Camera${this.cameraId}] Processing ${message.type} from ${message.from}`);

                        if (message.type === 'answer') {
                            // Handle answer from admin or viewer
                            const pc = this.peerConnections.get(message.from);
                            if (pc && message.payload) {
                                // Check signaling state before setting remote description
                                // Only set if we're waiting for an answer (have-local-offer state)
                                if (pc.signalingState === 'have-local-offer') {
                                    try {
                                        await pc.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
                                        this.remoteDescriptionSet.set(message.from, true);
                                        await this.processPendingCandidates(message.from);
                                    } catch (error) {
                                        console.error(`[Camera${this.cameraId}] Error setting remote description:`, error);
                                    }
                                } else {
                                    console.log(`[Camera${this.cameraId}] Ignoring answer - already in state: ${pc.signalingState}`);
                                }
                            }
                            await deleteDoc(change.doc.ref);
                        } else if (message.type === 'ice-candidate') {
                            await this.handleIceCandidate(message);
                            await deleteDoc(change.doc.ref);
                        } else if (message.type === 'viewer-request') {
                            // Public viewer is requesting a stream - send them an offer
                            console.log(`[Camera${this.cameraId}] Handling viewer-request from ${message.from}`);
                            await this.handleViewerRequest(message);
                            await deleteDoc(change.doc.ref);
                        } else if (message.type === 'zoom-command') {
                            // Remote zoom control from admin
                            const payload = message.payload as { zoomLevel: number } | undefined;
                            if (payload?.zoomLevel && onZoomCommand) {
                                console.log(`[Camera${this.cameraId}] Received zoom command: ${payload.zoomLevel}x`);
                                onZoomCommand(payload.zoomLevel);
                            }
                            await deleteDoc(change.doc.ref);
                        }
                    }
                }
            }
        });

        this.unsubscribers.push(unsubscribe);
    }

    // Camera: Handle viewer request and send offer
    private async handleViewerRequest(message: SignalingMessage): Promise<void> {
        if (!this.cameraId) {
            console.error('[Camera] No cameraId set, cannot handle viewer request');
            return;
        }
        if (!this.localStream) {
            console.error('[Camera] No localStream available, cannot send video to viewer');
            return;
        }

        const viewerId = message.from;
        console.log(`[Camera${this.cameraId}] Viewer ${viewerId} requesting stream`);
        console.log(`[Camera${this.cameraId}] Local stream has ${this.localStream.getTracks().length} tracks`);

        try {
            // Create peer connection for this viewer
            const pc = this.createPeerConnection(viewerId);
            console.log(`[Camera${this.cameraId}] Created peer connection for ${viewerId}`);

            // Create and send offer to the viewer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log(`[Camera${this.cameraId}] Created offer for ${viewerId}`);

            await this.sendSignalingMessage({
                type: 'offer',
                from: `camera${this.cameraId}`,
                to: viewerId,
                fixtureId: this.fixtureId,
                payload: offer,
            });

            console.log(`[Camera${this.cameraId}] Sent offer to viewer ${viewerId}`);
        } catch (error) {
            console.error(`[Camera${this.cameraId}] Error handling viewer request:`, error);
        }
    }

    // Handle incoming offer (admin side)
    private async handleOffer(
        message: SignalingMessage,
        onStream: (cameraId: string, stream: MediaStream) => void
    ): Promise<void> {
        const pc = this.createPeerConnection(message.from);

        // Listen for remote tracks
        pc.ontrack = (event) => {
            if (event.streams[0]) {
                onStream(message.from, event.streams[0]);
            }
        };

        await pc.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
        // Mark remote description as set and process any pending candidates
        this.remoteDescriptionSet.set(message.from, true);
        await this.processPendingCandidates(message.from);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await this.sendSignalingMessage({
            type: 'answer',
            from: 'admin',
            to: message.from,
            fixtureId: this.fixtureId,
            payload: answer,
        });
    }

    // Handle ICE candidate - queue if remote description not set
    private async handleIceCandidate(message: SignalingMessage): Promise<void> {
        const peerId = message.from;
        const pcKey = peerId === 'admin' ? 'admin' : peerId;
        const pc = this.peerConnections.get(pcKey);

        if (!message.payload) return;

        const candidate = message.payload as RTCIceCandidateInit;

        // If remote description not set yet, queue the candidate
        if (!this.remoteDescriptionSet.get(pcKey)) {
            const pending = this.pendingCandidates.get(pcKey) || [];
            pending.push(candidate);
            this.pendingCandidates.set(pcKey, pending);
            console.log(`Queued ICE candidate for ${pcKey}`);
            return;
        }

        if (pc) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        }
    }

    // Process queued ICE candidates after remote description is set
    private async processPendingCandidates(peerId: string): Promise<void> {
        const pc = this.peerConnections.get(peerId);
        const pending = this.pendingCandidates.get(peerId);

        if (!pc || !pending || pending.length === 0) return;

        console.log(`Processing ${pending.length} pending ICE candidates for ${peerId}`);

        for (const candidate of pending) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('Error adding pending ICE candidate:', error);
            }
        }

        // Clear processed candidates
        this.pendingCandidates.set(peerId, []);
    }

    // Update camera status in Firebase
    private async updateCameraStatus(status: CameraConnection['status']): Promise<void> {
        if (!this.cameraId) return;

        const roomRef = doc(db, 'broadcast_rooms', this.fixtureId);
        await updateDoc(roomRef, {
            [`cameras.camera${this.cameraId}.status`]: status,
            updatedAt: new Date().toISOString(),
        });
    }

    // Admin: Set active camera for broadcast
    async setActiveCamera(cameraId: 1 | 2 | 3 | 4 | null): Promise<void> {
        const roomRef = doc(db, 'broadcast_rooms', this.fixtureId);
        await updateDoc(roomRef, {
            activeCameraId: cameraId,
            isLive: cameraId !== null,
            updatedAt: new Date().toISOString(),
        });
    }

    // Subscribe to room updates
    subscribeToRoom(callback: (room: StreamRoom) => void): void {
        const roomRef = doc(db, 'broadcast_rooms', this.fixtureId);
        const unsubscribe = onSnapshot(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.data() as StreamRoom);
            }
        });
        this.unsubscribers.push(unsubscribe);
    }

    // Get remote stream for a specific camera
    getRemoteStream(cameraId: string): MediaStream | null {
        const pc = this.peerConnections.get(cameraId);
        if (!pc) return null;

        const receivers = pc.getReceivers();
        if (receivers.length === 0) return null;

        const stream = new MediaStream();
        receivers.forEach(receiver => {
            if (receiver.track) {
                stream.addTrack(receiver.track);
            }
        });
        return stream;
    }

    // Cleanup
    destroy(): void {
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Close all peer connections
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();

        // Unsubscribe from all listeners
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];

        // Unregister camera if applicable
        if (this.role === 'camera' && this.cameraId) {
            this.unregisterCamera();
        }
    }
}
