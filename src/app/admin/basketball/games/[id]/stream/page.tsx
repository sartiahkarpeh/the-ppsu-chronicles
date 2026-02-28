'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/config';
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, orderBy, limit as firestoreLimit, Timestamp } from 'firebase/firestore';
import type { BasketballGame, BasketballTeam } from '@/types/basketball';
import type { StreamComment, StreamReaction } from '@/types/streamTypes';
import { STREAM_REACTIONS } from '@/types/streamTypes';
import { StreamBroadcaster, sendStreamComment, sendStreamReaction } from '@/lib/stream/streamManager';
import { StreamRecorder } from '@/lib/stream/streamRecorder';
import {
    ArrowLeft,
    Mic,
    MicOff,
    Video,
    VideoOff,
    Settings,
    X,
    SwitchCamera,
    Flashlight,
    FlashlightOff,
    Users,
    Circle,
    Square,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Play,
    Pause,
    Minus,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// ─── HELPERS ────────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parseClockToSeconds(clock: string): number {
    const [m, s] = clock.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
}

function formatSecondsToMMSS(totalSeconds: number): string {
    const m = Math.floor(Math.max(0, totalSeconds) / 60);
    const s = Math.max(0, totalSeconds) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function defaultClockForPeriod(period: number): number {
    return period <= 4 ? 12 * 60 : 5 * 60;
}

function periodLabel(p: number): string {
    if (p <= 4) return `Q${p}`;
    if (p === 5) return 'OT';
    return `${p - 4}OT`;
}

function vibrate() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
    }
}

// ─── FLOATING REACTION COMPONENT ────────────────────────────────────────
function FloatingReaction({ emoji, id }: { emoji: string; id: number }) {
    const left = 10 + Math.random() * 80;
    return (
        <div
            key={id}
            className="fixed pointer-events-none text-3xl animate-float-up z-[300]"
            style={{
                left: `${left}%`,
                bottom: '20%',
                animation: 'floatUp 2s ease-out forwards',
            }}
        >
            {emoji}
        </div>
    );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────
export default function StreamBroadcastPage() {
    const { id: gameId } = useParams() as { id: string };
    const router = useRouter();

    // Game data
    const [game, setGame] = useState<BasketballGame | null>(null);
    const [homeTeam, setHomeTeam] = useState<BasketballTeam | null>(null);
    const [awayTeam, setAwayTeam] = useState<BasketballTeam | null>(null);
    const [loading, setLoading] = useState(true);

    // Stream state
    const [isStreaming, setIsStreaming] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [viewerCount, setViewerCount] = useState(0);
    const [streamDuration, setStreamDuration] = useState(0);

    // Media controls
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [showSettings, setShowSettings] = useState(false);

    // Settings
    const [resolution, setResolution] = useState<'1280x720' | '1920x1080'>('1280x720');
    const [frameRate, setFrameRate] = useState<30 | 60>(30);

    // End stream hold
    const [holdingEnd, setHoldingEnd] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Comments & reactions
    const [comments, setComments] = useState<StreamComment[]>([]);
    const [floatingReactions, setFloatingReactions] = useState<{ emoji: string; id: number }[]>([]);
    const reactionIdRef = useRef(0);

    // Recording
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [showRecordingOptions, setShowRecordingOptions] = useState(false);
    const recordingBlobRef = useRef<Blob | null>(null);

    // =========================
    // SCORE CONTROL STATE
    // =========================
    const [scoreDrawerOpen, setScoreDrawerOpen] = useState(false);
    const [localHomeScore, setLocalHomeScore] = useState(0);
    const [localAwayScore, setLocalAwayScore] = useState(0);
    const [localPeriod, setLocalPeriod] = useState(1);
    const [localClockSeconds, setLocalClockSeconds] = useState(720);
    const [clockRunning, setClockRunning] = useState(false);
    const [scoreInitialized, setScoreInitialized] = useState(false);
    const [showManualClock, setShowManualClock] = useState(false);
    const [manualClockStr, setManualClockStr] = useState('');
    const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const broadcasterRef = useRef<StreamBroadcaster | null>(null);
    const recorderRef = useRef<StreamRecorder | null>(null);
    const durationRef = useRef<NodeJS.Timeout | null>(null);

    // HTTPS check
    const [isHttps, setIsHttps] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsHttps(window.location.protocol === 'https:' || window.location.hostname === 'localhost');
        }
    }, []);

    // ── Subscribe to game doc + teams ──
    useEffect(() => {
        if (!gameId) return;
        const unsub = onSnapshot(doc(db, 'basketball_games', gameId), (snap) => {
            if (!snap.exists()) {
                router.push('/admin/basketball/games');
                return;
            }
            const data = { id: snap.id, ...snap.data() } as BasketballGame;
            setGame(data);
            setLoading(false);

            // Initialize score state from game data on first load
            if (!scoreInitialized) {
                setLocalHomeScore(data.homeScore || 0);
                setLocalAwayScore(data.awayScore || 0);
                setLocalPeriod(data.period || 1);
                setLocalClockSeconds(parseClockToSeconds(data.clock || '12:00'));
                setScoreInitialized(true);
            }
        });
        return () => unsub();
    }, [gameId, router, scoreInitialized]);

    useEffect(() => {
        if (!game) return;
        const unsubHome = onSnapshot(doc(db, 'basketball_teams', game.homeTeamId), (s) => {
            if (s.exists()) setHomeTeam({ id: s.id, ...s.data() } as BasketballTeam);
        });
        const unsubAway = onSnapshot(doc(db, 'basketball_teams', game.awayTeamId), (s) => {
            if (s.exists()) setAwayTeam({ id: s.id, ...s.data() } as BasketballTeam);
        });
        return () => { unsubHome(); unsubAway(); };
    }, [game?.homeTeamId, game?.awayTeamId]);

    // ── Clock ticker for score control ──
    useEffect(() => {
        if (clockRunning && localClockSeconds > 0) {
            clockIntervalRef.current = setInterval(() => {
                setLocalClockSeconds(prev => {
                    if (prev <= 1) {
                        setClockRunning(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
        };
    }, [clockRunning, localClockSeconds]);

    // ── Initialize camera preview ──
    useEffect(() => {
        let stream: MediaStream | null = null;

        const initCamera = async () => {
            try {
                const [w, h] = resolution.split('x').map(Number);
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode, width: { ideal: w }, height: { ideal: h }, frameRate: { ideal: frameRate } },
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error: any) {
                if (error.name === 'NotAllowedError') {
                    toast.error('Camera permission denied. Please allow camera access in your browser settings.');
                } else if (error.name === 'NotFoundError') {
                    toast.error('No camera found on this device.');
                } else {
                    toast.error('Failed to access camera: ' + error.message);
                }
            }
        };

        if (!isStreaming) {
            initCamera();
        }

        return () => {
            if (stream && !isStreaming) {
                stream.getTracks().forEach(t => t.stop());
            }
        };
    }, [facingMode, resolution, frameRate, isStreaming]);

    // ── Subscribe to live comments ──
    useEffect(() => {
        if (!broadcasterRef.current?.getStreamId()) return;
        const streamId = broadcasterRef.current.getStreamId()!;

        const commentsRef = collection(db, 'basketball_streams', streamId, 'comments');
        const q = query(commentsRef, orderBy('timestamp', 'desc'), firestoreLimit(50));

        const unsub = onSnapshot(q, (snap) => {
            const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as StreamComment));
            setComments(msgs);
        });

        return () => unsub();
    }, [isStreaming]);

    // ── Subscribe to live reactions ──
    useEffect(() => {
        if (!broadcasterRef.current?.getStreamId()) return;
        const streamId = broadcasterRef.current.getStreamId()!;

        const reactionsRef = collection(db, 'basketball_streams', streamId, 'reactions');
        const q = query(reactionsRef, orderBy('timestamp', 'desc'), firestoreLimit(10));

        const unsub = onSnapshot(q, (snap) => {
            for (const change of snap.docChanges()) {
                if (change.type === 'added') {
                    const data = change.doc.data() as StreamReaction;
                    const id = reactionIdRef.current++;
                    setFloatingReactions(prev => [...prev, { emoji: data.emoji, id }]);
                    setTimeout(() => {
                        setFloatingReactions(prev => prev.filter(r => r.id !== id));
                    }, 2500);
                }
            }
        });

        return () => unsub();
    }, [isStreaming]);

    // ── Start Stream ──
    const handleStartStream = useCallback(async () => {
        if (isStarting || isStreaming) return;
        vibrate();
        setIsStarting(true);

        // 3-second countdown
        for (let i = 3; i > 0; i--) {
            setCountdown(i);
            await new Promise(r => setTimeout(r, 1000));
        }
        setCountdown(null);

        try {
            const broadcaster = new StreamBroadcaster(gameId, {
                resolution,
                frameRate,
                facingMode,
            }, {
                onViewerCountChange: (count) => setViewerCount(count),
            });

            broadcasterRef.current = broadcaster;

            // Get stream (reuse existing preview stream if possible)
            const stream = await broadcaster.getLocalStream();
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            await broadcaster.startStream();
            setIsStreaming(true);
            setIsStarting(false);

            // Start duration counter
            durationRef.current = setInterval(() => {
                setStreamDuration(prev => prev + 1);
            }, 1000);

            // Start recording
            const recorder = new StreamRecorder({
                onDurationUpdate: (s) => setRecordingDuration(s),
            });
            recorder.startRecording(stream);
            recorderRef.current = recorder;
            setIsRecording(true);

            toast.success('You are now LIVE! 🔴');
        } catch (error: any) {
            console.error('Failed to start stream:', error);
            toast.error(error.message || 'Failed to start stream');
            setIsStarting(false);
            setCountdown(null);
        }
    }, [gameId, resolution, frameRate, facingMode, isStarting, isStreaming]);

    // ── End Stream ──
    const handleEndStream = useCallback(async () => {
        if (!broadcasterRef.current) return;
        vibrate();

        try {
            // Stop recording
            if (recorderRef.current?.getIsRecording()) {
                const blob = await recorderRef.current.stopRecording();
                if (blob) {
                    recordingBlobRef.current = blob;
                    setShowRecordingOptions(true);
                }
                setIsRecording(false);
            }

            await broadcasterRef.current.endStream();
            broadcasterRef.current.destroy();
            broadcasterRef.current = null;

            if (durationRef.current) {
                clearInterval(durationRef.current);
                durationRef.current = null;
            }

            setIsStreaming(false);
            setViewerCount(0);
            setStreamDuration(0);
            toast.success('Stream ended');
        } catch (error) {
            console.error('Error ending stream:', error);
            toast.error('Error ending stream');
        }
    }, []);

    // ── Hold-to-end logic ──
    const startHoldEnd = useCallback(() => {
        setHoldingEnd(true);
        setHoldProgress(0);
        let progress = 0;

        holdTimerRef.current = setInterval(() => {
            progress += 5;
            setHoldProgress(progress);
            if (progress >= 100) {
                if (holdTimerRef.current) clearInterval(holdTimerRef.current);
                setHoldingEnd(false);
                setHoldProgress(0);
                handleEndStream();
            }
        }, 100);
    }, [handleEndStream]);

    const cancelHoldEnd = useCallback(() => {
        if (holdTimerRef.current) {
            clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        setHoldingEnd(false);
        setHoldProgress(0);
    }, []);

    // ── Toggle controls ──
    const handleToggleMic = () => {
        vibrate();
        if (broadcasterRef.current) {
            const result = broadcasterRef.current.toggleMic();
            setIsMicOn(result);
        } else {
            const stream = videoRef.current?.srcObject as MediaStream;
            if (stream) {
                const track = stream.getAudioTracks()[0];
                if (track) {
                    track.enabled = !track.enabled;
                    setIsMicOn(track.enabled);
                }
            }
        }
    };

    const handleToggleCamera = () => {
        vibrate();
        if (broadcasterRef.current) {
            const result = broadcasterRef.current.toggleCamera();
            setIsCameraOn(result);
        } else {
            const stream = videoRef.current?.srcObject as MediaStream;
            if (stream) {
                const track = stream.getVideoTracks()[0];
                if (track) {
                    track.enabled = !track.enabled;
                    setIsCameraOn(track.enabled);
                }
            }
        }
    };

    const handleSwitchCamera = async () => {
        vibrate();
        if (broadcasterRef.current) {
            await broadcasterRef.current.switchCamera();
            setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
        } else {
            setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
        }
    };

    const handleToggleTorch = async () => {
        vibrate();
        if (broadcasterRef.current) {
            const result = await broadcasterRef.current.toggleTorch();
            setIsTorchOn(result);
        } else {
            const stream = videoRef.current?.srcObject as MediaStream;
            if (stream) {
                const track = stream.getVideoTracks()[0];
                try {
                    const settings = track.getSettings() as any;
                    await track.applyConstraints({ advanced: [{ torch: !settings.torch } as any] });
                    setIsTorchOn(!settings.torch);
                } catch {
                    toast.error('Torch not available on this device');
                }
            }
        }
    };

    // =========================
    // SCORE CONTROL FUNCTIONS
    // =========================
    const adjustScore = (team: 'home' | 'away', points: number) => {
        vibrate();
        if (team === 'home') {
            setLocalHomeScore(prev => Math.max(0, prev + points));
        } else {
            setLocalAwayScore(prev => Math.max(0, prev + points));
        }
    };

    const changePeriod = (delta: number) => {
        vibrate();
        setLocalPeriod(prev => {
            const newP = Math.max(1, Math.min(prev + delta, 8));
            setLocalClockSeconds(defaultClockForPeriod(newP));
            setClockRunning(false);
            return newP;
        });
    };

    const handleSaveAndPush = async () => {
        vibrate();
        try {
            await updateDoc(doc(db, 'basketball_games', gameId), {
                homeScore: localHomeScore,
                awayScore: localAwayScore,
                period: localPeriod,
                clock: formatSecondsToMMSS(localClockSeconds),
                clockRunning: clockRunning,
                status: localPeriod > 0 ? 'live' : game?.status || 'scheduled',
                updatedAt: serverTimestamp(),
            });
            toast.success('Score updated & pushed!', { icon: '🏀', duration: 1500 });
        } catch (error) {
            console.error('Error saving score:', error);
            toast.error('Failed to push score update');
        }
    };

    const applyManualClock = () => {
        const secs = parseClockToSeconds(manualClockStr);
        setLocalClockSeconds(secs);
        setShowManualClock(false);
    };

    // ── Recording options ──
    const handleDownloadRecording = () => {
        if (recordingBlobRef.current) {
            const recorder = new StreamRecorder();
            recorder.downloadRecording(recordingBlobRef.current, gameId);
            toast.success('Recording downloaded!');
        }
        setShowRecordingOptions(false);
    };

    const handleUploadRecording = async () => {
        if (recordingBlobRef.current && broadcasterRef.current?.getStreamId()) {
            const streamId = broadcasterRef.current.getStreamId()!;
            try {
                const recorder = new StreamRecorder();
                toast.loading('Uploading recording...', { id: 'upload' });
                await recorder.uploadRecording(recordingBlobRef.current, streamId, gameId);
                toast.success('Recording saved to server!', { id: 'upload' });
            } catch {
                toast.error('Failed to upload recording', { id: 'upload' });
            }
        }
        setShowRecordingOptions(false);
    };

    // ── Cleanup on unmount ──
    useEffect(() => {
        return () => {
            if (broadcasterRef.current) {
                broadcasterRef.current.endStream().catch(console.error);
                broadcasterRef.current.destroy();
            }
            if (durationRef.current) clearInterval(durationRef.current);
            if (holdTimerRef.current) clearInterval(holdTimerRef.current);
            if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
        };
    }, []);

    // ── Loading ──
    if (loading) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-[100]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-neutral-400 font-mono text-sm">Loading Stream...</span>
                </div>
            </div>
        );
    }

    if (!game) return null;

    // ── HTTPS Check ──
    if (!isHttps) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[100] p-8 text-center">
                <div className="text-6xl mb-6">🔒</div>
                <h2 className="text-2xl font-bold text-white mb-4">HTTPS Required</h2>
                <p className="text-neutral-400 max-w-md mb-6">
                    Camera access requires a secure (HTTPS) connection. You&apos;re currently on HTTP.
                    Please access this page via HTTPS or use localhost for development.
                </p>
                <button
                    onClick={() => router.back()}
                    className="px-6 py-3 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black z-[100] overflow-hidden select-none">
            <Toaster position="top-center" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333' } }} />

            {/* ── CSS for floating reactions ── */}
            <style jsx global>{`
                @keyframes floatUp {
                    0% { opacity: 1; transform: translateY(0) scale(1); }
                    50% { opacity: 0.8; transform: translateY(-120px) scale(1.3); }
                    100% { opacity: 0; transform: translateY(-250px) scale(0.8); }
                }
                .animate-float-up {
                    animation: floatUp 2s ease-out forwards;
                }
            `}</style>

            {/* ── CAMERA PREVIEW (Full Bleed) ── */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Dark overlay when camera is off */}
            {!isCameraOn && (
                <div className="absolute inset-0 bg-black flex items-center justify-center">
                    <VideoOff className="w-16 h-16 text-neutral-600" />
                </div>
            )}

            {/* ── COUNTDOWN OVERLAY ── */}
            {countdown !== null && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[200]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-9xl font-black text-white animate-pulse tabular-nums">
                            {countdown}
                        </div>
                        <div className="text-xl font-bold text-red-500 uppercase tracking-widest">
                            Going Live...
                        </div>
                    </div>
                </div>
            )}

            {/* ── TOP BAR (Floating Overlay) ── */}
            <div className="absolute top-0 left-0 right-0 z-[150] bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 pb-12">
                <div className="flex items-center justify-between">
                    {/* Back button */}
                    <button
                        onClick={() => {
                            if (isStreaming) {
                                toast.error('End the stream before leaving');
                                return;
                            }
                            router.push(`/admin/basketball/games/${gameId}/live`);
                        }}
                        className="p-2.5 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>

                    {/* Game info + Live badge */}
                    <div className="flex items-center gap-3">
                        {isStreaming && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-full animate-pulse">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                <span className="text-white text-xs font-bold uppercase tracking-wider">LIVE</span>
                                <span className="text-white/80 text-xs font-mono">— {viewerCount} watching</span>
                            </div>
                        )}
                        {isStreaming && (
                            <div className="px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full">
                                <span className="text-white text-xs font-mono">{formatDuration(streamDuration)}</span>
                            </div>
                        )}
                    </div>

                    {/* Settings */}
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2.5 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
                    >
                        <Settings className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Game matchup */}
                <div className="text-center mt-3">
                    <span className="text-white/60 text-xs font-mono uppercase tracking-widest">
                        {awayTeam?.abbreviation || 'AWAY'} @ {homeTeam?.abbreviation || 'HOME'}
                    </span>
                </div>
            </div>

            {/* ── FLOATING REACTIONS ── */}
            {floatingReactions.map(r => (
                <FloatingReaction key={r.id} emoji={r.emoji} id={r.id} />
            ))}

            {/* ── RIGHT SIDE: COMMENTS PANEL ── */}
            {isStreaming && comments.length > 0 && (
                <div className="absolute right-0 top-1/3 bottom-32 w-64 z-[140] overflow-hidden pointer-events-none">
                    <div className="flex flex-col-reverse gap-2 p-3 h-full overflow-y-auto">
                        {comments.slice(0, 20).map((c, i) => (
                            <div
                                key={c.id || i}
                                className="bg-black/40 backdrop-blur-sm rounded-xl px-3 py-2 text-xs animate-in slide-in-from-right duration-300"
                            >
                                <span className="font-bold text-orange-400">{c.guestName}</span>
                                <span className="text-white/80 ml-1.5">{c.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* =========================== */}
            {/* ── SCORE CONTROL DRAWER ──  */}
            {/* =========================== */}
            {isStreaming && (
                <div
                    className={`absolute left-0 right-0 z-[160] transition-all duration-300 ease-out ${scoreDrawerOpen
                        ? 'bottom-[140px]'
                        : 'bottom-[140px]'
                        }`}
                >
                    {/* Collapsed summary bar */}
                    <button
                        onClick={() => { setScoreDrawerOpen(!scoreDrawerOpen); vibrate(); }}
                        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-black/70 backdrop-blur-md border-t border-neutral-700/50"
                    >
                        <span className="text-white font-bold text-xs tracking-wider">
                            {awayTeam?.abbreviation || 'AWAY'} {localAwayScore} – {localHomeScore} {homeTeam?.abbreviation || 'HOME'}
                        </span>
                        <span className="text-neutral-500 text-xs">|</span>
                        <span className="text-neutral-400 text-xs font-mono">
                            {periodLabel(localPeriod)} {formatSecondsToMMSS(localClockSeconds)}
                        </span>
                        <span className="text-neutral-500 text-xs">|</span>
                        <span className="text-orange-400 text-xs font-bold flex items-center gap-1">
                            {scoreDrawerOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                            Score
                        </span>
                    </button>

                    {/* Expanded drawer */}
                    {scoreDrawerOpen && (
                        <div className="bg-black/85 backdrop-blur-lg border-t border-neutral-700/40 p-4 animate-in slide-in-from-bottom duration-200">
                            {/* Drag handle */}
                            <div className="flex justify-center mb-3">
                                <div className="w-10 h-1 bg-neutral-600 rounded-full"></div>
                            </div>

                            {/* Score panels */}
                            <div className="flex items-stretch gap-3">
                                {/* Away team */}
                                <div className="flex-1 flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        {awayTeam?.logo && <img src={awayTeam.logo} alt="" className="w-6 h-6 object-contain" />}
                                        <span className="text-white font-bold text-xs">{awayTeam?.abbreviation || 'AWAY'}</span>
                                    </div>
                                    <div className="text-white font-black text-4xl tabular-nums">{localAwayScore}</div>
                                    <div className="flex gap-1.5">
                                        {[1, 2, 3].map(pts => (
                                            <button
                                                key={pts}
                                                onClick={() => adjustScore('away', pts)}
                                                className="w-10 h-10 rounded-xl bg-neutral-700/60 hover:bg-neutral-600 text-white font-bold text-sm transition-all active:scale-90"
                                            >
                                                +{pts}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => adjustScore('away', -1)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 text-neutral-400 text-xs transition-all active:scale-90"
                                    >
                                        <Minus className="w-3 h-3" /> 1
                                    </button>
                                </div>

                                {/* Center column — period + clock */}
                                <div className="flex flex-col items-center justify-center gap-2 px-2 min-w-[80px]">
                                    {/* Period */}
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => changePeriod(-1)} className="p-1 rounded-lg hover:bg-neutral-700 text-neutral-400 transition-all active:scale-90">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-orange-400 font-black text-sm min-w-[30px] text-center">
                                            {periodLabel(localPeriod)}
                                        </span>
                                        <button onClick={() => changePeriod(1)} className="p-1 rounded-lg hover:bg-neutral-700 text-neutral-400 transition-all active:scale-90">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Clock */}
                                    <button
                                        onClick={() => { setManualClockStr(formatSecondsToMMSS(localClockSeconds)); setShowManualClock(!showManualClock); }}
                                        className="text-white font-mono text-lg font-bold tabular-nums"
                                    >
                                        {formatSecondsToMMSS(localClockSeconds)}
                                    </button>

                                    {/* Manual clock input */}
                                    {showManualClock && (
                                        <div className="flex gap-1">
                                            <input
                                                value={manualClockStr}
                                                onChange={e => setManualClockStr(e.target.value)}
                                                placeholder="MM:SS"
                                                className="w-16 px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-white text-xs font-mono text-center"
                                            />
                                            <button onClick={applyManualClock} className="px-2 py-1 bg-orange-600 rounded text-white text-xs font-bold">
                                                Set
                                            </button>
                                        </div>
                                    )}

                                    {/* Play/Pause clock */}
                                    <button
                                        onClick={() => { vibrate(); setClockRunning(prev => !prev); }}
                                        className={`p-2 rounded-xl transition-all active:scale-90 ${clockRunning ? 'bg-red-600' : 'bg-green-600'}`}
                                    >
                                        {clockRunning ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                                    </button>
                                </div>

                                {/* Home team */}
                                <div className="flex-1 flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-bold text-xs">{homeTeam?.abbreviation || 'HOME'}</span>
                                        {homeTeam?.logo && <img src={homeTeam.logo} alt="" className="w-6 h-6 object-contain" />}
                                    </div>
                                    <div className="text-white font-black text-4xl tabular-nums">{localHomeScore}</div>
                                    <div className="flex gap-1.5">
                                        {[1, 2, 3].map(pts => (
                                            <button
                                                key={pts}
                                                onClick={() => adjustScore('home', pts)}
                                                className="w-10 h-10 rounded-xl bg-neutral-700/60 hover:bg-neutral-600 text-white font-bold text-sm transition-all active:scale-90"
                                            >
                                                +{pts}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => adjustScore('home', -1)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 text-neutral-400 text-xs transition-all active:scale-90"
                                    >
                                        <Minus className="w-3 h-3" /> 1
                                    </button>
                                </div>
                            </div>

                            {/* Save & Push button */}
                            <button
                                onClick={handleSaveAndPush}
                                className="w-full mt-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-sm uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-orange-600/30"
                            >
                                🏀 Save & Push
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── BOTTOM CONTROLS BAR ── */}
            <div className="absolute bottom-0 left-0 right-0 z-[150] bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                {/* Media controls row */}
                <div className="flex items-center justify-center gap-4 mb-4">
                    {/* Mic toggle */}
                    <button
                        onClick={handleToggleMic}
                        className={`p-3.5 rounded-full transition-all active:scale-90 ${isMicOn ? 'bg-white/20 backdrop-blur-sm' : 'bg-red-600'}`}
                    >
                        {isMicOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
                    </button>

                    {/* Camera toggle */}
                    <button
                        onClick={handleToggleCamera}
                        className={`p-3.5 rounded-full transition-all active:scale-90 ${isCameraOn ? 'bg-white/20 backdrop-blur-sm' : 'bg-red-600'}`}
                    >
                        {isCameraOn ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />}
                    </button>

                    {/* Switch camera */}
                    <button
                        onClick={handleSwitchCamera}
                        className="p-3.5 rounded-full bg-white/20 backdrop-blur-sm transition-all active:scale-90"
                    >
                        <SwitchCamera className="w-5 h-5 text-white" />
                    </button>

                    {/* Torch */}
                    <button
                        onClick={handleToggleTorch}
                        className={`p-3.5 rounded-full transition-all active:scale-90 ${isTorchOn ? 'bg-yellow-500' : 'bg-white/20 backdrop-blur-sm'}`}
                    >
                        {isTorchOn ? <Flashlight className="w-5 h-5 text-white" /> : <FlashlightOff className="w-5 h-5 text-white" />}
                    </button>
                </div>

                {/* Main action button */}
                {!isStreaming ? (
                    <button
                        onClick={handleStartStream}
                        disabled={isStarting}
                        className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-lg uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-red-600/30"
                    >
                        <Circle className="w-6 h-6 fill-white" />
                        {isStarting ? 'Starting...' : 'Start Stream'}
                    </button>
                ) : (
                    <button
                        onTouchStart={startHoldEnd}
                        onTouchEnd={cancelHoldEnd}
                        onMouseDown={startHoldEnd}
                        onMouseUp={cancelHoldEnd}
                        onMouseLeave={cancelHoldEnd}
                        className="w-full py-4 rounded-2xl bg-neutral-800 border-2 border-red-600 text-white font-bold text-sm uppercase tracking-wider transition-all relative overflow-hidden"
                    >
                        {/* Hold progress bar */}
                        <div
                            className="absolute inset-0 bg-red-600/40 transition-all duration-100"
                            style={{ width: `${holdProgress}%` }}
                        />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            <Square className="w-5 h-5 fill-red-500 text-red-500" />
                            {holdingEnd ? `Hold to end... ${Math.round(holdProgress)}%` : 'Hold to End Stream'}
                        </span>
                    </button>
                )}

                {/* Recording indicator */}
                {isRecording && (
                    <div className="flex items-center justify-center gap-2 mt-3 text-xs text-neutral-400">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="font-mono">Recording {formatDuration(recordingDuration)}</span>
                    </div>
                )}
            </div>

            {/* ── SETTINGS DRAWER ── */}
            {showSettings && (
                <div className="fixed inset-0 z-[200]" onClick={() => setShowSettings(false)}>
                    <div className="absolute inset-0 bg-black/60" />
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white">Stream Settings</h3>
                            <button onClick={() => setShowSettings(false)} className="p-2 rounded-full hover:bg-neutral-800">
                                <X className="w-5 h-5 text-neutral-400" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* Resolution */}
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Resolution</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['1280x720', '1920x1080'] as const).map(res => (
                                        <button
                                            key={res}
                                            onClick={() => { setResolution(res); vibrate(); }}
                                            disabled={isStreaming}
                                            className={`py-3 rounded-xl font-bold text-sm transition-all ${resolution === res ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'} disabled:opacity-50`}
                                        >
                                            {res === '1280x720' ? '720p HD' : '1080p FHD'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Frame rate */}
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Frame Rate</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {([30, 60] as const).map(fps => (
                                        <button
                                            key={fps}
                                            onClick={() => { setFrameRate(fps); vibrate(); }}
                                            disabled={isStreaming}
                                            className={`py-3 rounded-xl font-bold text-sm transition-all ${frameRate === fps ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'} disabled:opacity-50`}
                                        >
                                            {fps} FPS
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Camera */}
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Default Camera</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => { setFacingMode('environment'); vibrate(); }}
                                        className={`py-3 rounded-xl font-bold text-sm transition-all ${facingMode === 'environment' ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}`}
                                    >
                                        Rear Camera
                                    </button>
                                    <button
                                        onClick={() => { setFacingMode('user'); vibrate(); }}
                                        className={`py-3 rounded-xl font-bold text-sm transition-all ${facingMode === 'user' ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}`}
                                    >
                                        Front Camera
                                    </button>
                                </div>
                            </div>

                            {/* Stream info */}
                            {isStreaming && (
                                <div className="bg-neutral-800 rounded-xl p-4 space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-neutral-500">Resolution</span>
                                        <span className="text-white font-mono">{resolution}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-neutral-500">Frame Rate</span>
                                        <span className="text-white font-mono">{frameRate} fps</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-neutral-500">Viewers</span>
                                        <span className="text-white font-mono">{viewerCount}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-neutral-500">Duration</span>
                                        <span className="text-white font-mono">{formatDuration(streamDuration)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-neutral-500">Transport</span>
                                        <span className="text-green-400 font-mono">LiveKit Cloud</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Close handle */}
                        <div className="flex justify-center mt-6">
                            <div className="w-12 h-1 bg-neutral-700 rounded-full"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── RECORDING OPTIONS MODAL ── */}
            {showRecordingOptions && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[250] p-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-sm w-full text-center">
                        <div className="text-4xl mb-4">🎬</div>
                        <h3 className="text-xl font-bold text-white mb-2">Stream Recorded</h3>
                        <p className="text-neutral-400 text-sm mb-6">
                            Your stream has been recorded. What would you like to do?
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={handleDownloadRecording}
                                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm uppercase transition-all active:scale-95"
                            >
                                📥 Download to Device
                            </button>
                            <button
                                onClick={handleUploadRecording}
                                className="w-full py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white font-bold text-sm uppercase hover:bg-neutral-700 transition-all active:scale-95"
                            >
                                ☁️ Save to Server
                            </button>
                            <button
                                onClick={() => setShowRecordingOptions(false)}
                                className="w-full py-3 rounded-xl bg-neutral-800 text-neutral-400 font-bold text-sm uppercase hover:bg-neutral-700 transition-all active:scale-95"
                            >
                                Skip
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
