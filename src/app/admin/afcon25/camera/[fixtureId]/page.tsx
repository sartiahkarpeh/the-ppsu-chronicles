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
    Radio
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

    return (
        // Fixed overlay that covers EVERYTHING including parent layout
        <div
            ref={containerRef}
            className="fixed inset-0 z-[9999] bg-black"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
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
                        <Camera className="w-16 h-16 text-gray-600 mb-3" />
                        <p className="text-gray-400 text-sm">Tap Start to enable camera</p>
                    </div>
                )}
            </div>

            {/* Compact Top Bar - Always visible, transparent */}
            <div className="absolute top-0 left-0 right-0 z-20 pt-2 px-2">
                <div className="flex items-center justify-between">
                    {/* Back button */}
                    <button
                        onClick={() => router.push('/admin/afcon25/camera')}
                        className="p-2 bg-black/30 backdrop-blur-sm rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>

                    {/* Status badges - minimal */}
                    <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-black/30 backdrop-blur-sm rounded-full text-[10px] font-bold text-white">
                            CAM {cameraId}
                        </span>

                        {isLive && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-600/90 rounded-full text-[10px] font-bold text-white">
                                <Radio className="w-2.5 h-2.5 animate-pulse" />
                                LIVE
                            </span>
                        )}

                        {/* Connection Status - tiny dot */}
                        <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500' :
                                isConnecting ? 'bg-yellow-500 animate-pulse' :
                                    'bg-gray-500'
                            }`} />
                    </div>

                    {/* Zoom indicator */}
                    {localStream && zoomCapabilities.supported ? (
                        <span className="px-2 py-0.5 bg-yellow-500/80 rounded-full text-[10px] font-bold text-black">
                            {zoomLevel.toFixed(1)}x
                        </span>
                    ) : (
                        <div className="w-8" />
                    )}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="absolute inset-x-3 top-12 bg-red-500/90 rounded-lg px-3 py-2 z-30">
                    <p className="text-white text-xs font-medium">{error}</p>
                </div>
            )}

            {/* Zoom Controls - Right Side - Always visible when camera active */}
            {localStream && zoomCapabilities.supported && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
                    <div className="flex flex-col gap-1">
                        {[0.5, 1, 2, 5].map((level) => {
                            const isAvailable = level >= zoomCapabilities.min && level <= zoomCapabilities.max;
                            const isActive = Math.abs(zoomLevel - level) < 0.1;

                            return (
                                <button
                                    key={level}
                                    onClick={() => handleZoomSelect(level)}
                                    disabled={!isAvailable}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${isActive
                                            ? 'bg-yellow-500 text-black'
                                            : isAvailable
                                                ? 'bg-black/30 backdrop-blur-sm text-white active:bg-white/30'
                                                : 'bg-black/10 text-white/20'
                                        }`}
                                >
                                    {level}x
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bottom Controls - Transparent, always visible */}
            <div className="absolute bottom-0 left-0 right-0 z-20 pb-4 px-4">
                {/* Match Info - Very compact */}
                {fixture && (
                    <div className="text-center mb-2">
                        <span className="text-white/60 text-[10px]">
                            {fixture.homeTeamName} vs {fixture.awayTeamName}
                        </span>
                    </div>
                )}

                {/* Camera Controls Row - Transparent */}
                <div className="flex items-center justify-center gap-5">
                    {/* Toggle Camera */}
                    <button
                        onClick={toggleCamera}
                        disabled={!localStream}
                        className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center disabled:opacity-30"
                    >
                        <RotateCcw className="w-5 h-5 text-white" />
                    </button>

                    {/* Main Action Button */}
                    {!localStream ? (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={startPreview}
                            disabled={isConnecting}
                            className="w-16 h-16 rounded-full bg-blue-500/80 backdrop-blur-sm flex items-center justify-center shadow-lg"
                        >
                            <Camera className="w-7 h-7 text-white" />
                        </motion.button>
                    ) : !isStreaming ? (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={startStreaming}
                            disabled={isConnecting}
                            className="w-16 h-16 rounded-full bg-green-500/80 backdrop-blur-sm flex items-center justify-center shadow-lg"
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
                            className="w-16 h-16 rounded-full bg-red-500/80 backdrop-blur-sm flex items-center justify-center shadow-lg"
                        >
                            <Square className="w-7 h-7 text-white" />
                        </motion.button>
                    )}

                    {/* Mute Toggle */}
                    <button
                        onClick={handleToggleMute}
                        disabled={!localStream}
                        className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center disabled:opacity-30 ${isMuted ? 'bg-red-500/80' : 'bg-black/30'
                            }`}
                    >
                        {isMuted ? (
                            <MicOff className="w-5 h-5 text-white" />
                        ) : (
                            <Mic className="w-5 h-5 text-white" />
                        )}
                    </button>
                </div>

                {/* Status Text - Minimal */}
                <div className="text-center mt-2">
                    <p className="text-[10px] text-white/50">
                        {isLive ? '🔴 LIVE' : isStreaming ? '✓ Streaming' : localStream ? 'Tap play' : 'Tap to start'}
                    </p>
                </div>
            </div>
        </div>
    );
}
