'use client';

import React, { useEffect, useRef, use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Radio,
    CircleOff,
    Volume2,
    VolumeX,
    Maximize2,
    Camera,
    CameraOff,
    Settings,
    Eye,
    Users
} from 'lucide-react';
import { doc, onSnapshot, getDocs, query, collection, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useWebRTCViewer } from '@/hooks/useWebRTCViewer';
import type { Fixture } from '@/types/fixtureTypes';
import type { Team } from '@/types/afcon';

// Small camera feed for selection
interface SmallVideoFeedProps {
    cameraId: 1 | 2 | 3 | 4;
    stream: MediaStream | null;
    isActive: boolean;
    isConnected: boolean;
    onSelect: () => void;
}

function SmallVideoFeed({ cameraId, stream, isActive, isConnected, onSelect }: SmallVideoFeedProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <button
            onClick={onSelect}
            className={`relative bg-gray-900 rounded-lg overflow-hidden aspect-video transition-all ${isActive
                ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-gray-900'
                : 'hover:ring-2 hover:ring-blue-500/50'
                }`}
        >
            {/* Camera Label */}
            <div className="absolute top-1 left-1 z-10 flex items-center gap-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isActive ? 'bg-red-600 text-white' : 'bg-gray-800/80 text-gray-300'
                    }`}>
                    CAM {cameraId}
                </span>
                {isActive && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-600 rounded text-[10px] font-bold text-white">
                        <Radio className="w-2 h-2" />
                        LIVE
                    </span>
                )}
            </div>

            {/* Video or Placeholder */}
            {stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800">
                    {isConnected ? (
                        <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <CameraOff className="w-6 h-6 text-gray-600" />
                    )}
                </div>
            )}

            {/* Selection Overlay */}
            {stream && !isActive && (
                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <span className="px-2 py-1 bg-red-600 rounded text-xs font-bold text-white">
                        Go Live
                    </span>
                </div>
            )}
        </button>
    );
}

// Large preview showing what public sees
interface MainPreviewProps {
    stream: MediaStream | null;
    activeCameraId: 1 | 2 | 3 | 4 | null;
    fixture: Fixture | null;
    onStopLive: () => void;
}

function MainPreview({ stream, activeCameraId, fixture, onStopLive }: MainPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(true);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video">
            {/* Public View Label */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 rounded-lg text-xs font-bold text-white">
                    <Eye className="w-3 h-3" />
                    PUBLIC VIEW
                </span>
                {activeCameraId && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 rounded-lg text-xs font-bold text-white animate-pulse">
                        <Radio className="w-3 h-3" />
                        CAM {activeCameraId} LIVE
                    </span>
                )}
            </div>

            {/* Simulated Viewer Count */}
            <div className="absolute top-3 right-3 z-10">
                <span className="flex items-center gap-1 px-2 py-1 bg-black/60 rounded-lg text-xs text-gray-300">
                    <Users className="w-3 h-3" />
                    -- watching
                </span>
            </div>

            {/* Video or Placeholder */}
            {stream && activeCameraId ? (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={isMuted}
                        className="w-full h-full object-cover"
                    />

                    {/* Score Overlay - What public sees */}
                    <div className="absolute top-12 left-1/2 -translate-x-1/2">
                        <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-2 rounded-xl border border-blue-600/30 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <span className="text-white font-bold text-sm">{fixture?.homeTeamName || 'Home'}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-black text-2xl">{fixture?.homeScore || 0}</span>
                                    <span className="text-gray-400">-</span>
                                    <span className="text-white font-black text-2xl">{fixture?.awayScore || 0}</span>
                                </div>
                                <span className="text-white font-bold text-sm">{fixture?.awayTeamName || 'Away'}</span>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mb-4">
                        <Radio className="w-10 h-10 text-gray-500" />
                    </div>
                    <p className="text-gray-400 text-lg font-medium">No Camera Live</p>
                    <p className="text-gray-500 text-sm">Select a camera below to start broadcasting</p>
                </div>
            )}

            {/* Controls */}
            {stream && activeCameraId && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="p-2.5 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
                            >
                                {isMuted ? (
                                    <VolumeX className="w-5 h-5 text-white" />
                                ) : (
                                    <Volume2 className="w-5 h-5 text-white" />
                                )}
                            </button>
                            <button
                                onClick={() => videoRef.current?.requestFullscreen()}
                                className="p-2.5 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
                            >
                                <Maximize2 className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        <button
                            onClick={onStopLive}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm font-medium transition-colors"
                        >
                            <CircleOff className="w-4 h-4" />
                            Stop Broadcasting
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function BroadcastDashboardPage({
    params,
}: {
    params: Promise<{ fixtureId: string }>;
}) {
    const resolvedParams = use(params);
    const router = useRouter();
    const fixtureId = resolvedParams.fixtureId;

    const [fixture, setFixture] = useState<Fixture | null>(null);
    const [teams, setTeams] = useState<Map<string, Team>>(new Map());

    const {
        streams,
        room,
        activeCameraId,
        goLive,
        stopLive,
        getConnectedCameras,
    } = useWebRTCViewer({ fixtureId });

    // Fetch teams
    useEffect(() => {
        const fetchTeams = async () => {
            const q = query(collection(db, 'afcon_teams'), orderBy('name'));
            const snapshot = await getDocs(q);
            const teamsMap = new Map<string, Team>();
            snapshot.docs.forEach(doc => {
                teamsMap.set(doc.id, { id: doc.id, ...doc.data() } as Team);
            });
            setTeams(teamsMap);
        };
        fetchTeams();
    }, []);

    // Fetch fixture with team names
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'fixtures', fixtureId), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const homeTeam = teams.get(data.homeTeamId);
                const awayTeam = teams.get(data.awayTeamId);

                setFixture({
                    id: snapshot.id,
                    ...data,
                    homeTeamName: homeTeam?.name || 'TBD',
                    awayTeamName: awayTeam?.name || 'TBD',
                } as Fixture);
            }
        });
        return () => unsubscribe();
    }, [fixtureId, teams]);

    // Get stream for a camera
    const getStreamForCamera = (cameraId: 1 | 2 | 3 | 4): MediaStream | null => {
        const stream = streams.get(`camera${cameraId}`);
        return stream?.stream || null;
    };

    // Get active stream (what public sees)
    const getActiveStream = (): MediaStream | null => {
        if (!activeCameraId) return null;
        return getStreamForCamera(activeCameraId);
    };

    // Check if camera is connected
    const isCameraConnected = (cameraId: 1 | 2 | 3 | 4): boolean => {
        const camera = room?.cameras?.[`camera${cameraId}`];
        return camera?.status === 'streaming' || camera?.status === 'connected';
    };

    const connectedCameras = getConnectedCameras();

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-[#0a0a0f]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push('/admin/afcon25/broadcast')}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {fixture?.homeTeamName} vs {fixture?.awayTeamName}
                                </h1>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>Broadcast Control</span>
                                    {activeCameraId && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white rounded-full font-medium animate-pulse">
                                            <Radio className="w-3 h-3" />
                                            LIVE
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full text-xs text-green-600 dark:text-green-400 font-medium">
                                <Camera className="w-3 h-3" />
                                {connectedCameras.length}/4
                            </span>
                            <button
                                onClick={() => window.open(`/afcon25/fixtures/${fixtureId}`, '_blank')}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs text-white font-medium transition-colors"
                            >
                                View Public Page
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-4 space-y-4">
                {/* Large Preview - What Public Sees */}
                <MainPreview
                    stream={getActiveStream()}
                    activeCameraId={activeCameraId}
                    fixture={fixture}
                    onStopLive={stopLive}
                />

                {/* Camera Selector - 4 small feeds */}
                <div>
                    <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Select Camera to Broadcast
                    </h2>
                    <div className="grid grid-cols-4 gap-2">
                        {([1, 2, 3, 4] as const).map((cameraId) => (
                            <SmallVideoFeed
                                key={cameraId}
                                cameraId={cameraId}
                                stream={getStreamForCamera(cameraId)}
                                isActive={activeCameraId === cameraId}
                                isConnected={isCameraConnected(cameraId)}
                                onSelect={() => goLive(cameraId)}
                            />
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => router.push(`/admin/afcon25/fixtures/${fixtureId}/live`)}
                        className="py-3 bg-gray-200 dark:bg-gray-800 rounded-xl text-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                    >
                        Open Live Console
                    </button>
                    <button
                        onClick={() => {
                            const url = `${window.location.origin}/admin/afcon25/camera`;
                            navigator.clipboard.writeText(url);
                            alert('Camera URL copied!');
                        }}
                        className="py-3 bg-blue-600 rounded-xl text-center text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                        Copy Camera URL
                    </button>
                </div>
            </div>
        </div>
    );
}
