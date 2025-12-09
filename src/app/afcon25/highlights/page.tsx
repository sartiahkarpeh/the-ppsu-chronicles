'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Film, ArrowLeft, Clock, X } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Highlight } from '@/types/afcon';

export default function HighlightsPage() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<Highlight | null>(null);

  useEffect(() => {
    // Subscribe to real-time updates from afcon_highlights
    const q = query(collection(db, 'afcon_highlights'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const highlightsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Highlight));
      setHighlights(highlightsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching highlights:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Check if file is a video
  const isVideo = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext)) ||
      url.includes('video') ||
      url.includes('.mp4');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-afcon-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/afcon-pattern.svg')] opacity-5"></div>
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-afcon-green/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-afcon-gold/20 rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-4 py-6 md:py-10">
          <Link
            href="/afcon25"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 md:mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to AFCON 2025
          </Link>

          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-afcon-green/10 backdrop-blur-sm border border-afcon-green/20 rounded-xl mb-3">
              <Film className="w-8 h-8 md:w-10 md:h-10 text-afcon-green" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-display font-bold text-white uppercase tracking-wider mb-2">
              Match Highlights
            </h1>
            <p className="text-base md:text-xl text-afcon-gold font-medium">
              Watch the Best Moments from AFCON 2025
            </p>
          </div>
        </div>
      </div>

      {/* Highlights Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {highlights.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {highlights.map(highlight => {
              const isVideoFile = isVideo(highlight.videoUrl);
              const thumbnail = highlight.thumbnailUrl || highlight.videoUrl;

              return (
                <button
                  key={highlight.id}
                  onClick={() => setSelectedMedia(highlight)}
                  className="group bg-white dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 overflow-hidden text-left"
                >
                  {/* Thumbnail */}
                  <div className="relative overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800">
                    {thumbnail ? (
                      isVideoFile && !highlight.thumbnailUrl ? (
                        <video
                          src={highlight.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={thumbnail}
                          alt={highlight.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-16 h-16 text-gray-400" />
                      </div>
                    )}

                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-14 h-14 bg-afcon-green rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <Play className="w-6 h-6 text-black fill-black ml-1" />
                      </div>
                    </div>

                    {/* Duration badge */}
                    {highlight.duration && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/70 text-white px-2 py-1 rounded text-xs">
                        <Clock className="w-3 h-3" />
                        {highlight.duration}
                      </div>
                    )}

                    {/* Media type badge */}
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-md bg-afcon-green text-black">
                      {isVideoFile ? 'Video' : 'Photo'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white group-hover:text-afcon-gold transition-colors line-clamp-2 mb-2">
                      {highlight.title}
                    </h3>

                    {highlight.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {highlight.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
            <div className="mb-6 inline-flex items-center justify-center w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Film className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No Highlights Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Match highlights will be posted here after games are played
            </p>
          </div>
        )}
      </main>

      {/* Media Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Media Content */}
            <div className="relative">
              {isVideo(selectedMedia.videoUrl) ? (
                <video
                  src={selectedMedia.videoUrl}
                  controls
                  autoPlay
                  className="w-full max-h-[70vh] object-contain"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={selectedMedia.videoUrl}
                  alt={selectedMedia.title}
                  className="w-full max-h-[70vh] object-contain"
                />
              )}
            </div>

            {/* Info Panel */}
            <div className="p-6 bg-gray-900">
              <h2 className="text-xl font-display font-bold text-white mb-2">
                {selectedMedia.title}
              </h2>
              {selectedMedia.description && (
                <p className="text-gray-400">
                  {selectedMedia.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
