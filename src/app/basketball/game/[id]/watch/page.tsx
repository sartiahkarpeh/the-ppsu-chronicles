'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/config';
import {
    doc,
    onSnapshot,
    collection,
    query,
    orderBy,
    limit as firestoreLimit,
    Timestamp,
} from 'firebase/firestore';
import type { BasketballGame, BasketballTeam } from '@/types/basketball';
import type { StreamComment, StreamReaction } from '@/types/streamTypes';
import { STREAM_REACTIONS } from '@/types/streamTypes';
import { StreamViewer as StreamViewerClient, sendStreamComment, sendStreamReaction, checkGameStreamStatus } from '@/lib/stream/streamManager';
import {
    ArrowLeft,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    Users,
    Share2,
    Send,
    Eye,
} from 'lucide-react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

// ─── HELPERS ────────────────────────────────────────────────────────────
function vibrate() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
    }
}

// ─── FLOATING REACTION ──────────────────────────────────────────────────
function FloatingReaction({ emoji, id }: { emoji: string; id: number }) {
    const left = 5 + Math.random() * 20; // Float on right side
    return (
        <div
            key={id}
            className="fixed pointer-events-none text-3xl z-[200]"
            style={{
                right: `${left}%`,
                bottom: '25%',
                animation: 'floatUpViewer 2.5s ease-out forwards',
            }}
        >
            {emoji}
        </div>
    );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────
export default function WatchStreamPage() {
    const { id: gameId } = useParams() as { id: string };
    const router = useRouter();

    // Game data
    const [game, setGame] = useState<BasketballGame | null>(null);
    const [homeTeam, setHomeTeam] = useState<BasketballTeam | null>(null);
    const [awayTeam, setAwayTeam] = useState<BasketballTeam | null>(null);
    const [loading, setLoading] = useState(true);

    // Stream state
    const [streamStatus, setStreamStatus] = useState<'waiting' | 'live' | 'ended' | 'no-stream'>('waiting');
    const [viewerCount, setViewerCount] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [showUnmutePrompt, setShowUnmutePrompt] = useState(true);

    // Comments & reactions
    const [comments, setComments] = useState<StreamComment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [floatingReactions, setFloatingReactions] = useState<{ emoji: string; id: number }[]>([]);
    const reactionIdRef = useRef(0);

    // Rate limiting
    const [lastCommentTime, setLastCommentTime] = useState(0);
    const [reactionCount, setReactionCount] = useState(0);
    const [reactionWindowStart, setReactionWindowStart] = useState(0);

    // Guest name
    const [guestName, setGuestName] = useState('');
    const [showNamePrompt, setShowNamePrompt] = useState(false);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const viewerRef = useRef<StreamViewerClient | null>(null);
    const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Score flash animation
    const [scoreFlash, setScoreFlash] = useState(false);
    const prevScoresRef = useRef<{ home: number; away: number } | null>(null);

    // ── Initialize guest ID and name ──
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let id = localStorage.getItem('stream_guest_id');
        if (!id) {
            id = `viewer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('stream_guest_id', id);
        }
        const name = localStorage.getItem('stream_guest_name') || '';
        setGuestName(name);
    }, []);

    // ── Subscribe to game data ──
    useEffect(() => {
        if (!gameId) return;
        const unsub = onSnapshot(doc(db, 'basketball_games', gameId), (snap) => {
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() } as BasketballGame;
                setGame(data);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [gameId]);

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

    // ── Score flash on update ──
    useEffect(() => {
        if (!game) return;
        const prev = prevScoresRef.current;
        if (prev && (prev.home !== game.homeScore || prev.away !== game.awayScore)) {
            setScoreFlash(true);
            setTimeout(() => setScoreFlash(false), 1200);
        }
        prevScoresRef.current = { home: game.homeScore, away: game.awayScore };
    }, [game?.homeScore, game?.awayScore]);

    // ── Connect to stream ──
    useEffect(() => {
        if (!gameId || loading) return;

        let viewer: StreamViewerClient | null = null;
        let mounted = true;

        const connectToStream = async () => {
            try {
                const status = await checkGameStreamStatus(gameId);
                if (!status.isLive) {
                    if (mounted) setStreamStatus('no-stream');
                    // Poll every 5 seconds
                    setTimeout(() => {
                        if (mounted) connectToStream();
                    }, 5000);
                    return;
                }

                if (mounted) setStreamStatus('waiting');

                viewer = new StreamViewerClient(gameId, {
                    onStream: (stream) => {
                        if (mounted && videoRef.current) {
                            videoRef.current.srcObject = stream;
                            setStreamStatus('live');
                            setShowUnmutePrompt(true);
                        }
                    },
                    onStreamEnd: () => {
                        if (mounted) setStreamStatus('ended');
                    },
                    onViewerCountChange: (count) => {
                        if (mounted) setViewerCount(count);
                    },
                    onReconnecting: () => {
                        if (mounted) setStreamStatus('waiting');
                    },
                });

                viewerRef.current = viewer;
                await viewer.joinStream();
            } catch (error) {
                console.error('[WatchStream] Error:', error);
                if (mounted) setStreamStatus('no-stream');
            }
        };

        connectToStream();

        return () => {
            mounted = false;
            if (viewer) {
                viewer.destroy();
            }
        };
    }, [gameId, loading]);

    // ── Subscribe to comments ──
    useEffect(() => {
        if (!viewerRef.current?.getStreamId()) return;
        const streamId = viewerRef.current.getStreamId()!;

        const commentsRef = collection(db, 'basketball_streams', streamId, 'comments');
        const q = query(commentsRef, orderBy('timestamp', 'desc'), firestoreLimit(50));

        const unsub = onSnapshot(q, (snap) => {
            const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as StreamComment));
            setComments(msgs);
        });

        return () => unsub();
    }, [streamStatus]);

    // ── Subscribe to reactions ──
    useEffect(() => {
        if (!viewerRef.current?.getStreamId()) return;
        const streamId = viewerRef.current.getStreamId()!;

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
                    }, 3000);
                }
            }
        });

        return () => unsub();
    }, [streamStatus]);

    // ── Tab visibility handler ──
    useEffect(() => {
        const handleVisibility = () => {
            if (!document.hidden && videoRef.current && streamStatus === 'live') {
                videoRef.current.play().catch(() => { });
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [streamStatus]);

    // ── Auto-hide controls ──
    const resetControlsTimer = useCallback(() => {
        setShowControls(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => {
            if (streamStatus === 'live') setShowControls(false);
        }, 4000);
    }, [streamStatus]);

    // ── Unmute ──
    const handleUnmute = () => {
        if (videoRef.current) {
            videoRef.current.muted = false;
            setIsMuted(false);
            setShowUnmutePrompt(false);
        }
    };

    const handleToggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    };

    // ── Fullscreen ──
    const handleToggleFullscreen = async () => {
        if (!containerRef.current) return;
        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch {
            // Fullscreen not supported
        }
    };

    // ── Send comment ──
    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !viewerRef.current?.getStreamId()) return;

        // Rate limit: 1 message per 3 seconds
        const now = Date.now();
        if (now - lastCommentTime < 3000) {
            toast.error('Wait a moment before sending another message');
            return;
        }

        // Check if name is set
        if (!guestName) {
            setShowNamePrompt(true);
            return;
        }

        try {
            await sendStreamComment(
                viewerRef.current.getStreamId()!,
                gameId,
                commentText.trim(),
                guestName
            );
            setCommentText('');
            setLastCommentTime(now);
        } catch {
            toast.error('Failed to send comment');
        }
    };

    // ── Send reaction ──
    const handleSendReaction = async (emoji: string) => {
        if (!viewerRef.current?.getStreamId()) return;
        vibrate();

        // Rate limit: 5 reactions per 5 seconds
        const now = Date.now();
        if (now - reactionWindowStart > 5000) {
            setReactionCount(0);
            setReactionWindowStart(now);
        }
        if (reactionCount >= 5) {
            return;
        }

        try {
            await sendStreamReaction(viewerRef.current.getStreamId()!, gameId, emoji);
            setReactionCount(prev => prev + 1);
        } catch {
            // Silently fail reactions
        }
    };

    // ── Share ──
    const handleShare = async () => {
        const url = `${window.location.origin}/basketball/game/${gameId}/watch`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Watch Live: ${awayTeam?.abbreviation || 'Away'} vs ${homeTeam?.abbreviation || 'Home'}`,
                    url,
                });
            } catch {
                // User cancelled
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                toast.success('Link copied to clipboard!');
            } catch {
                // Clipboard API not available (non-HTTPS)
                toast('Copy this link: ' + url, { duration: 5000 });
            }
        }
    };

    // ── Save guest name ──
    const handleSaveName = (e: React.FormEvent) => {
        e.preventDefault();
        if (guestName.trim()) {
            localStorage.setItem('stream_guest_name', guestName.trim());
            setShowNamePrompt(false);
        }
    };

    // ── Cleanup ──
    useEffect(() => {
        return () => {
            if (viewerRef.current) viewerRef.current.destroy();
            if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        };
    }, []);

    // ── Loading ──
    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-neutral-400 font-mono text-sm">Loading...</span>
                </div>
            </div>
        );
    }

    const isLive = game?.status === 'live' || game?.status === 'ht';

    return (
        <div ref={containerRef} className="min-h-screen bg-black text-white">
            <Toaster position="top-center" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333' } }} />

            {/* CSS */}
            <style jsx global>{`
                @keyframes floatUpViewer {
                    0% { opacity: 1; transform: translateY(0) scale(1); }
                    50% { opacity: 0.8; transform: translateY(-100px) scale(1.2); }
                    100% { opacity: 0; transform: translateY(-200px) scale(0.7); }
                }
                @keyframes pulseGlow {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
                }
                @keyframes scoreFlash {
                    0% { background-color: rgba(249, 115, 22, 0.3); }
                    50% { background-color: rgba(249, 115, 22, 0.15); }
                    100% { background-color: transparent; }
                }
                .score-flash {
                    animation: scoreFlash 1.2s ease-out;
                }
            `}</style>

            {/* ── VIDEO CONTAINER ── */}
            <div
                className="relative w-full aspect-video bg-neutral-950 max-h-[60vh] md:max-h-[70vh]"
                onClick={resetControlsTimer}
            >
                {/* Video element */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className="w-full h-full object-contain bg-black"
                />

                {/* ── WAITING ROOM ── */}
                {(streamStatus === 'waiting' || streamStatus === 'no-stream') && (
                    <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-6 z-10">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center" style={{ animation: 'pulseGlow 2s infinite' }}>
                                <div className="w-12 h-12 rounded-full bg-red-500/30 flex items-center justify-center">
                                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-2">
                                {streamStatus === 'no-stream' ? 'No Active Stream' : 'Stream Starting Soon...'}
                            </h3>
                            <p className="text-neutral-500 text-sm">
                                {streamStatus === 'no-stream'
                                    ? 'Check back later for a live stream of this game'
                                    : 'Connecting to the live broadcast...'
                                }
                            </p>
                        </div>
                        {/* Matchup info */}
                        <div className="flex items-center gap-6 mt-4">
                            <div className="flex flex-col items-center gap-2">
                                {awayTeam?.logo && <img src={awayTeam.logo} alt="" className="w-12 h-12 object-contain" />}
                                <span className="font-bold text-sm">{awayTeam?.abbreviation}</span>
                            </div>
                            <span className="text-neutral-600 font-bold text-xl">VS</span>
                            <div className="flex flex-col items-center gap-2">
                                {homeTeam?.logo && <img src={homeTeam.logo} alt="" className="w-12 h-12 object-contain" />}
                                <span className="font-bold text-sm">{homeTeam?.abbreviation}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STREAM ENDED ── */}
                {streamStatus === 'ended' && (
                    <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-4 z-10">
                        <div className="text-5xl">📺</div>
                        <h3 className="text-xl font-bold">Stream Ended</h3>
                        <p className="text-neutral-500 text-sm">The live broadcast has ended</p>
                        <Link
                            href={`/basketball/game/${gameId}`}
                            className="mt-4 px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-xl text-white font-bold text-sm uppercase tracking-wider transition-colors"
                        >
                            Back to Game
                        </Link>
                    </div>
                )}

                {/* ── UNMUTE PROMPT ── */}
                {streamStatus === 'live' && showUnmutePrompt && isMuted && (
                    <button
                        onClick={handleUnmute}
                        className="absolute inset-0 flex items-center justify-center z-20 bg-black/30 backdrop-blur-[2px]"
                    >
                        <div className="flex flex-col items-center gap-3 bg-black/70 px-8 py-6 rounded-2xl border border-neutral-700">
                            <VolumeX className="w-10 h-10 text-white" />
                            <span className="text-white font-bold">Tap to Unmute</span>
                        </div>
                    </button>
                )}

                {/* ── VIDEO CONTROLS OVERLAY ── */}
                {streamStatus === 'live' && showControls && !showUnmutePrompt && (
                    <>
                        {/* Top overlay */}
                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 z-10">
                            <div className="flex items-center justify-between">
                                <button onClick={() => router.back()} className="p-2 rounded-full bg-black/50">
                                    <ArrowLeft className="w-5 h-5 text-white" />
                                </button>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/80 rounded-full">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                    <span className="text-white text-xs font-bold">LIVE</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 rounded-full">
                                    <Eye className="w-3.5 h-3.5 text-white/60" />
                                    <span className="text-white text-xs font-mono">{viewerCount}</span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 z-10">
                            <div className="flex items-center justify-between">
                                <button onClick={handleToggleMute} className="p-2.5 rounded-full bg-black/50">
                                    {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                                </button>
                                <div className="flex items-center gap-3">
                                    <button onClick={handleShare} className="p-2.5 rounded-full bg-black/50">
                                        <Share2 className="w-5 h-5 text-white" />
                                    </button>
                                    <button onClick={handleToggleFullscreen} className="p-2.5 rounded-full bg-black/50">
                                        {isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Floating reactions */}
                {floatingReactions.map(r => (
                    <FloatingReaction key={r.id} emoji={r.emoji} id={r.id} />
                ))}
            </div>

            {/* ── LIVE SCORE BAR ── */}
            {game && (
                <div className={`bg-neutral-900 border-b border-neutral-800 px-4 py-3 transition-colors ${scoreFlash ? 'score-flash' : ''}`}>
                    <div className="flex items-center justify-between max-w-3xl mx-auto">
                        <div className="flex items-center gap-3">
                            {awayTeam?.logo && <img src={awayTeam.logo} alt="" className="w-8 h-8 object-contain" />}
                            <span className="font-bold text-sm">{awayTeam?.abbreviation || 'AWAY'}</span>
                        </div>

                        <div className="flex items-center gap-4 text-center">
                            <span className="font-mono font-black text-2xl tabular-nums">{game.awayScore}</span>
                            <div className="flex flex-col items-center">
                                {isLive && (
                                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-0.5">
                                        {game.status === 'ht' ? 'HALF' : `Q${game.period}`}
                                    </span>
                                )}
                                <span className="text-neutral-600 font-black text-lg">–</span>
                                {isLive && game.clock && (
                                    <span className="text-[10px] font-mono text-neutral-500">{game.clock}</span>
                                )}
                            </div>
                            <span className="font-mono font-black text-2xl tabular-nums">{game.homeScore}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="font-bold text-sm">{homeTeam?.abbreviation || 'HOME'}</span>
                            {homeTeam?.logo && <img src={homeTeam.logo} alt="" className="w-8 h-8 object-contain" />}
                        </div>
                    </div>
                </div>
            )}

            {/* ── REACTIONS BAR ── */}
            {streamStatus === 'live' && (
                <div className="bg-neutral-900/50 border-b border-neutral-800 px-4 py-3">
                    <div className="flex items-center justify-center gap-3 max-w-3xl mx-auto">
                        {STREAM_REACTIONS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => handleSendReaction(emoji)}
                                className="text-2xl p-2 rounded-full hover:bg-neutral-800 active:scale-125 transition-all"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── COMMENTS SECTION ── */}
            {streamStatus === 'live' && (
                <div className="flex flex-col max-w-3xl mx-auto">
                    {/* Comments list */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 max-h-[200px]">
                        {comments.length === 0 ? (
                            <div className="text-center text-neutral-600 text-xs py-6">
                                No comments yet. Be the first to say something!
                            </div>
                        ) : (
                            comments.map((c, i) => (
                                <div key={c.id || i} className="flex gap-2 text-sm">
                                    <span className="font-bold text-orange-400 shrink-0">{c.guestName}</span>
                                    <span className="text-neutral-300">{c.text}</span>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Comment input */}
                    <form onSubmit={handleSendComment} className="px-4 py-3 border-t border-neutral-800">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                placeholder="Say something..."
                                maxLength={200}
                                className="flex-1 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-full text-sm text-white placeholder-neutral-500 outline-none focus:border-orange-500 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={!commentText.trim()}
                                className="p-2.5 bg-orange-600 rounded-full text-white hover:bg-orange-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── NAME PROMPT MODAL ── */}
            {showNamePrompt && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-6">
                    <form onSubmit={handleSaveName} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-white mb-2">What&apos;s your name?</h3>
                        <p className="text-neutral-500 text-sm mb-4">Choose a display name for your comments</p>
                        <input
                            type="text"
                            value={guestName}
                            onChange={e => setGuestName(e.target.value)}
                            placeholder="Enter your name..."
                            maxLength={30}
                            autoFocus
                            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 outline-none focus:border-orange-500 mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowNamePrompt(false)}
                                className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-400 font-bold text-sm uppercase hover:bg-neutral-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!guestName.trim()}
                                className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold text-sm uppercase hover:bg-orange-700 disabled:opacity-50 transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
