'use client';

import React, { useEffect, useRef, use, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Camera,
    Mic,
    MicOff,
    RotateCcw,
    Play,
    Square,
    Wifi,
    WifiOff,
    Radio,
    ZoomIn
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useWebRTCCamera } from '@/hooks/useWebRTCCamera';
import type { Fixture } from '@/types/fixtureTypes';

export default function CameraStreamPage({
    params,
}: {
    params: Promise<{ fixtureId: string }>;
}) {
    const resolvedParams = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const fixtureId = resolvedParams.fixtureId;
    const cameraId = (parseInt(searchParams.get('cam') || '1') as 1 | 2 | 3 | 4);

    const [fixture, setFixture] = useState<Fixture | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    const {
        localStream,
        isConnecting,
        isStreaming,
        isLive,
        error,
        room,
        zoomLevel,
        zoomCapabilities,
        startPreview,
        startStreaming,
        stopStreaming,
        toggleCamera,
        toggleMute,
        setZoom,
    } = useWebRTCCamera({
        fixtureId,
        cameraId,
        deviceName: `Phone Camera ${cameraId}`,
    });

    // Fetch fixture info
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'fixtures', fixtureId), (snapshot) => {
            if (snapshot.exists()) {
                setFixture({ id: snapshot.id, ...snapshot.data() } as Fixture);
            }
        });
        return () => unsubscribe();
    }, [fixtureId]);

    // Attach local stream to video element
    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Request fullscreen on mount
    useEffect(() => {
        const requestFullscreen = async () => {
            try {
                if (containerRef.current && document.fullscreenEnabled) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await containerRef.current.requestFullscreen();
                }
            } catch (error) {
                console.log('Fullscreen not available:', error);
            }
        };
        requestFullscreen();
    }, []);

    // Handle mute toggle
    const handleToggleMute = () => {
        toggleMute();
        setIsMuted(!isMuted);
    };

    // Handle zoom selection
    const handleZoomSelect = (level: number) => {
        setZoom(level);
    };

    // Get connected cameras count
    const connectedCameras = room?.cameras
        ? Object.values(room.cameras).filter(Boolean).length
        : 0;

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 bg-black flex flex-col"
        >
            {/* Compact Top Bar - Always visible */}
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center justify-between px-3 py-2 safe-area-inset-top">
                    {/* Back button */}
                    <button
                        onClick={() => router.push('/admin/afcon25/camera')}
                        className="p-2 bg-black/40 rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>

                    {/* Status badges - compact */}
                    <div className="flex items-center gap-1.5">
                        <span className="px-2 py-1 bg-gray-800/80 rounded-full text-xs font-bold text-white">
                            CAM {cameraId}
                        </span>

                        {isLive && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-red-600 rounded-full text-xs font-bold text-white">
                                <Radio className="w-3 h-3 animate-pulse" />
                                LIVE
                            </span>
                        )}

                        {/* Connection Status - small indicator */}
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isStreaming ? 'bg-green-600/80 text-white' :
                                isConnecting ? 'bg-yellow-600/80 text-white' :
                                    'bg-gray-700/80 text-gray-300'
                            }`}>
                            {isStreaming ? <Wifi className="w-3 h-3" /> :
                                isConnecting ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> :
                                    <WifiOff className="w-3 h-3" />}
                        </span>
                    </div>

                    {/* Zoom indicator */}
                    {localStream && zoomCapabilities.supported && (
                        <span className="px-2 py-1 bg-yellow-500/80 rounded-full text-xs font-bold text-black">
                            {zoomLevel.toFixed(1)}x
                        </span>
                    )}
                    {(!localStream || !zoomCapabilities.supported) && <div className="w-10" />}
                </div>
            </div>

            {/* Full Screen Video */}
            <div className="flex-1 relative">
                {localStream ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Camera className="w-16 h-16 text-gray-600 mb-3" />
                        <p className="text-gray-400 text-sm">Tap Start to enable camera</p>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="absolute inset-x-3 top-14 bg-red-500/90 rounded-lg px-3 py-2 z-30">
                        <p className="text-white text-xs font-medium">{error}</p>
                    </div>
                )}

                {/* Zoom Controls - Right Side - Always visible when camera active */}
                {localStream && zoomCapabilities.supported && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
                        <div className="bg-black/50 backdrop-blur-sm rounded-xl p-1.5 space-y-1.5">
                            {[0.5, 1, 2, 5].map((level) => {
                                const isAvailable = level >= zoomCapabilities.min && level <= zoomCapabilities.max;
                                const isActive = Math.abs(zoomLevel - level) < 0.1;

                                return (
                                    <button
                                        key={level}
                                        onClick={() => handleZoomSelect(level)}
                                        disabled={!isAvailable}
                                        className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs transition-all ${isActive
                                                ? 'bg-yellow-500 text-black'
                                                : isAvailable
                                                    ? 'bg-white/20 text-white active:bg-white/30'
                                                    : 'bg-white/5 text-white/30'
                                            }`}
                                    >
                                        {level}x
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls - Always visible */}
            <div className="bg-black/80 backdrop-blur-sm px-4 py-3 safe-area-inset-bottom">
                {/* Match Info - Compact */}
                {fixture && (
                    <div className="text-center mb-2">
                        <span className="text-white/80 text-xs">
                            {fixture.homeTeamName || 'Home'} vs {fixture.awayTeamName || 'Away'}
                        </span>
                    </div>
                )}

                {/* Camera Controls Row */}
                <div className="flex items-center justify-center gap-4">
                    {/* Toggle Camera */}
                    <button
                        onClick={toggleCamera}
                        disabled={!localStream}
                        className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center disabled:opacity-30"
                    >
                        <RotateCcw className="w-5 h-5 text-white" />
                    </button>

                    {/* Main Action Button */}
                    {!localStream ? (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={startPreview}
                            disabled={isConnecting}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex flex-col items-center justify-center shadow-lg"
                        >
                            <Camera className="w-7 h-7 text-white" />
                        </motion.button>
                    ) : !isStreaming ? (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={startStreaming}
                            disabled={isConnecting}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex flex-col items-center justify-center shadow-lg"
                        >
                            {isConnecting ? (
                                <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Play className="w-7 h-7 text-white" />
                            )}
                        </motion.button>
                    ) : (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={stopStreaming}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex flex-col items-center justify-center shadow-lg"
                        >
                            <Square className="w-7 h-7 text-white" />
                        </motion.button>
                    )}

                    {/* Mute Toggle */}
                    <button
                        onClick={handleToggleMute}
                        disabled={!localStream}
                        className={`w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-30 ${isMuted ? 'bg-red-500' : 'bg-white/15'
                            }`}
                    >
                        {isMuted ? (
                            <MicOff className="w-5 h-5 text-white" />
                        ) : (
                            <Mic className="w-5 h-5 text-white" />
                        )}
                    </button>
                </div>

                {/* Status Text - Compact */}
                <div className="text-center mt-2">
                    <p className="text-xs text-gray-400">
                        {isLive ? (
                            <span className="text-red-400 font-medium">🔴 LIVE on broadcast</span>
                        ) : isStreaming ? (
                            <span className="text-green-400">✓ Streaming</span>
                        ) : localStream ? (
                            'Tap play to stream'
                        ) : (
                            'Tap to start camera'
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
