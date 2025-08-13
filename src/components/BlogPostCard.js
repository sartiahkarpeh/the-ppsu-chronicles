import Link from 'next/link';
import { ArrowRight, Calendar, User } from 'lucide-react';

export default function BlogPostCard({ post }) {
  return (
    <div className="bg-card-bg rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <Link href={`/stories/${post.slug || post.id}`} className="block">
        <img 
          src={post.image || 'https://placehold.co/400x250/A7C7E7/333333?text=Story'} 
          alt={post.title} 
          className="w-full h-48 object-cover" 
        />
      </Link>
      <div className="p-6 flex flex-col flex-grow">
        <div className="mb-4">
          <span className="text-sm font-semibold text-primary uppercase">{post.category}</span>
        </div>
        <h3 className="font-bold text-xl text-text-primary mb-2 flex-grow">
          <Link href={`/stories/${post.slug || post.id}`} className="hover:underline">{post.title}</Link>
        </h3>
        <p className="text-text-secondary text-sm mb-4 line-clamp-3">
          {post.content.substring(0, 100)}...
        </p>
        <div className="text-xs text-text-secondary flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
           <div className='flex flex-col gap-2'>
              <div className="flex items-center space-x-2">
                <User size={14} />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar size={14} />
                <span>{post.date}</span>
              </div>
           </div>
           <Link href={`/stories/${post.slug || post.id}`} className="flex items-center text-primary font-semibold hover:gap-2 transition-all">
                Read
                <ArrowRight size={16} className="ml-1" />
           </Link>
        </div>
      </div>
    </div>
  );
}
