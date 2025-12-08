'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Search, X, Film, Play, Upload, Link2, Loader2 } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/config';
import type { Highlight, Match, Team } from '@/types/afcon';

export default function HighlightsManagement() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Upload state
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    matchId: '',
    duration: '',
  });

  // Fetch Data
  useEffect(() => {
    const q = query(collection(db, 'afcon_highlights'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const highlightsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Highlight));
      setHighlights(highlightsData);
      setLoading(false);
    });

    const fetchData = async () => {
      const matchesSnap = await getDocs(query(collection(db, 'afcon_fixtures'), orderBy('kickoffUTC', 'desc')));
      setMatches(matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));

      const teamsSnap = await getDocs(query(collection(db, 'afcon_teams')));
      setTeams(teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    };
    fetchData();

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (highlight?: Highlight) => {
    if (highlight) {
      setEditingHighlight(highlight);
      setFormData({
        title: highlight.title,
        description: highlight.description,
        videoUrl: highlight.videoUrl,
        thumbnailUrl: highlight.thumbnailUrl,
        matchId: highlight.matchId,
        duration: highlight.duration,
      });
      setUploadMode('url');
    } else {
      setEditingHighlight(null);
      setFormData({
        title: '',
        description: '',
        videoUrl: '',
        thumbnailUrl: '',
        matchId: '',
        duration: '',
      });
      setVideoFile(null);
      setThumbnailFile(null);
      setUploadMode('url');
    }
    setIsModalOpen(true);
  };

  // Upload file to Firebase Storage
  const uploadFile = (file: File, path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsUploading(true);
      let videoUrl = formData.videoUrl;
      let thumbnailUrl = formData.thumbnailUrl;
      let mediaType: 'video' | 'image' | undefined;

      // Upload files if in file mode
      if (uploadMode === 'file') {
        if (videoFile) {
          const timestamp = Date.now();
          const videoPath = `afcon_highlights/videos/${timestamp}_${videoFile.name}`;
          videoUrl = await uploadFile(videoFile, videoPath);
          mediaType = videoFile.type.startsWith('video/') ? 'video' : 'image';
        }

        if (thumbnailFile) {
          const timestamp = Date.now();
          const thumbPath = `afcon_highlights/thumbnails/${timestamp}_${thumbnailFile.name}`;
          thumbnailUrl = await uploadFile(thumbnailFile, thumbPath);
        }
      }

      const dataToSave = {
        title: formData.title,
        description: formData.description,
        videoUrl,
        thumbnailUrl,
        matchId: formData.matchId,
        duration: formData.duration,
        mediaType,
        updatedAt: serverTimestamp(),
      };

      if (editingHighlight) {
        await updateDoc(doc(db, 'afcon_highlights', editingHighlight.id!), dataToSave);
      } else {
        await addDoc(collection(db, 'afcon_highlights'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
      }

      setIsModalOpen(false);
      setVideoFile(null);
      setThumbnailFile(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error saving highlight:', error);
      alert('Error saving highlight. Check console.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this highlight?')) {
      try {
        await deleteDoc(doc(db, 'afcon_highlights', id));
      } catch (error) {
        console.error('Error deleting highlight:', error);
      }
    }
  };

  const getMatchLabel = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return 'Unknown Match';
    const home = teams.find(t => t.id === match.homeTeamId)?.name || 'Home';
    const away = teams.find(t => t.id === match.awayTeamId)?.name || 'Away';
    return `${home} vs ${away}`;
  };

  const filteredHighlights = highlights.filter(h =>
    h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-black dark:text-white">Highlights</h1>
          <p className="text-black dark:text-gray-400">Manage match videos and replays.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Add Highlight
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search highlights..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-afcon-green focus:border-transparent outline-none transition-all"
        />
      </div>

      {/* Highlights List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="col-span-full text-center text-gray-500 py-8">Loading highlights...</p>
        ) : filteredHighlights.length === 0 ? (
          <p className="col-span-full text-center text-gray-500 py-8">No highlights found.</p>
        ) : (
          filteredHighlights.map((highlight) => (
            <div key={highlight.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group">
              <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
                {highlight.thumbnailUrl ? (
                  <img src={highlight.thumbnailUrl} alt={highlight.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Film className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-12 h-12 text-white fill-white" />
                </div>
                <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {highlight.duration || '0:00'}
                </span>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{highlight.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{highlight.description}</p>

                <div className="flex items-center justify-between mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <span className="text-xs text-gray-400">
                    {getMatchLabel(highlight.matchId)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(highlight)}
                      className="p-1.5 text-blue-600 hover:bg-black hover:text-white dark:hover:bg-black rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(highlight.id!)}
                      className="p-1.5 text-red-600 hover:bg-black hover:text-white dark:hover:bg-black rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingHighlight ? 'Edit Highlight' : 'Add New Highlight'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                />
              </div>

              {/* Upload Mode Toggle */}
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${uploadMode === 'url'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  <Link2 className="w-4 h-4" />
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${uploadMode === 'file'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </button>
              </div>

              {uploadMode === 'url' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Video URL (YouTube/MP4)</label>
                    <input
                      type="url"
                      required
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Thumbnail URL</label>
                    <input
                      type="url"
                      value={formData.thumbnailUrl}
                      onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Video/Image File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Video/Image File</label>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*,image/*"
                      onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className={`w-full py-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center gap-2 ${videoFile
                          ? 'border-afcon-green bg-afcon-green/10 text-afcon-green'
                          : 'border-gray-300 dark:border-gray-600 hover:border-afcon-green text-gray-500'
                        }`}
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-sm font-medium">
                        {videoFile ? videoFile.name : 'Click to select video or image'}
                      </span>
                      <span className="text-xs text-gray-400">MP4, WebM, MOV, JPG, PNG, WebP</span>
                    </button>
                  </div>

                  {/* Thumbnail Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Thumbnail (Optional)</label>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => thumbnailInputRef.current?.click()}
                      className={`w-full py-3 border-2 border-dashed rounded-xl transition-all flex items-center justify-center gap-2 ${thumbnailFile
                          ? 'border-afcon-green bg-afcon-green/10 text-afcon-green'
                          : 'border-gray-300 dark:border-gray-600 hover:border-afcon-green text-gray-500'
                        }`}
                    >
                      <span className="text-sm">
                        {thumbnailFile ? thumbnailFile.name : 'Select thumbnail image'}
                      </span>
                    </button>
                  </div>

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
                        <span className="font-medium text-afcon-green">{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-afcon-green transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Related Match</label>
                  <select
                    value={formData.matchId}
                    onChange={(e) => setFormData({ ...formData, matchId: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                  >
                    <option value="">Select Match (Optional)</option>
                    {matches.map(match => {
                      const home = teams.find(t => t.id === match.homeTeamId)?.name || 'Home';
                      const away = teams.find(t => t.id === match.awayTeamId)?.name || 'Away';
                      return (
                        <option key={match.id} value={match.id}>{home} vs {away}</option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:24"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-afcon-green outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isUploading}
                  className="px-6 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || (uploadMode === 'file' && !videoFile && !editingHighlight)}
                  className="px-6 py-3 rounded-xl bg-black text-white hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingHighlight ? 'Update Highlight' : 'Create Highlight'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
