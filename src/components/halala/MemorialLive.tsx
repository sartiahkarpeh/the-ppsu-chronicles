'use client';

/**
 * Live memorial service section on /halala.
 *
 * Subscribes to the stream status document; when the admin goes live it joins
 * the LiveKit room as a subscribe-only viewer and shows the feed alongside a
 * chat of condolences and floating reactions.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    collection,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query,
    where,
    Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { MemorialViewer } from '@/lib/stream/memorialStream';
import {
    MEMORIAL_MESSAGES,
    MEMORIAL_REACTIONS,
    MEMORIAL_REACTION_EMOJIS as REACTIONS,
    MEMORIAL_STREAM_COLLECTION,
    MEMORIAL_STREAM_DOC_ID,
    MAX_MESSAGE_LENGTH,
    type MemorialStreamStatus,
} from '@/types/memorialStream';
import {
    Volume2,
    VolumeX,
    Maximize,
    PictureInPicture,
    Users,
    Send,
    Loader2,
    Radio,
} from 'lucide-react';

const GUEST_ID_KEY = 'halala_stream_guest_id';
const GUEST_NAME_KEY = 'halala_stream_guest_name';

type ChatMessage = {
    id: string;
    guestName: string;
    country: string;
    text: string;
    createdAt: Date | null;
};

type FloatingReaction = { id: number; emoji: string; left: number };

function getGuestId(): string {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
        id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
}

function toDate(value: unknown): Date | null {
    if (value instanceof Timestamp) return value.toDate();
    return null;
}

function formatTime(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MemorialLive() {
    const [status, setStatus] = useState<MemorialStreamStatus>('offline');
    const [title, setTitle] = useState('');
    const [viewerCount, setViewerCount] = useState(0);

    const [connecting, setConnecting] = useState(false);
    const [playbackError, setPlaybackError] = useState('');
    const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
    const [muted, setMuted] = useState(true);
    const [pipSupported, setPipSupported] = useState(false);
    const [pipError, setPipError] = useState('');

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [floating, setFloating] = useState<FloatingReaction[]>([]);

    const [guestName, setGuestName] = useState('');
    const [country, setCountry] = useState('');
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [chatError, setChatError] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const viewerRef = useRef<MemorialViewer | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const seenReactions = useRef<Set<string>>(new Set());
    const mountedAt = useRef<number>(Date.now());
    const guestId = useMemo(() => getGuestId(), []);

    useEffect(() => {
        const stored = localStorage.getItem(GUEST_NAME_KEY);
        if (stored) setGuestName(stored);
    }, []);

    // iPhone Safari doesn't set pictureInPictureEnabled but supports PiP on the
    // video element through its own webkit presentation-mode API.
    useEffect(() => {
        const video = document.createElement('video') as HTMLVideoElement & {
            webkitSupportsPresentationMode?: (mode: string) => boolean;
        };
        setPipSupported(
            document.pictureInPictureEnabled ||
                typeof video.webkitSupportsPresentationMode === 'function'
        );
    }, []);

    // Coming back to the tab, some browsers leave the element paused.
    useEffect(() => {
        function resume() {
            if (document.visibilityState === 'visible') {
                videoRef.current?.play().catch(() => undefined);
            }
        }
        document.addEventListener('visibilitychange', resume);
        return () => document.removeEventListener('visibilitychange', resume);
    }, []);

    // ── Stream status (realtime) ──────────────────────────────────────────
    useEffect(() => {
        const ref = doc(db, MEMORIAL_STREAM_COLLECTION, MEMORIAL_STREAM_DOC_ID);
        const unsubscribe = onSnapshot(
            ref,
            (snap) => {
                const data = snap.data();
                setStatus((data?.status as MemorialStreamStatus) || 'offline');
                setTitle(data?.title || '');
                if (typeof data?.currentViewers === 'number') {
                    setViewerCount(data.currentViewers);
                }
            },
            (error) => {
                console.error('[MemorialLive] Status listener failed:', error);
            }
        );
        return unsubscribe;
    }, []);

    // ── Join / leave the LiveKit room as status changes ───────────────────
    useEffect(() => {
        if (status !== 'live') {
            viewerRef.current?.destroy();
            viewerRef.current = null;
            if (videoRef.current) videoRef.current.srcObject = null;
            setConnecting(false);
            return;
        }

        let cancelled = false;
        setConnecting(true);
        setPlaybackError('');

        const viewer = new MemorialViewer({
            onStream: (stream) => {
                if (cancelled || !videoRef.current) return;
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => {
                    // Autoplay with sound is blocked until the user interacts.
                    setNeedsTapToPlay(true);
                });
                setConnecting(false);
            },
            onStreamEnd: () => {
                if (!cancelled) setConnecting(false);
            },
            onReconnecting: () => {
                if (!cancelled) setConnecting(true);
            },
            onViewerCountChange: (count) => {
                if (!cancelled) setViewerCount((prev) => (prev > count ? prev : count));
            },
        });

        viewerRef.current = viewer;

        viewer.join().catch((error) => {
            if (cancelled) return;
            console.error('[MemorialLive] Failed to join:', error);
            setPlaybackError(error?.message || 'Could not connect to the service.');
            setConnecting(false);
        });

        return () => {
            cancelled = true;
            viewer.destroy();
            viewerRef.current = null;
        };
    }, [status]);

    // ── Chat (realtime) ───────────────────────────────────────────────────
    useEffect(() => {
        if (status !== 'live') return;

        const q = query(
            collection(db, MEMORIAL_MESSAGES),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(
            q,
            (snap) => {
                const next = snap.docs
                    .map((d) => {
                        const data = d.data();
                        return {
                            id: d.id,
                            guestName: data.guestName || 'Anonymous',
                            country: data.country || '',
                            text: data.text || '',
                            createdAt: toDate(data.createdAt),
                        };
                    })
                    .reverse();
                setMessages(next);
            },
            (error) => console.error('[MemorialLive] Chat listener failed:', error)
        );

        return unsubscribe;
    }, [status]);

    // ── Reactions (realtime, animated) ────────────────────────────────────
    useEffect(() => {
        if (status !== 'live') return;

        // Only animate reactions created after mount so arriving late doesn't
        // dump a burst of old hearts on screen.
        const since = Timestamp.fromMillis(mountedAt.current);
        const q = query(
            collection(db, MEMORIAL_REACTIONS),
            where('createdAt', '>=', since),
            orderBy('createdAt', 'desc'),
            limit(30)
        );

        const unsubscribe = onSnapshot(
            q,
            (snap) => {
                snap.docChanges().forEach((change) => {
                    if (change.type !== 'added') return;
                    if (seenReactions.current.has(change.doc.id)) return;
                    seenReactions.current.add(change.doc.id);

                    const emoji = change.doc.data().emoji as string;
                    const id = Date.now() + Math.random();
                    setFloating((prev) => [...prev, { id, emoji, left: 8 + Math.random() * 78 }]);
                    setTimeout(() => {
                        setFloating((prev) => prev.filter((r) => r.id !== id));
                    }, 3200);
                });
            },
            (error) => console.error('[MemorialLive] Reaction listener failed:', error)
        );

        return unsubscribe;
    }, [status]);

    // Keep the chat pinned to the newest message.
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [messages]);

    const post = useCallback(
        async (payload: Record<string, unknown>) => {
            const res = await fetch('/api/halala/stream/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guestId, ...payload }),
            });
            if (!res.ok) {
                const { error } = await res.json().catch(() => ({ error: '' }));
                throw new Error(error || 'Could not send.');
            }
        },
        [guestId]
    );

    async function sendMessage(event: React.FormEvent) {
        event.preventDefault();
        const trimmedName = guestName.trim();
        const trimmedText = text.trim();

        if (!trimmedName) return setChatError('Please enter your name.');
        if (!trimmedText) return setChatError('Please write a message.');

        setSending(true);
        setChatError('');

        try {
            await post({
                kind: 'message',
                guestName: trimmedName,
                country: country.trim(),
                text: trimmedText,
                website: '',
            });
            localStorage.setItem(GUEST_NAME_KEY, trimmedName);
            setText('');
        } catch (error) {
            setChatError(error instanceof Error ? error.message : 'Could not send.');
        } finally {
            setSending(false);
        }
    }

    async function sendReaction(emoji: string) {
        // Show it immediately; the listener skips our own echo by doc id.
        const id = Date.now() + Math.random();
        setFloating((prev) => [...prev, { id, emoji, left: 8 + Math.random() * 78 }]);
        setTimeout(() => setFloating((prev) => prev.filter((r) => r.id !== id)), 3200);

        try {
            await post({ kind: 'reaction', emoji });
        } catch {
            // A dropped reaction isn't worth interrupting anyone with.
        }
    }

    function unmute() {
        if (!videoRef.current) return;
        videoRef.current.muted = false;
        setMuted(false);
        setNeedsTapToPlay(false);
        videoRef.current.play().catch(() => setNeedsTapToPlay(true));
    }

    function toggleMute() {
        if (!videoRef.current) return;
        const next = !muted;
        videoRef.current.muted = next;
        setMuted(next);
        if (!next) videoRef.current.play().catch(() => undefined);
    }

    function goFullscreen() {
        videoRef.current?.requestFullscreen?.().catch(() => undefined);
    }

    /**
     * Picture-in-picture keeps the service playing in a floating window while
     * the viewer uses other tabs or apps. A web page can't survive the browser
     * being closed entirely, so this is as close to "keep watching after you
     * leave" as the platform allows.
     */
    async function togglePip() {
        const video = videoRef.current;
        if (!video) return;

        const webkitVideo = video as HTMLVideoElement & {
            webkitSetPresentationMode?: (mode: string) => void;
            webkitPresentationMode?: string;
        };

        try {
            if (typeof webkitVideo.webkitSetPresentationMode === 'function') {
                webkitVideo.webkitSetPresentationMode(
                    webkitVideo.webkitPresentationMode === 'picture-in-picture'
                        ? 'inline'
                        : 'picture-in-picture'
                );
            } else if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch {
            setPipError('Your browser blocked picture-in-picture.');
            setTimeout(() => setPipError(''), 4000);
        }
    }

    const isLive = status === 'live';

    return (
        <section id="live" className="relative z-10 mx-auto max-w-5xl px-6 py-20">
            <div className="mb-10 text-center">
                <div className="mb-5 flex items-center justify-center gap-3">
                    <span className="h-px w-10 bg-amber-200/30" />
                    <Radio className="h-5 w-5 text-amber-200/70" />
                    <span className="h-px w-10 bg-amber-200/30" />
                </div>
                <h2 className="font-display text-3xl font-medium tracking-wide text-white md:text-4xl">
                    The Memorial Service
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-neutral-400">
                    {isLive
                        ? 'The service is being streamed live. Wherever you are in the world, you are with us.'
                        : 'The service will be streamed live on this page. Please return at the appointed time to join us.'}
                </p>
            </div>

            {/* ── Player ────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
                <div className="relative aspect-video w-full bg-black">
                    <video
                        ref={videoRef}
                        playsInline
                        autoPlay
                        muted={muted}
                        className={`h-full w-full object-contain ${isLive ? '' : 'hidden'}`}
                    />

                    {/* Floating reactions */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        <AnimatePresence>
                            {floating.map((reaction) => (
                                <motion.div
                                    key={reaction.id}
                                    initial={{ opacity: 0, y: 20, scale: 0.6 }}
                                    animate={{ opacity: [0, 1, 1, 0], y: -220, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 3.2, ease: 'easeOut' }}
                                    className="absolute bottom-6 text-3xl"
                                    style={{ left: `${reaction.left}%` }}
                                >
                                    {reaction.emoji}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Offline / ended placeholder */}
                    {!isLive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-amber-200/20 bg-amber-200/5">
                                <span className="text-2xl">🕯️</span>
                            </div>
                            <p className="font-display text-lg tracking-wide text-amber-100/90">
                                {status === 'ended' ? 'The service has concluded' : 'Not yet live'}
                            </p>
                            <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-400">
                                {status === 'ended'
                                    ? 'Thank you to everyone who joined us from around the world.'
                                    : 'This page will begin playing automatically once the service starts.'}
                            </p>
                        </div>
                    )}

                    {/* Connecting */}
                    {isLive && connecting && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                            <Loader2 className="h-7 w-7 animate-spin text-amber-200/80" />
                            <p className="mt-4 text-sm tracking-wide text-neutral-300">
                                Connecting to the service…
                            </p>
                        </div>
                    )}

                    {/* Playback error */}
                    {isLive && playbackError && !connecting && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6 text-center">
                            <p className="text-sm text-neutral-300">{playbackError}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-4 rounded-full border border-amber-200/30 px-5 py-2 text-xs uppercase tracking-widest text-amber-100 transition-colors hover:bg-amber-200/10"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* Tap to hear — browsers block autoplay with sound */}
                    {isLive && needsTapToPlay && (
                        <button
                            onClick={unmute}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
                        >
                            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-200/40 bg-amber-200/10">
                                <Volume2 className="h-6 w-6 text-amber-100" />
                            </span>
                            <span className="mt-4 text-sm tracking-wide text-amber-100">
                                Tap to join with sound
                            </span>
                        </button>
                    )}

                    {/* Live badge */}
                    {isLive && (
                        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-3">
                            <span className="flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white backdrop-blur">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                                </span>
                                Live
                            </span>
                            {viewerCount > 0 && (
                                <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[11px] tracking-wide text-neutral-200 backdrop-blur">
                                    <Users className="h-3 w-3" />
                                    {viewerCount}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Controls */}
                    {isLive && !needsTapToPlay && (
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                            <button
                                onClick={toggleMute}
                                aria-label={muted ? 'Unmute' : 'Mute'}
                                className="rounded-full bg-black/50 p-2.5 text-neutral-200 backdrop-blur transition-colors hover:bg-black/70"
                            >
                                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </button>
                            {pipSupported && (
                                <button
                                    onClick={togglePip}
                                    aria-label="Keep watching in a floating window"
                                    title="Keep watching while you use other apps"
                                    className="rounded-full bg-black/50 p-2.5 text-neutral-200 backdrop-blur transition-colors hover:bg-black/70"
                                >
                                    <PictureInPicture className="h-4 w-4" />
                                </button>
                            )}
                            <button
                                onClick={goFullscreen}
                                aria-label="Fullscreen"
                                className="rounded-full bg-black/50 p-2.5 text-neutral-200 backdrop-blur transition-colors hover:bg-black/70"
                            >
                                <Maximize className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>

                {title && isLive && (
                    <p className="border-t border-white/5 px-5 py-3 text-center text-sm tracking-wide text-neutral-300">
                        {title}
                    </p>
                )}

                {isLive && pipSupported && (
                    <p className="border-t border-white/5 px-5 py-2.5 text-center text-xs text-neutral-500">
                        {pipError || 'Tap the floating-window icon to keep watching while you use other apps.'}
                    </p>
                )}
            </div>

            {/* ── Reactions + chat ──────────────────────────────────────── */}
            {isLive && (
                <div className="mt-8">
                    <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
                        {REACTIONS.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => sendReaction(emoji)}
                                aria-label={`Send ${emoji}`}
                                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xl transition-all hover:scale-110 hover:border-amber-200/30 hover:bg-amber-200/5 active:scale-95"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                        <div className="border-b border-white/5 px-5 py-3">
                            <h3 className="text-xs uppercase tracking-[0.25em] text-amber-200/70">
                                Condolences
                            </h3>
                        </div>

                        <div className="max-h-80 space-y-4 overflow-y-auto px-5 py-4">
                            {messages.length === 0 ? (
                                <p className="py-6 text-center text-sm text-neutral-500">
                                    Be the first to share a word of comfort.
                                </p>
                            ) : (
                                messages.map((message) => (
                                    <div key={message.id} className="text-sm leading-relaxed">
                                        <div className="flex flex-wrap items-baseline gap-2">
                                            <span className="font-medium text-amber-100/90">
                                                {message.guestName}
                                            </span>
                                            {message.country && (
                                                <span className="text-xs text-neutral-500">
                                                    {message.country}
                                                </span>
                                            )}
                                            <span className="ml-auto text-[11px] text-neutral-600">
                                                {formatTime(message.createdAt)}
                                            </span>
                                        </div>
                                        <p className="mt-1 whitespace-pre-wrap text-neutral-300">
                                            {message.text}
                                        </p>
                                    </div>
                                ))
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <form onSubmit={sendMessage} className="border-t border-white/5 p-4">
                            <div className="mb-3 grid gap-3 sm:grid-cols-2">
                                <input
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    placeholder="Your name"
                                    maxLength={60}
                                    aria-label="Your name"
                                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-amber-200/30"
                                />
                                <input
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    placeholder="Country (optional)"
                                    maxLength={60}
                                    aria-label="Country"
                                    className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-amber-200/30"
                                />
                            </div>
                            <div className="flex items-end gap-3">
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage(e);
                                        }
                                    }}
                                    rows={2}
                                    maxLength={MAX_MESSAGE_LENGTH}
                                    placeholder="Share a word of comfort…"
                                    aria-label="Your message"
                                    className="flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-amber-200/30"
                                />
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200/25 bg-amber-200/10 text-amber-100 transition-colors hover:bg-amber-200/20 disabled:opacity-40"
                                    aria-label="Send message"
                                >
                                    {sending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <p className="text-xs text-red-300/80">{chatError}</p>
                                <p className="text-xs text-neutral-600">
                                    {text.length}/{MAX_MESSAGE_LENGTH}
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
