// src/components/StoryForm.js
'use client';
import { useState, useEffect } from 'react';

// This component is now more flexible. It takes initialData, onSave, and onCancel props.
const StoryForm = ({ initialData, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  // Add other fields as necessary, e.g., image URL, category etc.

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setContent(initialData.content || '');
      setAuthor(initialData.author || '');
    } else {
        // Reset form if there is no initial data
        setTitle('');
        setContent('');
        setAuthor('');
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ title, content, author });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="author" className="block text-sm font-medium text-gray-700">Author</label>
        <input
          type="text"
          id="author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
        <textarea
          id="content"
          rows="10"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Save Story
        </button>
      </div>
    </form>
  );
};

export default StoryForm;

