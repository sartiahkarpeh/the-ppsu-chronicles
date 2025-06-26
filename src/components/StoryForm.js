
'use client'

import { useState } from "react"

export default function StoryForm() {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle form submission logic here
        setSubmitted(true);
    }
    
    if (submitted) {
        return (
            <div className="text-center p-8 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-2xl font-bold text-green-800">Thank You!</h3>
                <p className="text-green-700 mt-2">Your story has been submitted for review. Our team will get back to you soon.</p>
            </div>
        )
    }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">Your Name</label>
          <input type="text" id="name" name="name" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">Email Address</label>
          <input type="email" id="email" name="email" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
        </div>
      </div>
       <div>
        <label htmlFor="title" className="block text-sm font-medium text-text-secondary mb-1">Story Title</label>
        <input type="text" id="title" name="title" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
      </div>
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-text-secondary mb-1">Category</label>
        <select id="category" name="category" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">
          <option>Personal Story</option>
          <option>Opinion Piece</option>
          <option>Creative Writing</option>
          <option>Academic Experience</option>
          <option>Event Coverage</option>
        </select>
      </div>
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-text-secondary mb-1">Your Story</label>
        <textarea id="content" name="content" rows="8" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"></textarea>
      </div>
      <div>
        <button type="submit" className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-600 transition-all transform hover:scale-105">
          Submit for Review
        </button>
      </div>
    </form>
  );
}
