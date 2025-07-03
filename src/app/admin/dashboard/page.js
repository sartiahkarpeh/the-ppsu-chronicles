'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db, storage, auth } from '../../../firebase/config'; // Adjust this path if needed
import {
  collection,
  getDocs,
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
  const [confirmation, setConfirmation] = useState({ isOpen: false, message: '', onConfirm: () => {} });
  
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
    const contentTypes = {
  dashboard: { name: 'Dashboard', collectionName: null, fields: [] },
  stories: { name: 'Student Stories', collectionName: 'posts', fields: ['title', 'author', 'content', 'tags', 'youtubeUrl'] },
  campus_news: { name: 'Campus News', collectionName: 'posts', fields: ['title', 'summary', 'content', 'tags'] },
  student_spotlights: { name: 'Student Spotlights', collectionName: 'spotlights', fields: ['studentName', 'major', 'quote', 'content'] },
  media_gallery: { name: 'Media Gallery', collectionName: 'media_videos', fields: ['title', 'description', 'youtubeUrl'] },
  campus_events: { name: 'Campus Events', collectionName: 'events', fields: ['title', 'date', 'location', 'description'] },
  student_voice: { name: 'Student Voice Submissions', collectionName: 'submissions', fields: [] },
};


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
      if(item.imageUrl) setImagePreview(item.imageUrl);
    } else {
      setEditingItem(null);
      const allFields = new Set();
      Object.values(contentTypes).forEach(ct => {
        if(ct.fields) ct.fields.forEach(field => allFields.add(field));
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
    setConfirmation({ isOpen: false, message: '', onConfirm: () => {} });
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

  const performApprove = async (submission) => {
     try {
        const { id, ...submissionData } = submission;
        const storyData = {
            title: submissionData.title,
            content: submissionData.story,
            author: submissionData.name,
            authorEmail: submissionData.email,
            status: 'published',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            slug: slugify(submissionData.title),
            tags: ['student-voice']
        };
        await addDoc(collection(db, 'stories'), storyData);
        
        const submissionDoc = doc(db, 'studentVoiceSubmissions', submission.id);
        await updateDoc(submissionDoc, { status: 'approved' });

        await logActivity('Approve', `Approved Student Voice: "${submission.title}"`);
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
    <aside className="w-64 bg-gray-800 text-white p-4 space-y-2 flex flex-col">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      <nav className="flex-1">
        {Object.keys(contentTypes).map(key => (
            <button key={key} onClick={() => setCurrentView(key)} className={`w-full text-left px-4 py-2 rounded-md transition-colors ${currentView === key ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
            {contentTypes[key].name}
            </button>
        ))}
      </nav>
      <div>
        <button onClick={async () => { await signOut(auth); router.push('/login'); }} className="w-full text-left px-4 py-2 rounded-md transition-colors bg-red-600 hover:bg-red-700">
            Logout
        </button>
      </div>
    </aside>
  );
  
  const renderDashboard = () => (
    <div>
        <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           {Object.keys(contentTypes).filter(k => k !== 'dashboard' && contentTypes[k].collectionName).map(key => (
               <div key={key} className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-gray-700">{contentTypes[key].name}</h3>
                    <p className="text-3xl font-bold mt-2">...</p> 
               </div>
           ))}
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
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        submission.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        submission.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`
                    }>
                        {submission.status || 'pending'}
                    </span>
                 </div>
                 <p className="mt-4 text-gray-800 whitespace-pre-wrap">{submission.story}</p>
                 {(!submission.status || submission.status === 'pending') && (
                     <div className="mt-4 flex space-x-4">
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
  
  const renderModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold mb-6">{editingItem ? 'Edit' : 'Add'} {currentConfig.name}</h3>
        <form onSubmit={handleFormSubmit}>
            <div className="space-y-4">
                {currentConfig.fields.map(field => (
                    <div key={field}>
                        <label htmlFor={field} className="block text-sm font-medium text-gray-700 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                        {field.includes('content') || field.includes('description') || field.includes('quote') ? (
                           <textarea id={field} name={field} value={formState[field] || ''} onChange={handleInputChange} rows="8" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
                        ) : (
                           <input type={field.includes('date') ? 'date' : 'text'} id={field} name={field} value={formState[field] || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"/>
                        )}
                    </div>
                ))}

                <div>
                    <label className="block text-sm font-medium text-gray-700">Featured Image</label>
                    <div className="mt-1 flex items-center space-x-6">
                        <div className="shrink-0">
                            {imagePreview ? (
                                <img className="h-24 w-24 object-cover rounded-md" src={imagePreview} alt="Current" />
                            ) : (
                                <div className="h-24 w-24 bg-gray-200 rounded-md flex items-center justify-center text-gray-400">Preview</div>
                            )}
                        </div>
                        <label className="block">
                            <span className="sr-only">Choose profile photo</span>
                            <input type="file" onChange={handleImageChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                        </label>
                    </div>
                </div>

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
      <main className="flex-1 p-8 overflow-y-auto">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView !== 'dashboard' && currentView !== 'student_voice' && currentConfig && renderContentTable()}
        {currentView === 'student_voice' && renderStudentVoiceReview()}
      </main>
      {isModalOpen && currentConfig && renderModal()}
    </div>
  );
}
