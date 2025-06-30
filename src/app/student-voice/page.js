'use client';

import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { db, auth } from '@/firebase/config'; // Firebase already initialized
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp
} from 'firebase/firestore';

// App config from global variables
const appId =
  typeof window !== 'undefined' && window.__app_id
    ? window.__app_id
    : 'default-app-id';

const initialAuthToken =
  typeof window !== 'undefined' && window.__initial_auth_token
    ? window.__initial_auth_token
    : null;

export default function StoryForm() {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    content: '',
    category: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            await signInAnonymously(auth);
          }
          setUserId(auth.currentUser?.uid || crypto.randomUUID());
        } catch (authError) {
          console.error('Firebase authentication error:', authError);
          setError('Failed to authenticate. Please refresh the page.');
        }
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCancel = () => {
    setFormData({ name: '', title: '', content: '', category: '' });
    setSuccess(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    setError('');

    if (!db || !isAuthReady || !userId) {
      setError('Database not ready or user not authenticated. Please wait.');
      setSubmitting(false);
      return;
    }

    try {
      await addDoc(
        collection(db, `artifacts/${appId}/public/data/submissions`),
        {
          ...formData,
          userId,
          createdAt: Timestamp.now(),
        }
      );
      setSuccess(true);
      setFormData({ name: '', title: '', content: '', category: '' });
    } catch (err) {
      console.error('Error submitting story:', err);
      setError('Something went wrong. Please try again.');
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-4 font-inter">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-gray-200">
        <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">
          Share Your Story
        </h2>

        {userId && isAuthReady && (
          <p className="text-sm text-gray-500 mb-4 text-center">
            Your User ID: <span className="font-mono text-gray-700 break-all">{userId}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between animate-fade-in">
              <p className="font-semibold">✅ Story submitted successfully!</p>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="text-green-600 hover:text-green-800 focus:outline-none"
              >
                &times;
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between animate-fade-in">
              <p className="font-semibold">⚠️ {error}</p>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-600 hover:text-red-800 focus:outline-none"
              >
                &times;
              </button>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Your Name"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Story Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Story Title"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g. Poem, Experience, Opinion"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={8}
              required
              placeholder="Write your story..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition resize-y"
            />
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

