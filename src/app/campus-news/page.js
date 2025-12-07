'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Link from 'next/link';

export default function CampusNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const newsRef = collection(db, 'events');
        const q = query(newsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const newsItems = querySnapshot.docs
          .filter(doc => {
            const data = doc.data();
            // Only show items where content is campus news (not regular events)
            return data.category === 'news' || !data.category;
          })
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        setNews(newsItems);
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Campus News</h2>
          <p className="mt-2 text-lg text-gray-600">Stay updated with the latest news from PPSU</p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              {item.imageUrl && (
                <div className="w-full h-48 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <div className="text-gray-600 whitespace-pre-wrap mb-4">
                  {item.summary || item.content?.slice(0, 150)}...
                </div>
                <Link
                  href={`/campus-news/${item.slug}`}
                  className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
                >
                  Read More
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
              {item.createdAt && (
                <div className="px-6 py-2 bg-gray-50 text-sm text-gray-600">
                  Posted on {new Date(item.createdAt.toDate()).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>

        {news.length === 0 && (
          <div className="text-center mt-12">
            <p className="text-gray-600">No news articles available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
