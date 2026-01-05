'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Film, ArrowLeft, Play, Trash2, Clock, Calendar, Users } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { BroadcastRecording } from '@/types/recordingTypes';
import { formatRecordingDuration } from '@/types/recordingTypes';
import dayjs from 'dayjs';

export default function AdminReplaysPage() {
    const router = useRouter();
    const [recordings, setRecordings] = useState<BroadcastRecording[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Subscribe to recordings
    useEffect(() => {
        const q = query(
            collection(db, 'broadcast_recordings'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const recs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as BroadcastRecording[];
            setRecordings(recs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Delete recording
    const handleDelete = async (recordingId: string) => {
        if (!confirm('Are you sure you want to delete this recording? This cannot be undone.')) {
            return;
        }

        setDeleting(recordingId);
        try {
            await deleteDoc(doc(db, 'broadcast_recordings', recordingId));
            // Note: In production, you'd also delete the storage files
        } catch (error) {
            console.error('Error deleting recording:', error);
            alert('Failed to delete recording');
        } finally {
            setDeleting(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'recording': return 'bg-red-500 text-white';
            case 'processing': return 'bg-yellow-500 text-black';
            case 'completed': return 'bg-green-500 text-white';
            case 'failed': return 'bg-gray-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="px-4 py-4">
                    <div className="flex items-center gap-3 mb-2">
                        <button
                            onClick={() => router.push('/admin/afcon25/broadcast')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
                            <Film className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Broadcast Replays</h1>
                            <p className="text-sm text-gray-500">View and manage recorded broadcasts</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="px-4 py-4">
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {recordings.length}
                        </p>
                        <p className="text-xs text-gray-500">Total Recordings</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
                        <p className="text-2xl font-bold text-green-600">
                            {recordings.filter(r => r.status === 'completed').length}
                        </p>
                        <p className="text-xs text-gray-500">Completed</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
                        <p className="text-2xl font-bold text-red-500">
                            {recordings.filter(r => r.status === 'recording').length}
                        </p>
                        <p className="text-xs text-gray-500">In Progress</p>
                    </div>
                </div>
            </div>

            {/* Recordings List */}
            <div className="px-4 pb-8">
                <h2 className="text-sm text-gray-500 uppercase tracking-wider mb-3 font-medium">All Recordings</h2>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : recordings.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <Film className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No recordings yet</p>
                        <p className="text-gray-400 text-sm mt-1">Start recording from the broadcast dashboard</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recordings.map((recording) => (
                            <motion.div
                                key={recording.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">
                                            {recording.homeTeamName} vs {recording.awayTeamName}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(recording.status)}`}>
                                                {recording.status.toUpperCase()}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-gray-500">
                                                <Clock className="w-3 h-3" />
                                                {formatRecordingDuration(recording.duration)}
                                            </span>
                                        </div>
                                    </div>
                                    {recording.thumbnailUrl && (
                                        <img
                                            src={recording.thumbnailUrl}
                                            alt="Thumbnail"
                                            className="w-20 h-12 object-cover rounded-lg"
                                        />
                                    )}
                                </div>

                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                        {recording.startedAt instanceof Timestamp
                                            ? dayjs(recording.startedAt.toDate()).format('MMM D, YYYY • h:mm A')
                                            : 'N/A'
                                        }
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span>{recording.segments?.length || 0} segments</span>
                                </div>

                                <div className="flex gap-2">
                                    {recording.status === 'completed' && (
                                        <button
                                            onClick={() => router.push(`/afcon25/replays/${recording.id}`)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors"
                                        >
                                            <Play className="w-4 h-4" />
                                            Watch
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(recording.id)}
                                        disabled={deleting === recording.id}
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 text-sm transition-colors disabled:opacity-50"
                                    >
                                        {deleting === recording.id ? (
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
