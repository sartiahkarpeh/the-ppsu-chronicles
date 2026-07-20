'use client';

/**
 * Admin broadcaster for the Halala memorial service.
 *
 * Open this on a phone, allow camera + mic, then tap "Go Live". The feed
 * publishes to LiveKit and appears on /halala for the public.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { MemorialBroadcaster } from '@/lib/stream/memorialStream';
import {
    ArrowLeft,
    Mic,
    MicOff,
    Video,
    VideoOff,
    SwitchCamera,
    Users,
    Loader2,
    ExternalLink,
    Maximize,
    Plus,
    Minus,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function MemorialBroadcastPage() {
    const router = useRouter();
    const [authState, setAuthState] = useState<'loading' | 'admin' | 'not-admin'>('loading');

    const [previewReady, setPreviewReady] = useState(false);
    const [permissionError, setPermissionError] = useState('');
    const [isLive, setIsLive] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isEnding, setIsEnding] = useState(false);

    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const [viewerCount, setViewerCount] = useState(0);
    const [duration, setDuration] = useState(0);
    const [zoom, setZoom] = useState<{ min: number; max: number; step: number; current: number } | null>(null);
    const [connectionState, setConnectionState] = useState('');
    const [title, setTitle] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const previewWrapRef = useRef<HTMLDivElement>(null);
    const broadcasterRef = useRef<MemorialBroadcaster | null>(null);
    const isLiveRef = useRef(false);

    useEffect(() => {
        isLiveRef.current = isLive;
    }, [isLive]);

    /**
     * Broadcasting is gated on the `role` custom claim (see scripts/setAdminRole.js),
     * because student diary accounts sign in against this same Firebase project —
     * "signed in" alone is not enough to publish video to a public memorial page.
     *
     * The ID token is force-refreshed so a freshly granted role takes effect
     * without signing out and back in.
     */
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push('/login');
                return;
            }
            try {
                const { claims } = await user.getIdTokenResult(true);
                const role = claims.role as string | undefined;
                setAuthState(role === 'admin' || role === 'editor' ? 'admin' : 'not-admin');
            } catch {
                setAuthState('not-admin');
            }
        });
        return unsubscribe;
    }, [router]);

    const isAdmin = authState === 'admin';
    const authLoading = authState === 'loading';

    // ── Camera preview ────────────────────────────────────────────────────
    const startPreview = useCallback(async () => {
        setPermissionError('');
        try {
            const broadcaster =
                broadcasterRef.current ??
                new MemorialBroadcaster(undefined, {
                    onViewerCountChange: setViewerCount,
                    onConnectionStateChange: setConnectionState,
                });
            broadcasterRef.current = broadcaster;

            const stream = await broadcaster.getLocalStream();
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => undefined);
            }
            setPreviewReady(true);
            setMicOn(true);
            setCameraOn(true);
            setZoom(broadcaster.getZoomRange());
        } catch (error) {
            console.error('[MemorialBroadcast] Camera error:', error);
            setPermissionError(
                'Could not access your camera and microphone. Please allow permission in your browser and reload. Note that camera access requires HTTPS.'
            );
        }
    }, []);

    useEffect(() => {
        if (!authLoading && isAdmin) startPreview();
    }, [authLoading, isAdmin, startPreview]);

    // Tear down media on unmount, ending the stream if it's still running.
    useEffect(() => {
        return () => {
            const broadcaster = broadcasterRef.current;
            if (!broadcaster) return;
            if (isLiveRef.current) {
                broadcaster.endStream().catch(() => undefined);
            } else {
                broadcaster.destroy();
            }
            broadcasterRef.current = null;
        };
    }, []);

    // Best-effort "end stream" if the tab is closed mid-broadcast.
    useEffect(() => {
        function handleUnload() {
            if (isLiveRef.current) {
                broadcasterRef.current?.endStream().catch(() => undefined);
            }
        }
        window.addEventListener('pagehide', handleUnload);
        return () => window.removeEventListener('pagehide', handleUnload);
    }, []);

    // Stream duration ticker.
    useEffect(() => {
        if (!isLive) {
            setDuration(0);
            return;
        }
        const timer = setInterval(() => setDuration((d) => d + 1), 1000);
        return () => clearInterval(timer);
    }, [isLive]);

    async function applyZoom(next: number) {
        if (!zoom) return;
        const clamped = Math.min(zoom.max, Math.max(zoom.min, next));
        // Move the slider immediately; the camera catches up.
        setZoom({ ...zoom, current: clamped });
        await broadcasterRef.current?.setZoom(clamped);
    }

    function toggleFullscreen() {
        const el = previewWrapRef.current;
        if (!el) return;

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => undefined);
        } else {
            el.requestFullscreen?.().catch(() => undefined);
        }
    }

    async function goLive() {
        if (!broadcasterRef.current) return;
        setIsStarting(true);
        try {
            await broadcasterRef.current.startStream(title.trim());
            setIsLive(true);
            toast.success('You are live on /halala');
        } catch (error) {
            console.error('[MemorialBroadcast] Failed to go live:', error);
            toast.error(error instanceof Error ? error.message : 'Could not start the stream.');
        } finally {
            setIsStarting(false);
        }
    }

    async function endLive() {
        if (!broadcasterRef.current) return;
        setIsEnding(true);
        try {
            await broadcasterRef.current.endStream();
            setIsLive(false);
            setPreviewReady(false);
            broadcasterRef.current = null;
            toast.success('Stream ended');
        } catch (error) {
            console.error('[MemorialBroadcast] Failed to end stream:', error);
            toast.error('Could not cleanly end the stream.');
        } finally {
            setIsEnding(false);
        }
    }

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
                <Loader2 className="h-6 w-6 animate-spin text-amber-200/70" />
            </div>
        );
    }

    if (authState === 'not-admin') {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-6 text-center">
                <p className="font-display text-lg tracking-wide text-amber-100/90">
                    Broadcast access required
                </p>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-400">
                    This account is signed in but does not have the broadcaster role. Grant it by
                    running{' '}
                    <code className="rounded bg-white/5 px-1.5 py-0.5 text-amber-200/80">
                        node scripts/setAdminRole.js &lt;your-email&gt; admin
                    </code>
                    , then reload this page.
                </p>
                <Link
                    href="/admin/dashboard"
                    className="mt-6 rounded-full border border-amber-200/30 px-5 py-2 text-xs uppercase tracking-widest text-amber-100 transition-colors hover:bg-amber-200/10"
                >
                    Back to admin
                </Link>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-neutral-200">
            <Toaster position="top-center" />

            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <Link
                    href="/admin/dashboard"
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-400 transition-colors hover:text-amber-100"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Admin
                </Link>
                <span className="font-display text-sm tracking-wide text-amber-100/90">
                    Memorial Service Broadcast
                </span>
                <Link
                    href="/halala#live"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-neutral-400 transition-colors hover:text-amber-100"
                >
                    View <ExternalLink className="h-3 w-3" />
                </Link>
            </header>

            <main className="mx-auto max-w-2xl px-4 py-6">
                {/* Preview */}
                <div
                    ref={previewWrapRef}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-black"
                >
                    <div className="relative aspect-video w-full">
                        <video
                            ref={videoRef}
                            playsInline
                            autoPlay
                            muted
                            className="h-full w-full object-contain"
                        />

                        {/* Fullscreen — matches the control viewers get */}
                        {previewReady && (
                            <button
                                onClick={toggleFullscreen}
                                aria-label="Toggle fullscreen"
                                className="absolute bottom-3 right-3 rounded-full bg-black/50 p-2.5 text-neutral-200 backdrop-blur transition-colors hover:bg-black/70"
                            >
                                <Maximize className="h-4 w-4" />
                            </button>
                        )}

                        {/* Zoom — only rendered when the camera actually supports it */}
                        {previewReady && zoom && (
                            <div className="absolute bottom-3 left-1/2 flex w-[min(20rem,80%)] -translate-x-1/2 items-center gap-3 rounded-full bg-black/50 px-4 py-2 backdrop-blur">
                                <button
                                    onClick={() => applyZoom(zoom.current - zoom.step * 4)}
                                    aria-label="Zoom out"
                                    className="text-neutral-200 transition-colors hover:text-white"
                                >
                                    <Minus className="h-4 w-4" />
                                </button>
                                <input
                                    type="range"
                                    min={zoom.min}
                                    max={zoom.max}
                                    step={zoom.step}
                                    value={zoom.current}
                                    onChange={(e) => applyZoom(Number(e.target.value))}
                                    aria-label="Camera zoom"
                                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/25 accent-amber-200"
                                />
                                <button
                                    onClick={() => applyZoom(zoom.current + zoom.step * 4)}
                                    aria-label="Zoom in"
                                    className="text-neutral-200 transition-colors hover:text-white"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {!previewReady && !permissionError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                                <Loader2 className="h-6 w-6 animate-spin text-amber-200/70" />
                                <p className="mt-3 text-sm text-neutral-400">Starting camera…</p>
                            </div>
                        )}

                        {permissionError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 px-6 text-center">
                                <p className="text-sm leading-relaxed text-neutral-300">
                                    {permissionError}
                                </p>
                                <button
                                    onClick={startPreview}
                                    className="mt-4 rounded-full border border-amber-200/30 px-5 py-2 text-xs uppercase tracking-widest text-amber-100 transition-colors hover:bg-amber-200/10"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {isLive && (
                            <div className="absolute left-3 top-3 flex items-center gap-2">
                                <span className="flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white">
                                    <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                                    </span>
                                    Live
                                </span>
                                <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] tracking-wide text-neutral-200">
                                    {formatDuration(duration)}
                                </span>
                                <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] tracking-wide text-neutral-200">
                                    <Users className="h-3 w-3" />
                                    {viewerCount}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Media controls */}
                <div className="mt-5 flex items-center justify-center gap-4">
                    <button
                        onClick={() => setMicOn(broadcasterRef.current?.toggleMic() ?? false)}
                        disabled={!previewReady}
                        aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
                        className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors disabled:opacity-30 ${
                            micOn
                                ? 'border-white/10 bg-white/5 text-neutral-200'
                                : 'border-red-500/40 bg-red-500/15 text-red-300'
                        }`}
                    >
                        {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </button>

                    <button
                        onClick={() => setCameraOn(broadcasterRef.current?.toggleCamera() ?? false)}
                        disabled={!previewReady}
                        aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
                        className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors disabled:opacity-30 ${
                            cameraOn
                                ? 'border-white/10 bg-white/5 text-neutral-200'
                                : 'border-red-500/40 bg-red-500/15 text-red-300'
                        }`}
                    >
                        {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                const stream = await broadcasterRef.current?.switchCamera();
                                if (stream && videoRef.current) videoRef.current.srcObject = stream;
                                // Front and rear cameras expose different zoom ranges.
                                setZoom(broadcasterRef.current?.getZoomRange() ?? null);
                            } catch {
                                toast.error('Could not switch camera.');
                            }
                        }}
                        disabled={!previewReady}
                        aria-label="Switch camera"
                        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-200 transition-colors disabled:opacity-30"
                    >
                        <SwitchCamera className="h-5 w-5" />
                    </button>
                </div>

                {/* Caption */}
                {!isLive && (
                    <div className="mt-6">
                        <label
                            htmlFor="stream-title"
                            className="mb-2 block text-xs uppercase tracking-[0.2em] text-neutral-500"
                        >
                            Caption (optional)
                        </label>
                        <input
                            id="stream-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={120}
                            placeholder="e.g. Funeral service — Mbabane, Eswatini"
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-colors focus:border-amber-200/30"
                        />
                    </div>
                )}

                {/* Go live / end */}
                <div className="mt-8">
                    {!isLive ? (
                        <button
                            onClick={goLive}
                            disabled={!previewReady || isStarting}
                            className="w-full rounded-full bg-red-600 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {isStarting ? 'Starting…' : 'Go Live'}
                        </button>
                    ) : (
                        <button
                            onClick={endLive}
                            disabled={isEnding}
                            className="w-full rounded-full border border-red-500/40 bg-red-500/10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-40"
                        >
                            {isEnding ? 'Ending…' : 'End Stream'}
                        </button>
                    )}

                    <p className="mt-4 text-center text-xs leading-relaxed text-neutral-500">
                        {isLive
                            ? 'Keep this tab open and your screen awake for the whole service.'
                            : 'Viewers will see the service at theppsuchronicles.com/halala'}
                    </p>

                    {connectionState && isLive && (
                        <p className="mt-2 text-center text-xs text-neutral-600">
                            Connection: {connectionState}
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}
