'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Film } from 'lucide-react';
import SectionHeader from '@/components/afcon/SectionHeader';
import { getHighlights } from '@/lib/afcon/firestore';
import type { Highlight } from '@/types/afcon';

export default function HighlightsPage() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        const data = await getHighlights();
        setHighlights(data);
      } catch (error) {
        console.error('Error fetching highlights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHighlights();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-afcon-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-afcon-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-afcon-black py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/afcon25"
            className="text-afcon-green dark:text-afcon-gold hover:underline mb-4 inline-block font-bold"
          >
            ← Back to AFCON 2025
          </Link>
          <SectionHeader
            title="Match Highlights"
            subtitle="Watch the best moments from AFCON 2025"
          />
        </div>

        {/* Highlights Grid */}
        {highlights.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {highlights.map(highlight => (
              <a
                key={highlight.id}
                href={`https://youtube.com/watch?v=${highlight.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white dark:bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 overflow-hidden"
              >
                <div className="relative overflow-hidden aspect-video">
                  <img
                    src={highlight.thumbnailUrl}
                    alt={highlight.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-md">
                    YouTube
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display font-bold text-xl text-gray-900 dark:text-white group-hover:text-afcon-gold transition-colors line-clamp-2 mb-2">
                    {highlight.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(highlight.uploadedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
            <div className="text-6xl mb-6">🎬</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No Highlights Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Match highlights will be posted here after games are played
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
