'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { MemorialViewer } from '@/lib/stream/memorialStream';
import {
  MEMORIAL_STREAM_COLLECTION,
  MEMORIAL_STREAM_DOC_ID,
  MEMORIAL_PHOTO_SRCS,
  type MemorialStreamStatus,
} from '@/types/memorialStream';
import {
  X,
  Volume2,
  VolumeX,
  Users,
  Radio,
  ArrowRight,
  Loader2,
} from 'lucide-react';

const DISMISS_KEY = 'halala_live_popup_dismissed_session';

export default function HalalaLivePopup() {
  const pathname = usePathname();
  const router = useRouter();

  const [status, setStatus] = useState<MemorialStreamStatus>('offline');
  const [title, setTitle] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);

  const [dismissed, setDismissed] = useState(false);
  const [mainPlayerInView, setMainPlayerInView] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const viewerRef = useRef<MemorialViewer | null>(null);

  // Normalize current route path
  const currentPath = pathname ? pathname.replace(/\/$/, '') || '/' : '/';
  const isAllowedPath = currentPath === '/' || currentPath === '/halala';

  // 1. Real-time Firestore stream status listener
  useEffect(() => {
    if (!isAllowedPath) return;

    const ref = doc(db, MEMORIAL_STREAM_COLLECTION, MEMORIAL_STREAM_DOC_ID);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        const nextStatus = (data?.status as MemorialStreamStatus) || 'offline';
        setStatus(nextStatus);
        setTitle(data?.title || '');

        const nextPhoto = data?.photo as string | undefined;
        setPhoto(
          nextPhoto && MEMORIAL_PHOTO_SRCS.includes(nextPhoto)
            ? nextPhoto
            : null
        );

        if (typeof data?.currentViewers === 'number') {
          setViewerCount(data.currentViewers);
        }

        // Reset session dismissal when stream is not live
        if (nextStatus !== 'live') {
          sessionStorage.removeItem(DISMISS_KEY);
          setDismissed(false);
        } else {
          const isDismissed = sessionStorage.getItem(DISMISS_KEY) === 'true';
          setDismissed(isDismissed);
        }
      },
      (err) => {
        console.error('[HalalaLivePopup] Firestore status listener error:', err);
      }
    );

    return () => unsubscribe();
  }, [isAllowedPath]);

  // 2. Hide popup dynamically when the main #live player is in viewport on /halala
  useEffect(() => {
    if (currentPath !== '/halala') {
      setMainPlayerInView(false);
      return;
    }

    let observer: IntersectionObserver | null = null;
    const target = document.getElementById('live');

    if (target) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            setMainPlayerInView(entry.isIntersecting);
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(target);
    }

    return () => {
      observer?.disconnect();
    };
  }, [currentPath]);

  const isLive =
    status === 'live' && !dismissed && isAllowedPath && !mainPlayerInView;

  // 3. Connect LiveKit WebRTC stream preview when popup is visible & live
  useEffect(() => {
    if (!isLive) {
      viewerRef.current?.destroy();
      viewerRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setConnecting(false);
      return;
    }

    let cancelled = false;
    setConnecting(true);

    const viewer = new MemorialViewer({
      onStream: (stream) => {
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {
          /* Autoplay muted handling */
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

    viewer.join().catch((err) => {
      if (cancelled) return;
      console.error('[HalalaLivePopup] Failed to join preview:', err);
      setConnecting(false);
    });

    return () => {
      cancelled = true;
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [isLive]);

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, 'true');
    viewerRef.current?.destroy();
    viewerRef.current = null;
  }

  function toggleMute() {
    if (!videoRef.current) return;
    const next = !muted;
    videoRef.current.muted = next;
    setMuted(next);
    if (!next) {
      videoRef.current.play().catch(() => undefined);
    }
  }

  function handleCTA() {
    handleDismiss();

    if (currentPath === '/halala') {
      const el = document.getElementById('live');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      router.push('/halala#live');
    }
  }

  return (
    <AnimatePresence>
      {isLive && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-amber-300/40 bg-[#0a0a0f]/95 p-4 text-white shadow-[0_12px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:bottom-6 sm:right-6"
        >
          {/* Ambient Glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl"
          />

          {/* Header */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                LIVE NOW
              </span>
              {viewerCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-300">
                  <Users className="h-3 w-3 text-amber-200/80" />
                  {viewerCount}
                </span>
              )}
            </div>

            <button
              onClick={handleDismiss}
              aria-label="Dismiss notification"
              className="rounded-full p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Title / Description */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-amber-200/90">
              <Radio className="h-3.5 w-3.5 animate-pulse text-amber-300" />
              <span>Memorial Service</span>
            </div>
            <h4 className="font-display text-base font-semibold leading-tight text-white">
              {title || 'In Loving Memory of Halala Khumalo'}
            </h4>
          </div>

          {/* Video Preview Frame */}
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-inner">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted={muted}
              className="h-full w-full object-cover"
            />

            {/* Photo Overlay if Broadcaster pushes photo */}
            {photo && (
              <div className="absolute inset-0 bg-black">
                <Image
                  src={photo}
                  alt="Halala Khumalo"
                  fill
                  sizes="384px"
                  className="object-contain"
                />
              </div>
            )}

            {/* Connecting Spinner */}
            {connecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs">
                <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
              </div>
            )}

            {/* Audio Mute/Unmute Toggle */}
            <button
              onClick={toggleMute}
              aria-label={muted ? 'Unmute preview' : 'Mute preview'}
              className="absolute bottom-2 right-2 rounded-full bg-black/70 p-1.5 text-neutral-200 backdrop-blur-md transition-colors hover:bg-black hover:text-white"
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-amber-300" />
              )}
            </button>
          </div>

          {/* Action CTA */}
          <div className="mt-3.5 flex items-center justify-between gap-2">
            <button
              onClick={handleCTA}
              className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-200 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#1a1408] shadow-md transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            >
              <span>{currentPath === '/halala' ? 'Go to Service' : 'Watch Live Stream'}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={handleDismiss}
              className="rounded-xl border border-white/10 px-3 py-2.5 text-xs font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
