'use client'

import { useState } from "react"

export default function ContactForm() {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
    }
    
    if (submitted) {
        return (
            <div className="text-center p-8 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-2xl font-bold text-green-800">Message Sent!</h3>
                <p className="text-green-700 mt-2">Thank you for reaching out. We'll get back to you as soon as possible.</p>
            </div>
        )
    }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">Name</label>
          <input type="text" id="name" name="name" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">Email</label>
          <input type="email" id="email" name="email" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
        </div>
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-text-secondary mb-1">Subject</label>
        <input type="text" id="subject" name="subject" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-text-secondary mb-1">Message</label>
        <textarea id="message" name="message" rows="6" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"></textarea>
      </div>
      <div>
        <button type="submit" className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-600 transition-all transform hover:scale-105">
          Send Message
        </button>
      </div>
    </form>
  );
}

