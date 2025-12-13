'use client';

import React, { useEffect, useRef, use, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Camera,
    CameraOff,
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
    const [showControls, setShowControls] = useState(true);
    const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

    const {
        localStream,
        isConnecting,
        isConnected,
        isStreaming,
        isLive,
        error,
        room,
        zoomLevel,
        zoomCapabilities,
        availableZoomPresets,
        startPreview,
        stopPreview,
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
                    // Small delay to ensure DOM is ready
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await containerRef.current.requestFullscreen();
                }
            } catch (error) {
                console.log('Fullscreen not available:', error);
            }
        };
        requestFullscreen();
    }, []);

    // Auto-hide controls after 3 seconds
    useEffect(() => {
        if (showControls && localStream) {
            if (controlsTimeout) clearTimeout(controlsTimeout);
            const timeout = setTimeout(() => setShowControls(false), 3000);
            setControlsTimeout(timeout);
        }
        return () => {
            if (controlsTimeout) clearTimeout(controlsTimeout);
        };
    }, [showControls, localStream]);

    // Handle screen tap to show/hide controls
    const handleScreenTap = () => {
        setShowControls(true);
    };

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
            className="fixed inset-0 bg-black"
            onClick={handleScreenTap}
        >
            {/* Full Screen Video */}
            <div className="absolute inset-0">
                {localStream ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <Camera className="w-20 h-20 text-gray-600 mb-4" />
                        <p className="text-gray-400 text-lg mb-2">Camera Preview</p>
                        <p className="text-gray-500 text-sm">Tap below to start camera</p>
                    </div>
                )}
            </div>

            {/* Overlay Controls - Animated */}
            <AnimatePresence>
                {showControls && (
                    <>
                        {/* Top Bar */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent pt-safe"
                        >
                            <div className="flex items-center justify-between px-4 py-4">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push('/admin/afcon25/camera');
                                    }}
                                    className="p-3 bg-black/50 rounded-full"
                                >
                                    <ArrowLeft className="w-6 h-6 text-white" />
                                </button>

                                <div className="flex items-center gap-2">
                                    {/* Camera ID Badge */}
                                    <span className="px-4 py-2 bg-red-600 rounded-full text-sm font-bold text-white">
                                        CAM {cameraId}
                                    </span>

                                    {/* Live Status */}
                                    {isLive && (
                                        <motion.span
                                            initial={{ scale: 0.9 }}
                                            animate={{ scale: 1 }}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 rounded-full text-sm font-bold text-white"
                                        >
                                            <Radio className="w-4 h-4 animate-pulse" />
                                            ON AIR
                                        </motion.span>
                                    )}
                                </div>

                                {/* Connection Status */}
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium ${isStreaming ? 'bg-green-500/30 text-green-400' :
                                        isConnecting ? 'bg-yellow-500/30 text-yellow-400' :
                                            'bg-gray-800/80 text-gray-400'
                                    }`}>
                                    {isStreaming ? (
                                        <><Wifi className="w-4 h-4" /> Live</>
                                    ) : isConnecting ? (
                                        <><div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /></>
                                    ) : (
                                        <><WifiOff className="w-4 h-4" /></>
                                    )}
                                </div>
                            </div>
                        </motion.div>

                        {/* Zoom Controls - Right Side */}
                        {localStream && zoomCapabilities.supported && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-20"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-2 space-y-2">
                                    <div className="text-center mb-2">
                                        <ZoomIn className="w-5 h-5 text-white/60 mx-auto" />
                                    </div>
                                    {[0.5, 1, 2, 5].map((level) => {
                                        const isAvailable = level >= zoomCapabilities.min && level <= zoomCapabilities.max;
                                        const isActive = Math.abs(zoomLevel - level) < 0.1;

                                        return (
                                            <button
                                                key={level}
                                                onClick={() => handleZoomSelect(level)}
                                                disabled={!isAvailable}
                                                className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm transition-all ${isActive
                                                        ? 'bg-yellow-500 text-black scale-110'
                                                        : isAvailable
                                                            ? 'bg-white/20 text-white hover:bg-white/30'
                                                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                                                    }`}
                                            >
                                                {level}x
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* Error Display */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute inset-x-4 top-24 bg-red-500/90 rounded-xl p-4 z-30"
                            >
                                <p className="text-white text-sm font-medium">{error}</p>
                            </motion.div>
                        )}

                        {/* Bottom Controls */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent pb-safe"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Match Info */}
                            {fixture && (
                                <div className="px-4 mb-4">
                                    <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center justify-between">
                                        <span className="text-white font-medium">
                                            {fixture.homeTeamName || 'Home'} vs {fixture.awayTeamName || 'Away'}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${fixture.status === 'live' ? 'bg-red-500 text-white' :
                                                fixture.status === 'ht' ? 'bg-yellow-500 text-black' :
                                                    'bg-gray-600 text-white'
                                            }`}>
                                            {fixture.status?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Camera Controls */}
                            <div className="flex items-center justify-center gap-6 px-4 pb-8">
                                {/* Toggle Camera */}
                                <button
                                    onClick={toggleCamera}
                                    disabled={!localStream}
                                    className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center disabled:opacity-30"
                                >
                                    <RotateCcw className="w-7 h-7 text-white" />
                                </button>

                                {/* Main Action Button */}
                                {!localStream ? (
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={startPreview}
                                        disabled={isConnecting}
                                        className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex flex-col items-center justify-center shadow-2xl shadow-blue-500/40"
                                    >
                                        <Camera className="w-10 h-10 text-white" />
                                        <span className="text-xs text-white mt-1 font-medium">Start</span>
                                    </motion.button>
                                ) : !isStreaming ? (
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={startStreaming}
                                        disabled={isConnecting}
                                        className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex flex-col items-center justify-center shadow-2xl shadow-green-500/40"
                                    >
                                        {isConnecting ? (
                                            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Play className="w-10 h-10 text-white" />
                                                <span className="text-xs text-white mt-1 font-medium">Stream</span>
                                            </>
                                        )}
                                    </motion.button>
                                ) : (
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={stopStreaming}
                                        className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex flex-col items-center justify-center shadow-2xl shadow-red-500/40"
                                    >
                                        <Square className="w-10 h-10 text-white" />
                                        <span className="text-xs text-white mt-1 font-medium">Stop</span>
                                    </motion.button>
                                )}

                                {/* Mute Toggle */}
                                <button
                                    onClick={handleToggleMute}
                                    disabled={!localStream}
                                    className={`w-16 h-16 rounded-full backdrop-blur-sm flex items-center justify-center disabled:opacity-30 ${isMuted ? 'bg-red-500/80' : 'bg-white/20'
                                        }`}
                                >
                                    {isMuted ? (
                                        <MicOff className="w-7 h-7 text-white" />
                                    ) : (
                                        <Mic className="w-7 h-7 text-white" />
                                    )}
                                </button>
                            </div>

                            {/* Status Text */}
                            <div className="text-center pb-4">
                                <p className="text-sm text-gray-400">
                                    {isLive ? (
                                        <span className="text-red-400 font-medium">🔴 Your camera is LIVE on the broadcast</span>
                                    ) : isStreaming ? (
                                        <span className="text-green-400">✓ Streaming to admin dashboard</span>
                                    ) : localStream ? (
                                        'Tap "Stream" to connect'
                                    ) : (
                                        'Tap "Start" to enable camera'
                                    )}
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Tap to show controls hint */}
            {!showControls && localStream && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                    <span className="px-4 py-2 bg-black/40 rounded-full text-white/60 text-xs">
                        Tap to show controls
                    </span>
                </div>
            )}
        </div>
    );
}
