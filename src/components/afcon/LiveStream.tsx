'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Radio, Volume2, VolumeX, Maximize2, Users, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, query, orderBy, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { StreamRoom, SignalingMessage } from '@/types/signalingTypes';
import { DEFAULT_ICE_SERVERS } from '@/types/signalingTypes';

interface LiveStreamProps {
    fixtureId: string;
    homeTeamName?: string;
    awayTeamName?: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    homeScore?: number;
    awayScore?: number;
    matchTime?: string;
    showOverlay?: boolean;
}

export function LiveStream({
    fixtureId,
    homeTeamName = 'Home',
    awayTeamName = 'Away',
    homeTeamLogo,
    awayTeamLogo,
    homeScore = 0,
    awayScore = 0,
    matchTime = '0\'',
    showOverlay = true,
}: LiveStreamProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const unsubRef = useRef<(() => void) | null>(null);

    // Generate unique viewer ID only on client
    const viewerIdRef = useRef<string>('');

    const [room, setRoom] = useState<StreamRoom | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionState, setConnectionState] = useState<string>('disconnected');
    const [isMuted, setIsMuted] = useState(true);
    const [viewerCount, setViewerCount] = useState(0);
    const [retryCount, setRetryCount] = useState(0);
    const [isMounted, setIsMounted] = useState(false);

    // Generate viewer ID on mount (client-side only)
    useEffect(() => {
        viewerIdRef.current = `viewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setViewerCount(Math.floor(Math.random() * 150) + 25);
        setIsMounted(true);
    }, []);

    // Subscribe to room updates
    useEffect(() => {
        const roomRef = doc(db, 'broadcast_rooms', fixtureId);
        const unsubscribe = onSnapshot(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                const roomData = snapshot.data() as StreamRoom;
                setRoom(roomData);
            } else {
                setRoom(null);
            }
        });

        return () => unsubscribe();
    }, [fixtureId]);

    // Cleanup function
    const cleanup = useCallback(() => {
        if (unsubRef.current) {
            unsubRef.current();
            unsubRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        setStream(null);
        setConnectionState('disconnected');
    }, []);

    // Connect to stream
    const connectToStream = useCallback(async (activeCameraId: number) => {
        const viewerId = viewerIdRef.current;
        const activeCameraKey = `camera${activeCameraId}`;

        console.log(`[LiveStream] Connecting to ${activeCameraKey} as ${viewerId}`);
        cleanup();

        setIsConnecting(true);
        setConnectionState('connecting');

        // Create peer connection
        const pc = new RTCPeerConnection({
            iceServers: DEFAULT_ICE_SERVERS,
            iceCandidatePoolSize: 10,
        });
        pcRef.current = pc;

        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log('[LiveStream] Received track:', event.track.kind);
            if (event.streams[0]) {
                setStream(event.streams[0]);
                setIsConnecting(false);
                setConnectionState('connected');
            }
        };

        // Connection state changes
        pc.onconnectionstatechange = () => {
            console.log('[LiveStream] Connection state:', pc.connectionState);
            setConnectionState(pc.connectionState);
        };

        pc.oniceconnectionstatechange = () => {
            console.log('[LiveStream] ICE state:', pc.iceConnectionState);
        };

        const signalingRef = collection(db, 'broadcast_rooms', fixtureId, 'signaling');
        let hasReceivedOffer = false;

        // Send ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate && hasReceivedOffer) {
                console.log('[LiveStream] Sending ICE candidate');
                await addDoc(signalingRef, {
                    type: 'ice-candidate',
                    from: viewerId,
                    to: activeCameraKey,
                    fixtureId,
                    payload: event.candidate.toJSON(),
                    timestamp: serverTimestamp(),
                });
            }
        };

        // Listen for messages from camera FIRST
        const signalingQuery = query(signalingRef, orderBy('timestamp', 'asc'));
        unsubRef.current = onSnapshot(signalingQuery, async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added') {
                    const message = change.doc.data() as SignalingMessage & { timestamp: Timestamp };

                    // Only process messages meant for this viewer
                    if (message.to !== viewerId) continue;

                    console.log(`[LiveStream] Received ${message.type} from ${message.from}`);

                    if (message.type === 'offer' && message.payload) {
                        try {
                            hasReceivedOffer = true;
                            await pc.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
                            console.log('[LiveStream] Set remote description');

                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            console.log('[LiveStream] Created answer');

                            // Send answer back
                            await addDoc(signalingRef, {
                                type: 'answer',
                                from: viewerId,
                                to: message.from,
                                fixtureId,
                                payload: answer,
                                timestamp: serverTimestamp(),
                            });
                            console.log('[LiveStream] Sent answer');

                            await deleteDoc(change.doc.ref);
                        } catch (error) {
                            console.error('[LiveStream] Error handling offer:', error);
                        }
                    } else if (message.type === 'ice-candidate' && message.payload) {
                        try {
                            if (pc.remoteDescription) {
                                await pc.addIceCandidate(new RTCIceCandidate(message.payload as RTCIceCandidateInit));
                                console.log('[LiveStream] Added ICE candidate');
                            }
                            await deleteDoc(change.doc.ref);
                        } catch (error) {
                            console.error('[LiveStream] Error adding ICE candidate:', error);
                        }
                    }
                }
            }
        });

        // Small delay to ensure listener is ready, then send request
        await new Promise(resolve => setTimeout(resolve, 500));

        // Request stream from camera
        console.log(`[LiveStream] Sending viewer-request to ${activeCameraKey}`);
        await addDoc(signalingRef, {
            type: 'viewer-request',
            from: viewerId,
            to: activeCameraKey,
            fixtureId,
            payload: { requestedAt: new Date().toISOString() },
            timestamp: serverTimestamp(),
        });

    }, [fixtureId, cleanup]);

    // Connect when room becomes live (and client is mounted)
    useEffect(() => {
        if (!isMounted) return; // Wait for client-side mount

        if (room?.isLive && room?.activeCameraId && viewerIdRef.current) {
            connectToStream(room.activeCameraId);
        } else {
            cleanup();
        }

        return cleanup;
    }, [room?.isLive, room?.activeCameraId, connectToStream, cleanup, isMounted]);

    // Attach stream to video
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    // Retry connection
    const handleRetry = useCallback(() => {
        if (room?.isLive && room?.activeCameraId) {
            // Generate new viewer ID for retry
            viewerIdRef.current = `viewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            setRetryCount(prev => prev + 1);
            connectToStream(room.activeCameraId);
        }
    }, [room, connectToStream]);

    // Don't render if not broadcasting
    if (!room?.isLive || !room?.activeCameraId) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden"
        >
            {/* Video Element */}
            {stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    {isConnecting ? (
                        <>
                            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-gray-400 text-sm">Connecting to live stream...</p>
                            <p className="text-gray-500 text-xs mt-1">{connectionState}</p>
                        </>
                    ) : connectionState === 'failed' ? (
                        <>
                            <WifiOff className="w-12 h-12 text-red-500 mb-4" />
                            <p className="text-gray-400 text-sm mb-3">Connection failed</p>
                            <button
                                onClick={handleRetry}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-white text-sm hover:bg-red-700 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Retry
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-gray-400 text-sm">Waiting for stream...</p>
                        </>
                    )}
                </div>
            )}

            {/* Overlay Elements */}
            {showOverlay && (
                <>
                    {/* LIVE Badge */}
                    <div className="absolute top-2 right-2">
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-red-600 rounded text-[10px] font-bold text-white">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            LIVE
                        </span>
                    </div>

                    {/* Score Overlay - Compact Upper Left Design */}
                    <div className="absolute top-2 left-2">
                        <div className="bg-black/80 backdrop-blur-md rounded overflow-hidden">
                            {/* Match Time Badge */}
                            <div className="bg-red-600 px-1.5 py-0.5 text-center">
                                <span className="text-white text-[8px] font-bold uppercase tracking-wider">{matchTime}</span>
                            </div>
                            {/* Teams & Score */}
                            <div className="px-1.5 py-1 flex items-center gap-1.5">
                                {/* Home Team */}
                                <div className="flex items-center gap-1">
                                    {homeTeamLogo ? (
                                        <img src={homeTeamLogo} alt="" className="w-4 h-4 object-contain" />
                                    ) : (
                                        <div className="w-4 h-4 bg-gray-600 rounded-full" />
                                    )}
                                    <span className="text-white text-[10px] font-medium">{homeTeamName?.substring(0, 3).toUpperCase()}</span>
                                </div>
                                {/* Score */}
                                <div className="flex items-center bg-gray-800 px-1.5 py-0.5 rounded">
                                    <span className="text-white font-bold text-xs">{homeScore}</span>
                                    <span className="text-gray-500 text-[10px] mx-0.5">-</span>
                                    <span className="text-white font-bold text-xs">{awayScore}</span>
                                </div>
                                {/* Away Team */}
                                <div className="flex items-center gap-1">
                                    <span className="text-white text-[10px] font-medium">{awayTeamName?.substring(0, 3).toUpperCase()}</span>
                                    {awayTeamLogo ? (
                                        <img src={awayTeamLogo} alt="" className="w-4 h-4 object-contain" />
                                    ) : (
                                        <div className="w-4 h-4 bg-gray-600 rounded-full" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Camera Indicator */}
                    <div className="absolute top-4 right-4">
                        <span className="flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-xs text-gray-300">
                            <Wifi className={`w-3 h-3 ${stream ? 'text-green-400' : 'text-yellow-400'}`} />
                            CAM {room.activeCameraId}
                        </span>
                    </div>
                </>
            )}

            {/* Controls */}
            {stream && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
                            >
                                {isMuted ? (
                                    <VolumeX className="w-5 h-5 text-white" />
                                ) : (
                                    <Volume2 className="w-5 h-5 text-white" />
                                )}
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => videoRef.current?.requestFullscreen()}
                                className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
                            >
                                <Maximize2 className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
