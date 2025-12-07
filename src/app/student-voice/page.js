'use client';

import { useState, useEffect } from 'react';
import { db, auth, storage } from '@/firebase/config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export default function StoryForm() {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    story: '',
    category: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try {
          await signInAnonymously(auth);
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

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', title: '', story: '', category: '' });
    setImageFile(null);
    setImagePreview('');
    setSuccess(false);
    setError('');
    setUploadProgress(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    setError('');
    setUploadProgress(0);

    if (!db || !isAuthReady || !userId) {
      setError('Database not ready or user not authenticated. Please wait.');
      setSubmitting(false);
      return;
    }

    let imageUrl = '';
    let imagePath = '';

    try {
      if (imageFile) {
        imagePath = `submissions/${Date.now()}_${imageFile.name}`;
        const imageRef = ref(storage, imagePath);
        const uploadTask = uploadBytesResumable(imageRef, imageFile);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (uploadError) => {
              console.error('Upload error:', uploadError);
              setError('Image upload failed. Please try again.');
              reject(uploadError);
            },
            async () => {
              imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      await addDoc(collection(db, 'submissions'), {
        ...formData,
        imageUrl,
        imagePath,
        userId,
        status: 'pending',
        createdAt: Timestamp.now(),
      });

      // Show success message and hide the form
      setSuccess(true);

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

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between animate-fade-in mb-6">
            <p className="font-semibold">
              ✅ Thanks for submitting your story, our admin will review and publish where possible.
            </p>
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="text-green-600 hover:text-green-800 focus:outline-none"
            >
              &times;
            </button>
          </div>
        )}

        {/* Only show form if not submitted */}
        {!success && (
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                Featured Image (Optional)
              </label>
              <input
                type="file"
                id="image"
                name="image"
                onChange={handleImageChange}
                accept="image/*"
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {imagePreview && (
                <div className="mt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Image preview" className="w-48 h-auto rounded-lg shadow-md" />
                </div>
              )}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="story" className="block text-sm font-medium text-gray-700 mb-1">
                Your Story
              </label>
              <textarea
                id="story"
                name="story"
                value={formData.story}
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
        )}
      </div>
    </div>
  );
}
