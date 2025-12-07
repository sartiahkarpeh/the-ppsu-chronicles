'use client';

import React, { useState } from 'react';
import { isValidYouTubeId, getYouTubeThumbnail } from '@/lib/afcon/utils';

interface VideoEmbedProps {
  youtubeId?: string;
  streamingUrl?: string;
  title?: string;
}

export default function VideoEmbed({ youtubeId, streamingUrl, title = 'Match Stream' }: VideoEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // If no valid video source, show fallback
  if (!youtubeId && !streamingUrl) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-2">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-white font-semibold mb-2">Official stream not available</p>
        <p className="text-gray-400 text-sm">Watch highlights after the match</p>
      </div>
    );
  }

  // Validate YouTube ID if present
  if (youtubeId && !isValidYouTubeId(youtubeId)) {
    return (
      <div className="bg-red-100 dark:bg-red-900 rounded-lg p-4 text-center">
        <p className="text-red-800 dark:text-red-200">Invalid YouTube video ID</p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
      {!isLoaded && youtubeId && (
        <div
          className="absolute inset-0 cursor-pointer group"
          onClick={() => setIsLoaded(true)}
        >
          <img
            src={getYouTubeThumbnail(youtubeId, 'hq')}
            alt={title}
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all flex items-center justify-center rounded-lg">
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg
                className="w-10 h-10 text-white ml-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </div>
        </div>
      )}
      {(isLoaded || streamingUrl) && (
        <iframe
          className="absolute inset-0 w-full h-full rounded-lg"
          src={
            streamingUrl
              ? streamingUrl
              : `https://www.youtube.com/embed/${youtubeId}?autoplay=1`
          }
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}

