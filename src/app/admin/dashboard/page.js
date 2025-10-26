'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db, storage, auth } from '../../../firebase/config'; // Adjust this path if needed
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

// --- Helper Components ---

// Custom Confirmation Modal to replace window.confirm()
const ConfirmationModal = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100]">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">{message}</h3>
        <div className="flex justify-end space-x-4">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Helper Functions ---
const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

const getYoutubeEmbedUrl = (url) => {
  if (!url) return '';
  let videoId;
  if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  } else if (url.includes('watch?v=')) {
    videoId = url.split('watch?v=')[1].split('&')[0];
  } else {
    return ''; // Not a valid YouTube URL
  }
  return `https://www.youtube.com/embed/${videoId}`;
};

// --- Main Admin Panel Component ---
export default function SuperAdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [content, setContent] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formState, setFormState] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState({ isOpen: false, message: '', onConfirm: () => { } });
  const [counts, setCounts] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const router = useRouter();

  // --- Authentication Check ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // --- Content Type Configuration ---
  const contentTypes = useMemo(() => ({
    dashboard: { name: 'Dashboard', collectionName: null, fields: [] },
    stories: { name: 'Student Stories', collectionName: 'posts', fields: ['title', 'author', 'content', 'tags', 'youtubeUrl'] },
    campus_news: { name: 'Campus News', collectionName: 'events', fields: ['title', 'summary', 'content', 'tags', 'category'] },
    student_spotlights: { name: 'Student Spotlights', collectionName: 'spotlights', fields: ['studentName', 'major', 'quote', 'content', 'stars'] },
    media_gallery: { name: 'Media Gallery', collectionName: 'media_videos', fields: ['category', 'title', 'description', 'youtubeUrl'] },
    campus_events: { name: 'Campus Events', collectionName: 'events', fields: ['title', 'date', 'time', 'location', 'description', 'category'] },
    upcoming_events: { name: 'Upcoming Events', collectionName: 'upcomingEvents', fields: ['title', 'date', 'time', 'location', 'description', 'category', 'registerLink'] },
    student_voice: { name: 'Student Voice Submissions', collectionName: 'submissions', fields: [] },
    predictions: { name: '⚽ Match Predictions', collectionName: null, fields: [], isExternal: true, path: '/admin/predictions' },
    live_scream: { name: 'Live Scream', collectionName: null, fields: [], isExternal: true, path: '/live/admin' },
    live_streams: { name: 'Live Streams', collectionName: 'live_streams', fields: ['title', 'description', 'streamKey', 'status'] },
    contact_messages: { name: 'Contact Messages', collectionName: 'contactmessages', fields: [] },
  }), []);


  const currentConfig = contentTypes[currentView];

  // --- Data Fetching ---
  const fetchContent = useCallback(() => {
    if (!currentConfig || !currentConfig.collectionName) {
      setContent([]);
      return;
    }
    const contentCollection = collection(db, currentConfig.collectionName);
    const q = query(contentCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setContent(items);
    }, (error) => {
      console.error(`Error fetching ${currentConfig.name}:`, error);
    });

    return unsubscribe;
  }, [currentConfig]);

  // --- Realtime Counts for Dashboard ---
  useEffect(() => {
    const unsubs = [];
    Object.entries(contentTypes).forEach(([key, cfg]) => {
      if (!cfg.collectionName) return;
      const qRef = query(collection(db, cfg.collectionName));
      const unsub = onSnapshot(qRef, (snapshot) => {
        setCounts((prev) => ({ ...prev, [key]: snapshot.size }));
      }, (error) => {
        console.error(`Error counting ${cfg.name}:`, error);
      });
      unsubs.push(unsub);
    });
    return () => {
      unsubs.forEach((u) => u && u());
    };
  }, [contentTypes]);

  const fetchLogs = useCallback(() => {
    const logsCollection = collection(db, 'logs');
    const q = query(logsCollection, orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLogs(logData);
    }, (error) => {
      console.error("Error fetching logs:", error);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let unsubscribeContent;
    if (currentView !== 'dashboard' && currentConfig?.collectionName) {
      unsubscribeContent = fetchContent();
    }
    const unsubscribeLogs = fetchLogs();

    return () => {
      if (unsubscribeContent) unsubscribeContent();
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, [currentView, currentConfig, fetchContent, fetchLogs]);

  // --- Activity Logging ---
  const logActivity = async (action, details) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'logs'), {
        action,
        details,
        user: user.email,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // --- Modal & Form Handling ---
  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormState(item);
      if (item.imageUrl) setImagePreview(item.imageUrl);
    } else {
      setEditingItem(null);
      const allFields = new Set();
      Object.values(contentTypes).forEach(ct => {
        if (ct.fields) ct.fields.forEach(field => allFields.add(field));
      });
      const emptyState = {};
      allFields.forEach(field => { emptyState[field] = ''; });
      emptyState.status = 'published';
      setFormState(emptyState);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormState({});
    setImageFile(null);
    setImagePreview('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setImagePreview(reader.result); };
      reader.readAsDataURL(file);
    }
  };

  const closeConfirmation = () => {
    setConfirmation({ isOpen: false, message: '', onConfirm: () => { } });
  };


  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!currentConfig || isSubmitting) {
      console.warn("🚫 No config or already submitting");
      return;
    }

    setIsSubmitting(true);
    console.log("🟡 SUBMIT STARTED", currentConfig.collectionName);

    let imageUrl = editingItem?.imageUrl || '';
    let imagePath = editingItem?.imagePath || '';

    try {
      // Upload new image if present
      if (imageFile) {
        if (editingItem?.imagePath) {
          try {
            await deleteObject(ref(storage, editingItem.imagePath));
          } catch (err) {
            console.warn("⚠️ Could not delete old image:", err);
          }
        }

        imagePath = `${currentConfig.collectionName}/${Date.now()}_${imageFile.name}`;
        const imageRef = ref(storage, imagePath);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      let slugSource = formState.title || formState.studentName || 'untitled';
      const dataToSave = {
        ...formState,
        slug: slugify(slugSource),
        updatedAt: serverTimestamp(),
      };

      if (imageUrl) dataToSave.imageUrl = imageUrl;
      if (imagePath) dataToSave.imagePath = imagePath;

      if (dataToSave.youtubeUrl) {
        dataToSave.youtubeEmbedUrl = getYoutubeEmbedUrl(dataToSave.youtubeUrl);
      }

      if (typeof dataToSave.tags === 'string') {
        dataToSave.tags = dataToSave.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
      }

      if (!currentConfig.collectionName) {
        alert("❌ No collection name defined.");
        setIsSubmitting(false);
        return;
      }

      if (editingItem) {
        const itemDoc = doc(db, currentConfig.collectionName, editingItem.id);
        console.log("🛠️ Updating document...");
        await updateDoc(itemDoc, dataToSave);
        await logActivity('Update', `Updated ${currentConfig.name}: "${dataToSave.title || dataToSave.studentName}"`);
      } else {
        dataToSave.createdAt = serverTimestamp();
        console.log("🧾 Adding new document...");
        await addDoc(collection(db, currentConfig.collectionName), dataToSave);
        console.log("✅ Saved to Firebase");
        await logActivity('Create', `Created new ${currentConfig.name}: "${dataToSave.title || dataToSave.studentName}"`);
      }

      console.log("✅ Form submitted successfully");
      closeModal();
    } catch (error) {
      console.error("🔥 ERROR during form submit:", error);
      alert("Something went wrong while saving. Please check the console for details.");
    } finally {
      setIsSubmitting(false);
      console.log("🔚 Submission done. Modal closing...");
    }
  };


  // --- Wrapped CRUD Actions for Confirmation ---
  const handleDelete = (item) => {
    setConfirmation({
      isOpen: true,
      message: `Are you sure you want to delete "${item.title || item.studentName}"? This cannot be undone.`,
      onConfirm: () => performDelete(item),
    });
  };

  const performDelete = async (item) => {
    try {
      await deleteDoc(doc(db, currentConfig.collectionName, item.id));
      if (item.imagePath) {
        const imageRef = ref(storage, item.imagePath);
        await deleteObject(imageRef);
      }
      await logActivity('Delete', `Deleted ${currentConfig.name}: "${item.title || item.studentName}"`);
    } catch (error) {
      console.error("Error deleting item:", error);
    } finally {
      closeConfirmation();
    }
  };

  const handleApproveSubmission = (submission) => {
    setConfirmation({
      isOpen: true,
      message: 'Are you sure you want to approve and publish this story?',
      onConfirm: () => performApprove(submission),
    });
  };

  const performApprove = async (submission, destination = 'posts') => {
    try {
      const submissionData = submission;

      let publishData;
      if (destination === 'posts') {
        publishData = {
          title: submissionData.title,
          content: submissionData.story,
          author: submissionData.name,
          imageUrl: submissionData.imageUrl,
          imagePath: submissionData.imagePath,
          status: 'published',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          slug: slugify(submissionData.title),
          tags: ['student-voice']
        };
      } else if (destination === 'spotlights') {
        publishData = {
          studentName: submissionData.name,
          content: submissionData.story,
          quote: submissionData.title, // Use title as quote
          major: submissionData.category || 'Student',
          imageUrl: submissionData.imageUrl,
          imagePath: submissionData.imagePath,
          status: 'published',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          slug: slugify(submissionData.name)
        };
      } else if (destination === 'events') {
        publishData = {
          title: submissionData.title,
          description: submissionData.story,
          date: new Date().toISOString(),
          location: 'PPSU Campus',
          imageUrl: submissionData.imageUrl,
          imagePath: submissionData.imagePath,
          status: 'published',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          slug: slugify(submissionData.title)
        };
      }

      await addDoc(collection(db, destination), publishData);

      const submissionDoc = doc(db, 'submissions', submission.id);
      await updateDoc(submissionDoc, {
        status: 'approved',
        publishedTo: destination,
        publishedAt: serverTimestamp()
      });

      await logActivity('Approve', `Approved Student Voice: "${submission.title}" to ${destination}`);
    } catch (error) {
      console.error("Error approving submission:", error);
    } finally {
      closeConfirmation();
    }
  }

  const handleRejectSubmission = (submission) => {
    setConfirmation({
      isOpen: true,
      message: 'Are you sure you want to reject this submission?',
      onConfirm: () => performReject(submission),
    });
  };

  const performReject = async (submission) => {
    try {
      const submissionDoc = doc(db, 'studentVoiceSubmissions', submission.id);
      await updateDoc(submissionDoc, { status: 'rejected' });
      await logActivity('Reject', `Rejected Student Voice: "${submission.title}"`);
    } catch (error) {
      console.error("Error rejecting submission:", error);
    } finally {
      closeConfirmation();
    }
  }

  // --- Render Functions ---

  const renderSidebar = () => (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-gray-800 text-white p-4 space-y-2 flex-col">
        <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
        <nav className="flex-1">
          {Object.keys(contentTypes).map(key => {
            const type = contentTypes[key];
            if (type.isExternal) {
              return (
                <button 
                  key={key} 
                  onClick={() => router.push(type.path)} 
                  className="w-full text-left px-4 py-2 rounded-md transition-colors hover:bg-gray-700"
                >
                  {type.name}
                </button>
              );
            }
            return (
              <button 
                key={key} 
                onClick={() => setCurrentView(key)} 
                className={`w-full text-left px-4 py-2 rounded-md transition-colors ${currentView === key ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              >
                {type.name}
              </button>
            );
          })}
        </nav>
        <div>
          <button onClick={async () => { await signOut(auth); router.push('/login'); }} className="w-full text-left px-4 py-2 rounded-md transition-colors bg-red-600 hover:bg-red-700">
            Logout
          </button>
        </div>
      </aside>
      {/* Mobile sidebar */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 w-72 max-w-[85%] bg-gray-800 text-white p-4 space-y-2 flex flex-col z-50 transform transition-transform md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <button onClick={() => setIsSidebarOpen(false)} aria-label="Close menu" className="px-2 py-1 bg-gray-700 rounded">Close</button>
        </div>
        <nav className="flex-1 overflow-y-auto">
          {Object.keys(contentTypes).map(key => {
            const type = contentTypes[key];
            if (type.isExternal) {
              return (
                <button 
                  key={key} 
                  onClick={() => { router.push(type.path); setIsSidebarOpen(false); }} 
                  className="w-full text-left px-4 py-2 rounded-md transition-colors hover:bg-gray-700"
                >
                  {type.name}
                </button>
              );
            }
            return (
              <button 
                key={key} 
                onClick={() => { setCurrentView(key); setIsSidebarOpen(false); }} 
                className={`w-full text-left px-4 py-2 rounded-md transition-colors ${currentView === key ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              >
                {type.name}
              </button>
            );
          })}
        </nav>
        <div>
          <button onClick={async () => { await signOut(auth); router.push('/login'); }} className="w-full text-left px-4 py-2 rounded-md transition-colors bg-red-600 hover:bg-red-700">
            Logout
          </button>
        </div>
      </aside>
    </>
  );

  const renderDashboard = () => (
    <div>
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Object.keys(contentTypes).filter(k => k !== 'dashboard').map(key => {
          const type = contentTypes[key];
          if (type.isExternal) {
            return (
              <button key={key} onClick={() => router.push(type.path)} className="text-left bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-gray-700">{type.name}</h3>
                <p className="text-sm text-gray-500 mt-2">⚽🏀 Manage live scores</p>
                <span className="inline-block mt-3 text-sm text-blue-600">Manage →</span>
              </button>
            );
          }
          if (!type.collectionName) return null;
          return (
            <button key={key} onClick={() => setCurrentView(key)} className="text-left bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold text-gray-700">{type.name}</h3>
              <p className="text-3xl font-bold mt-2">{counts[key] ?? 0}</p>
              <span className="inline-block mt-3 text-sm text-blue-600">Manage →</span>
            </button>
          );
        })}
      </div>

      <h3 className="text-2xl font-bold mb-4">Activity Log</h3>
      <div className="bg-white p-4 rounded-lg shadow overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {logs.slice(0, 10).map(log => (
            <li key={log.id} className="p-3">
              <span className={`font-bold ${log.action === 'Delete' || log.action === 'Reject' ? 'text-red-500' : 'text-green-500'}`}>{log.action}: </span>
              {log.details} by <span className="font-semibold text-blue-600">{log.user}</span> at
              <span className="text-gray-500 text-sm ml-2">{new Date(log.timestamp?.toDate()).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderContentTable = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">{currentConfig.name}</h2>
        <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors">
          Add New
        </button>
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title/Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {content.map(item => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{item.title || item.studentName || 'N/A'}</div></td>
                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{item.status || 'N/A'}</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.createdAt ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => openModal(item)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                  <button onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStudentVoiceReview = () => (
    <div>
      <h2 className="text-3xl font-bold mb-6">{currentConfig.name}</h2>
      <div className="space-y-4">
        {content.map(submission => (
          <div key={submission.id} className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">{submission.title}</h3>
                <p className="text-sm text-gray-600">By {submission.name} ({submission.email})</p>
                <p className="text-sm text-gray-500">Submitted on: {new Date(submission.createdAt?.toDate()).toLocaleString()}</p>
              </div>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'}`
              }>
                {submission.status || 'pending'}
              </span>
            </div>
            <p className="mt-4 text-gray-800 whitespace-pre-wrap">{submission.story}</p>
            {(!submission.status || submission.status === 'pending') && (
              <div className="mt-4 flex flex-col space-y-4">
                <div>
                  <label htmlFor={`destination-${submission.id}`} className="block text-sm font-medium text-gray-700 mb-1">Publish To</label>
                  <select
                    id={`destination-${submission.id}`}
                    defaultValue="posts"
                    onChange={(e) => submission.publishDestination = e.target.value}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="posts">Student Stories (Posts)</option>
                    <option value="spotlights">Student Spotlights</option>
                    <option value="events">Campus Events</option>
                  </select>
                </div>
                <button onClick={() => handleApproveSubmission(submission)} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">Approve & Publish</button>
                <button onClick={() => handleRejectSubmission(submission)} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">Reject</button>
              </div>
            )}
          </div>
        ))}
        {content.length === 0 && <p className="text-gray-500">No new submissions.</p>}
      </div>
    </div>
  );

  const renderModal = () => {
    const isMediaGallery = currentView === 'media_gallery';
    const selectedCategory = formState.category;

    const getFieldsForCategory = (category) => {
      if (!isMediaGallery) return currentConfig.fields;

      switch (category) {
        case 'highlight':
        case 'vlog':
        case 'podcast':
          return ['title', 'description', 'youtubeUrl'];
        case 'photo':
          return ['title', 'description'];
        default:
          return ['title', 'description'];
      }
    };

    const shouldShowImageUpload = () => {
      if (!isMediaGallery) return true;
      return selectedCategory === 'photo' || !selectedCategory;
    };

    // youtube field is derived from getFieldsForCategory

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-2xl font-bold mb-6">{editingItem ? 'Edit' : 'Add'} {currentConfig.name}</h3>
          <form onSubmit={handleFormSubmit}>
            <div className="space-y-4">
              {/* Category Selection for Media Gallery */}
              {isMediaGallery && (
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    id="category"
                    name="category"
                    value={formState.category || ''}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select Category</option>
                    <option value="highlight">Video Highlights</option>
                    <option value="photo">Photo Stories</option>
                    <option value="vlog">Vlogs</option>
                    <option value="podcast">Podcasts</option>
                  </select>
                </div>
              )}

              {/* Dynamic Fields Based on Category */}
              {(isMediaGallery ? getFieldsForCategory(selectedCategory) : currentConfig.fields)
                .filter(field => field !== 'category')
                .map(field => (
                  <div key={field}>
                    <label htmlFor={field} className="block text-sm font-medium text-gray-700 capitalize">
                      {field === 'youtubeUrl' ? 'YouTube URL' :
                        field === 'registerLink' ? 'Registration Link' :
                          field === 'stars' ? 'Star Rating (1-5)' :
                            field.replace(/([A-Z])/g, ' $1')}
                    </label>
                    {field === 'stars' ? (
                      <div className="mt-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFormState(prev => ({ ...prev, stars: star }))}
                              className={`text-2xl transition-colors ${(formState.stars || 4) >= star
                                ? 'text-yellow-400 hover:text-yellow-500'
                                : 'text-gray-300 hover:text-gray-400'
                                }`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500">
                          Selected: {formState.stars || 4} star{(formState.stars || 4) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ) : field.includes('content') || field.includes('description') || field.includes('quote') ? (
                      <textarea
                        id={field}
                        name={field}
                        value={formState[field] || ''}
                        onChange={handleInputChange}
                        rows="8"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    ) : (
                      <input
                        type={field.includes('date') ? 'date' :
                          field === 'registerLink' || field === 'youtubeUrl' ? 'url' : 'text'}
                        id={field}
                        name={field}
                        value={formState[field] || ''}
                        onChange={handleInputChange}
                        placeholder={field === 'registerLink' ? 'https://example.com/register' : ''}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    )}
                  </div>
                ))}

              {/* Image Upload - Show for Photo Stories or non-media gallery items */}
              {shouldShowImageUpload() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Featured Image</label>
                  <div className="mt-1 flex items-center space-x-6">
                    <div className="shrink-0">
                      {imagePreview ? (
                        <div className="h-24 w-24 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img className="h-24 w-24 object-cover rounded-md" src={imagePreview} alt="Current" />
                        </div>
                      ) : (
                        <div className="h-24 w-24 bg-gray-200 rounded-md flex items-center justify-center text-gray-400">Preview</div>
                      )}
                    </div>
                    <label className="block">
                      <span className="sr-only">Choose profile photo</span>
                      <input type="file" onChange={handleImageChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                <select id="status" name="status" value={formState.status || 'published'} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <button type="button" onClick={closeModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 disabled:bg-blue-300">
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // --- Main Render ---
  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center"><p className="text-xl">Loading Admin Panel...</p></div>;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        message={confirmation.message}
        onConfirm={confirmation.onConfirm}
        onCancel={closeConfirmation}
      />
      {renderSidebar()}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="md:hidden mb-4 flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(true)} className="px-3 py-2 rounded bg-gray-800 text-white">Menu</button>
          <div className="text-sm text-gray-600 font-semibold">{currentConfig?.name}</div>
        </div>
        {currentView === 'dashboard' && renderDashboard()}
        {currentView !== 'dashboard' && currentView !== 'student_voice' && currentConfig && renderContentTable()}
        {currentView === 'student_voice' && renderStudentVoiceReview()}
      </main>
      {isModalOpen && currentConfig && renderModal()}
    </div>
  );
}
