'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import ShareButtons from '../../../components/ShareButtons';

export default function NewsDetail({ params: paramsPromise }) {
  const params = React.use(paramsPromise);
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const newsRef = collection(db, 'events');
        const q = query(newsRef, where('slug', '==', params.slug));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const newsData = {
            id: querySnapshot.docs[0].id,
            ...querySnapshot.docs[0].data()
          };
          setNews(newsData);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.slug) {
      fetchNews();
    }
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">News article not found</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{news.title}</h1>
          {news.createdAt && (
            <div className="text-gray-600">
              Posted on {new Date(news.createdAt.toDate()).toLocaleDateString()}
            </div>
          )}
        </header>

        {news.imageUrl && (
          <div className="mb-8 rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={news.imageUrl}
              alt={news.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        <div className="prose prose-lg max-w-none">
          <div className="text-gray-800 whitespace-pre-wrap mb-8">{news.content}</div>
        </div>

        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Share this article</h3>
          <ShareButtons title={news.title} />
        </div>
      </article>
    </div>
  );
}
