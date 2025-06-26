import { posts } from '@/data/posts';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, User, Tag } from 'lucide-react';
import CommentSection from '@/components/CommentSection';

export async function generateStaticParams() {
  return posts.map(post => ({
    slug: post.slug,
  }));
}

export default function StoryPostPage({ params }) {
  const { slug } = params;
  const post = posts.find(p => p.slug === slug);

  if (!post) {
    notFound();
  }
  
  // A simple formatter for the article content
  const formatContent = (content) => {
    return content.split('\n').map((paragraph, index) => (
      <p key={index} className="mb-6 leading-relaxed">
        {paragraph}
      </p>
    ));
  };

  return (
    <div className="bg-white py-12 md:py-20">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        <article>
          <header className="mb-8 text-center">
            <Link href={`/stories?category=${post.category}`} className="text-primary font-semibold uppercase tracking-wide hover:underline">{post.category}</Link>
            <h1 className="text-3xl md:text-5xl font-extrabold text-text-primary my-4 leading-tight">{post.title}</h1>
            <div className="flex justify-center items-center space-x-6 text-text-secondary mt-4">
              <div className="flex items-center space-x-2">
                <User size={18} />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar size={18} />
                <span>{post.date}</span>
              </div>
            </div>
          </header>

          <figure className="my-8">
            <img 
              src={post.image || 'https://placehold.co/1200x600/A7C7E7/333333?text=Story+Image'} 
              alt={post.title} 
              className="w-full h-auto rounded-xl shadow-lg object-cover" 
            />
          </figure>

          <div className="prose lg:prose-xl max-w-none text-text-primary text-lg">
            {formatContent(post.content)}
          </div>
          
          <div className="mt-12 flex items-center space-x-2">
             <Tag size={20} className="text-text-secondary" />
             <span className="font-semibold text-text-secondary">Tags:</span>
             <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">{post.category}</span>
          </div>
        </article>

        <hr className="my-12" />

        <CommentSection postId={post.slug} />
      </div>
    </div>
  );
}

