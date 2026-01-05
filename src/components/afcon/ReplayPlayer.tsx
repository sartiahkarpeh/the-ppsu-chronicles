'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Maximize2,
    Camera,
    Image as ImageIcon
} from 'lucide-react';
import type { BroadcastRecording, RecordingSegment, CameraEvent } from '@/types/recordingTypes';
import { getCameraStateAtTime, findSegmentAtTime } from '@/types/recordingTypes';

interface ReplayPlayerProps {
    recording: BroadcastRecording;
    homeTeamName?: string;
    awayTeamName?: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
}

export function ReplayPlayer({
    recording,
    homeTeamName,
    awayTeamName,
    homeTeamLogo,
    awayTeamLogo,
}: ReplayPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(recording.duration);
    const [isMuted, setIsMuted] = useState(false);
    const [currentSegment, setCurrentSegment] = useState<RecordingSegment | null>(null);
    const [showControls, setShowControls] = useState(true);

    // Get camera state at current time
    const cameraState = getCameraStateAtTime(recording.cameraEvents, currentTime);

    // Load segment for current time
    useEffect(() => {
        const segment = findSegmentAtTime(recording.segments, currentTime);
        if (segment && segment.id !== currentSegment?.id) {
            setCurrentSegment(segment);
        }
    }, [currentTime, recording.segments, currentSegment?.id]);

    // Set video source when segment changes
    useEffect(() => {
        if (videoRef.current && currentSegment) {
            const video = videoRef.current;
            const currentVideoTime = video.currentTime;

            // Calculate the time within this segment
            const segmentTime = currentTime - currentSegment.startTime;

            if (video.src !== currentSegment.url) {
                video.src = currentSegment.url;
                video.currentTime = segmentTime;
                if (isPlaying) {
                    video.play().catch(console.error);
                }
            }
        }
    }, [currentSegment, isPlaying]);

    // Update current time as video plays
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            if (currentSegment) {
                const totalTime = currentSegment.startTime + video.currentTime;
                setCurrentTime(totalTime);
            }
        };

        const handleEnded = () => {
            // Move to next segment
            const nextSegment = recording.segments.find(s => s.segmentNumber === (currentSegment?.segmentNumber || 0) + 1);
            if (nextSegment) {
                setCurrentSegment(nextSegment);
            } else {
                setIsPlaying(false);
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('ended', handleEnded);
        };
    }, [currentSegment, recording.segments]);

    // Play/Pause
    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
        } else {
            video.play().catch(console.error);
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    // Seek
    const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        setCurrentTime(newTime);

        // Find the segment containing this time
        const segment = findSegmentAtTime(recording.segments, newTime);
        if (segment) {
            setCurrentSegment(segment);
            if (videoRef.current) {
                videoRef.current.currentTime = newTime - segment.startTime;
            }
        }
    }, [recording.segments]);

    // Skip forward/backward
    const skip = useCallback((seconds: number) => {
        const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
        setCurrentTime(newTime);

        const segment = findSegmentAtTime(recording.segments, newTime);
        if (segment) {
            setCurrentSegment(segment);
            if (videoRef.current) {
                videoRef.current.currentTime = newTime - segment.startTime;
            }
        }
    }, [currentTime, duration, recording.segments]);

    // Fullscreen
    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            containerRef.current.requestFullscreen();
        }
    }, []);

    // Format time
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Auto-hide controls
    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const handleMouseMove = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setShowControls(false), 3000);
        };

        const container = containerRef.current;
        container?.addEventListener('mousemove', handleMouseMove);

        return () => {
            container?.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(timeout);
        };
    }, []);

    // Calculate camera switch markers for timeline
    const cameraMarkers = recording.cameraEvents
        .filter(e => e.type === 'camera-switch')
        .map(e => ({
            position: (e.timestamp / duration) * 100,
            cameraId: e.toCameraId,
        }));

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group"
        >
            {/* Video Element */}
            {cameraState.isUsingFallback && cameraState.fallbackUrl ? (
                <img
                    src={cameraState.fallbackUrl}
                    alt="Fallback"
                    className="w-full h-full object-cover"
                />
            ) : (
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted={isMuted}
                    onClick={togglePlay}
                />
            )}

            {/* Overlays */}
            {showControls && (
                <>
                    {/* Top Bar */}
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-purple-600 rounded text-xs font-bold text-white">
                                    REPLAY
                                </span>
                                {cameraState.cameraId && (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-black/60 rounded text-xs text-white">
                                        <Camera className="w-3 h-3" />
                                        CAM {cameraState.cameraId}
                                    </span>
                                )}
                                {cameraState.isUsingFallback && (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-orange-600 rounded text-xs text-white">
                                        <ImageIcon className="w-3 h-3" />
                                        FALLBACK
                                    </span>
                                )}
                            </div>
                            <div className="text-white text-sm font-medium">
                                {homeTeamName} vs {awayTeamName}
                            </div>
                        </div>
                    </div>

                    {/* Center Play Button */}
                    {!isPlaying && (
                        <motion.button
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={togglePlay}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                                <Play className="w-10 h-10 text-white ml-1" />
                            </div>
                        </motion.button>
                    )}

                    {/* Bottom Controls */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        {/* Timeline */}
                        <div className="relative mb-4">
                            {/* Camera switch markers */}
                            {cameraMarkers.map((marker, i) => (
                                <div
                                    key={i}
                                    className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-yellow-400 rounded"
                                    style={{ left: `${marker.position}%` }}
                                    title={`Camera ${marker.cameraId}`}
                                />
                            ))}

                            <input
                                type="range"
                                min={0}
                                max={duration}
                                value={currentTime}
                                onChange={handleSeek}
                                className="w-full h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                            />

                            {/* Time Display */}
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* Skip Back */}
                                <button
                                    onClick={() => skip(-10)}
                                    className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                                    title="Back 10 seconds"
                                >
                                    <SkipBack className="w-5 h-5" />
                                </button>

                                {/* Play/Pause */}
                                <button
                                    onClick={togglePlay}
                                    className="p-3 bg-white text-black rounded-full hover:bg-gray-200 transition-colors"
                                >
                                    {isPlaying ? (
                                        <Pause className="w-6 h-6" />
                                    ) : (
                                        <Play className="w-6 h-6 ml-0.5" />
                                    )}
                                </button>

                                {/* Skip Forward */}
                                <button
                                    onClick={() => skip(10)}
                                    className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                                    title="Forward 10 seconds"
                                >
                                    <SkipForward className="w-5 h-5" />
                                </button>

                                {/* Mute */}
                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    {isMuted ? (
                                        <VolumeX className="w-5 h-5" />
                                    ) : (
                                        <Volume2 className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Fullscreen */}
                                <button
                                    onClick={toggleFullscreen}
                                    className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <Maximize2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
