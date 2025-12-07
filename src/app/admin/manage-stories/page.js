'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import StoryForm from '@/components/StoryForm'; // We'll reuse your existing StoryForm

export default function ManageStories() {
  const [stories, setStories] = useState([]);
  const [editingStory, setEditingStory] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Fetch stories from Firestore
  const fetchStories = async () => {
    const storiesCollection = collection(db, 'posts');
    const storySnapshot = await getDocs(storiesCollection);
    const storiesList = storySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setStories(storiesList);
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleSaveStory = async (storyData) => {
    if (editingStory) {
      // Update existing story
      const storyRef = doc(db, 'posts', editingStory.id);
      await updateDoc(storyRef, storyData);
    } else {
      // Add new story
      const storiesCollection = collection(db, 'posts');
      await addDoc(storiesCollection, storyData);
    }
    setEditingStory(null);
    setIsFormVisible(false);
    fetchStories(); // Refresh the list
  };
  
  const handleEdit = (story) => {
      setEditingStory(story);
      setIsFormVisible(true);
  }

  const handleDelete = async (storyId) => {
      if (window.confirm("Are you sure you want to delete this story?")) {
          const storyRef = doc(db, 'posts', storyId);
          await deleteDoc(storyRef);
          fetchStories();
      }
  }
  
  const handleAddNew = () => {
      setEditingStory(null);
      setIsFormVisible(true);
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Manage Stories</h1>

      {!isFormVisible ? (
         <button onClick={handleAddNew} className="mb-6 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            Add New Story
         </button>
      ) : (
        <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{editingStory ? 'Edit Story' : 'Add New Story'}</h2>
            <StoryForm
                initialData={editingStory}
                onSave={handleSaveStory}
                onCancel={() => setIsFormVisible(false)}
            />
        </div>
      )}


      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stories.map(story => (
              <tr key={story.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{story.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{story.author}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(story)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                  <button onClick={() => handleDelete(story.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

