'use client';

import React, { useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
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

    const fixtureId = resolvedParams.fixtureId;
    const cameraId = (parseInt(searchParams.get('cam') || '1') as 1 | 2 | 3 | 4);

    const [fixture, setFixture] = React.useState<Fixture | null>(null);
    const [isMuted, setIsMuted] = React.useState(false);

    const {
        localStream,
        isConnecting,
        isConnected,
        isStreaming,
        isLive,
        error,
        room,
        startPreview,
        stopPreview,
        startStreaming,
        stopStreaming,
        toggleCamera,
        toggleMute,
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

    // Handle mute toggle
    const handleToggleMute = () => {
        toggleMute();
        setIsMuted(!isMuted);
    };

    // Get connected cameras count
    const connectedCameras = room?.cameras
        ? Object.values(room.cameras).filter(Boolean).length
        : 0;

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center justify-between px-4 py-4">
                    <button
                        onClick={() => router.push('/admin/afcon25/camera')}
                        className="p-2 bg-black/50 rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>

                    <div className="flex items-center gap-2">
                        {/* Camera ID Badge */}
                        <span className="px-3 py-1 bg-red-600 rounded-full text-xs font-bold text-white">
                            CAM {cameraId}
                        </span>

                        {/* Status Badge */}
                        {isLive && (
                            <motion.span
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                className="flex items-center gap-1 px-3 py-1 bg-red-600 rounded-full text-xs font-bold text-white"
                            >
                                <Radio className="w-3 h-3 animate-pulse" />
                                ON AIR
                            </motion.span>
                        )}
                    </div>

                    <div className="w-9" />
                </div>
            </div>

            {/* Video Preview */}
            <div className="flex-1 relative bg-gray-900">
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
                        <Camera className="w-16 h-16 text-gray-600 mb-4" />
                        <p className="text-gray-400 text-sm mb-2">Camera Preview</p>
                        <p className="text-gray-500 text-xs">Tap "Start Camera" to begin</p>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="absolute inset-x-4 top-20 bg-red-500/90 rounded-xl p-4">
                        <p className="text-white text-sm font-medium">{error}</p>
                    </div>
                )}

                {/* Match Info Overlay */}
                {fixture && (
                    <div className="absolute bottom-28 left-4 right-4">
                        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-medium text-sm">
                                        {fixture.homeTeamName || 'Home'} vs {fixture.awayTeamName || 'Away'}
                                    </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${fixture.status === 'live' ? 'bg-red-500 text-white' :
                                        fixture.status === 'ht' ? 'bg-yellow-500 text-black' :
                                            'bg-gray-600 text-white'
                                    }`}>
                                    {fixture.status?.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Connection Status */}
                <div className="absolute bottom-40 left-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isStreaming ? 'bg-green-500/20 text-green-400' :
                            isConnecting ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-800 text-gray-400'
                        }`}>
                        {isStreaming ? (
                            <>
                                <Wifi className="w-3 h-3" />
                                Connected ({connectedCameras} cams)
                            </>
                        ) : isConnecting ? (
                            <>
                                <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-3 h-3" />
                                Not Connected
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-[#12121a] border-t border-gray-800 px-4 py-6 safe-area-inset-bottom">
                {/* Camera Controls Row */}
                <div className="flex items-center justify-center gap-4 mb-4">
                    {/* Toggle Camera */}
                    <button
                        onClick={toggleCamera}
                        disabled={!localStream}
                        className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center disabled:opacity-50"
                    >
                        <RotateCcw className="w-6 h-6 text-white" />
                    </button>

                    {/* Main Action Button */}
                    {!localStream ? (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={startPreview}
                            disabled={isConnecting}
                            className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex flex-col items-center justify-center shadow-lg shadow-blue-500/30"
                        >
                            <Camera className="w-8 h-8 text-white" />
                            <span className="text-xs text-white mt-1">Start</span>
                        </motion.button>
                    ) : !isStreaming ? (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={startStreaming}
                            disabled={isConnecting}
                            className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex flex-col items-center justify-center shadow-lg shadow-green-500/30"
                        >
                            {isConnecting ? (
                                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Play className="w-8 h-8 text-white" />
                                    <span className="text-xs text-white mt-1">Stream</span>
                                </>
                            )}
                        </motion.button>
                    ) : (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={stopStreaming}
                            className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex flex-col items-center justify-center shadow-lg shadow-red-500/30"
                        >
                            <Square className="w-8 h-8 text-white" />
                            <span className="text-xs text-white mt-1">Stop</span>
                        </motion.button>
                    )}

                    {/* Mute Toggle */}
                    <button
                        onClick={handleToggleMute}
                        disabled={!localStream}
                        className={`w-14 h-14 rounded-full flex items-center justify-center disabled:opacity-50 ${isMuted ? 'bg-red-600' : 'bg-gray-800'
                            }`}
                    >
                        {isMuted ? (
                            <MicOff className="w-6 h-6 text-white" />
                        ) : (
                            <Mic className="w-6 h-6 text-white" />
                        )}
                    </button>
                </div>

                {/* Status Text */}
                <div className="text-center">
                    <p className="text-sm text-gray-400">
                        {isLive ? (
                            <span className="text-red-400 font-medium">🔴 Your camera is LIVE on the broadcast</span>
                        ) : isStreaming ? (
                            <span className="text-green-400">✓ Streaming to admin dashboard</span>
                        ) : localStream ? (
                            'Tap "Stream" to connect to dashboard'
                        ) : (
                            'Tap "Start" to enable camera'
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
