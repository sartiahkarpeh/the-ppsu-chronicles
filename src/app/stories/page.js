'use client';
import { useState } from 'react';
import BlogPostCard from '@/components/BlogPostCard';
import { posts } from '@/data/posts';
import { BookOpen } from 'lucide-react';

const categories = ['All', 'Personal', 'Opinion', 'Creative Writing', 'Academics'];

export default function StoriesPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredPosts = activeCategory === 'All' 
    ? posts 
    : posts.filter(post => post.category === activeCategory);

  return (
    <div className="container mx-auto px-6 py-12 md:py-20">
      <header className="text-center mb-12">
        <BookOpen className="mx-auto text-primary h-16 w-16 mb-4" />
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary">Stories & Blogs</h1>
        <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
          Discover personal stories, insightful opinions, and creative expressions from our student community.
        </p>
      </header>

      {/* Category Filters */}
      <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-12">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 text-sm md:text-base font-semibold rounded-full transition-colors ${
              activeCategory === category
                ? 'bg-primary text-white shadow'
                : 'bg-white text-text-primary hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPosts.length > 0 ? (
          filteredPosts.map(post => <BlogPostCard key={post.slug} post={post} />)
        ) : (
          <p className="text-center text-text-secondary col-span-full">No posts in this category yet.</p>
        )}
      </div>
    </div>
  );
}

