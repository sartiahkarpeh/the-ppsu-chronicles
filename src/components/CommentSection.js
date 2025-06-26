// This is a placeholder component for a comment section.
// In a real application, you would integrate a service like Disqus, or build a backend.

export default function CommentSection({ postId }) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Comments</h2>
      <div className="bg-gray-100 p-6 rounded-lg">
        {/* New Comment Form */}
        <div className="mb-6">
          <textarea 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" 
            rows="4" 
            placeholder="Write a comment..."
          ></textarea>
          <button className="mt-3 bg-primary text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            Post Comment
          </button>
        </div>

        {/* Existing Comments */}
        <div className="space-y-6">
          <div className="flex space-x-4">
            <img src="https://placehold.co/48x48/E0E0E0/333333?text=A" alt="Avatar" className="w-12 h-12 rounded-full" />
            <div>
              <p className="font-bold">Alex Johnson</p>
              <p className="text-xs text-text-secondary mb-1">2 days ago</p>
              <p className="text-text-primary">This is such an insightful article! Really enjoyed reading it.</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <img src="https://placehold.co/48x48/F5A623/FFFFFF?text=B" alt="Avatar" className="w-12 h-12 rounded-full" />
            <div>
              <p className="font-bold">Bella Chen</p>
              <p className="text-xs text-text-secondary mb-1">1 day ago</p>
              <p className="text-text-primary">Great perspective. I have a similar story I'd love to share sometime!</p>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-gray-500 mt-8">Comment section is for demonstration purposes.</p>
      </div>
    </section>
  );
}

