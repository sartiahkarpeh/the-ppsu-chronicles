'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Film, Clock, Calendar, Share2 } from 'lucide-react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { ReplayPlayer } from '@/components/afcon/ReplayPlayer';
import type { BroadcastRecording } from '@/types/recordingTypes';
import { formatRecordingDuration } from '@/types/recordingTypes';
import dayjs from 'dayjs';

export default function PublicReplayPage({
    params,
}: {
    params: Promise<{ recordingId: string }>;
}) {
    const resolvedParams = use(params);
    const router = useRouter();
    const recordingId = resolvedParams.recordingId;

    const [recording, setRecording] = useState<BroadcastRecording | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch recording
    useEffect(() => {
        const fetchRecording = async () => {
            try {
                const docRef = doc(db, 'broadcast_recordings', recordingId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setRecording({
                        id: docSnap.id,
                        ...data,
                    } as BroadcastRecording);
                } else {
                    setError('Recording not found');
                }
            } catch (err) {
                console.error('Error fetching recording:', err);
                setError('Failed to load recording');
            } finally {
                setLoading(false);
            }
        };

        fetchRecording();
    }, [recordingId]);

    // Share
    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `${recording?.homeTeamName} vs ${recording?.awayTeamName} - Replay`,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !recording) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
                <Film className="w-16 h-16 text-gray-600 mb-4" />
                <h1 className="text-xl font-bold mb-2">{error || 'Recording not found'}</h1>
                <button
                    onClick={() => router.push('/afcon25')}
                    className="mt-4 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                >
                    Go to AFCON25
                </button>
            </div>
        );
    }

    if (recording.status !== 'completed') {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
                <Film className="w-16 h-16 text-yellow-500 mb-4" />
                <h1 className="text-xl font-bold mb-2">Recording in Progress</h1>
                <p className="text-gray-400">This replay will be available once the broadcast ends</p>
                <button
                    onClick={() => router.push('/afcon25')}
                    className="mt-4 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                >
                    Go to AFCON25
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-gray-900/90 backdrop-blur-lg border-b border-gray-800">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.back()}
                                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-300" />
                            </button>
                            <div>
                                <h1 className="text-lg font-bold text-white">
                                    {recording.homeTeamName} vs {recording.awayTeamName}
                                </h1>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Film className="w-3 h-3" />
                                    <span>Replay</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleShare}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <Share2 className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Video Player */}
            <div className="p-4">
                <ReplayPlayer
                    recording={recording}
                    homeTeamName={recording.homeTeamName}
                    awayTeamName={recording.awayTeamName}
                    homeTeamLogo={recording.homeTeamLogo}
                    awayTeamLogo={recording.awayTeamLogo}
                />
            </div>

            {/* Match Info */}
            <div className="px-4 pb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800 rounded-2xl p-4"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {recording.homeTeamLogo && (
                                <img src={recording.homeTeamLogo} alt="" className="w-12 h-12 object-contain" />
                            )}
                            <div>
                                <h2 className="text-white font-bold">{recording.homeTeamName}</h2>
                                <span className="text-gray-500 text-sm">vs</span>
                                <h2 className="text-white font-bold">{recording.awayTeamName}</h2>
                            </div>
                            {recording.awayTeamLogo && (
                                <img src={recording.awayTeamLogo} alt="" className="w-12 h-12 object-contain" />
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>Duration: {formatRecordingDuration(recording.duration)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>
                                {recording.startedAt instanceof Timestamp
                                    ? dayjs(recording.startedAt.toDate()).format('MMM D, YYYY')
                                    : 'N/A'
                                }
                            </span>
                        </div>
                    </div>

                    {/* Camera Events Summary */}
                    {recording.cameraEvents.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <p className="text-gray-500 text-xs mb-2">CAMERA CHANGES</p>
                            <div className="flex flex-wrap gap-2">
                                {recording.cameraEvents
                                    .filter(e => e.type === 'camera-switch')
                                    .map((event, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300"
                                        >
                                            {formatRecordingDuration(event.timestamp)} → CAM {event.toCameraId}
                                        </span>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
