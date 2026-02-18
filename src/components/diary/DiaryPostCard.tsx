'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, MessageCircle, Clock, BookmarkPlus } from 'lucide-react';
import { formatRelativeDate, formatCount } from '@/lib/diary/utils';
import type { DiaryPost } from '@/types/diary';

interface Props {
    post: DiaryPost;
    showAuthor?: boolean;
}

export default function DiaryPostCard({ post, showAuthor = true }: Props) {
    return (
        <article className="group border-b border-[#e5e5e5] py-6 first:pt-0 last:border-b-0">
            <div className="flex gap-4 sm:gap-6">
                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Author info */}
                    {showAuthor && (
                        <div className="flex items-center gap-2 mb-2">
                            <Link href={`/diaries/writers/${post.authorId}`} className="flex items-center gap-2">
                                {post.authorAvatar ? (
                                    <img
                                        src={post.authorAvatar}
                                        alt={post.authorName}
                                        className="w-6 h-6 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-[#FF6719] flex items-center justify-center text-white text-xs font-bold">
                                        {post.authorName?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}
                                <span className="text-sm font-medium text-[#1a1a1a] hover:underline">
                                    {post.authorName}
                                </span>
                            </Link>
                            <span className="text-xs text-[#6b6b6b]">·</span>
                            <span className="text-xs text-[#6b6b6b]">
                                {formatRelativeDate(post.publishedAt)}
                            </span>
                        </div>
                    )}

                    {/* Title & Subtitle */}
                    <Link href={`/diaries/${post.postId}`} className="block">
                        <h3 className="text-lg sm:text-xl font-bold text-[#1a1a1a] leading-tight group-hover:text-[#FF6719] transition-colors line-clamp-2">
                            {post.title}
                        </h3>
                        {post.subtitle && (
                            <p className="mt-1 text-sm sm:text-[15px] text-[#6b6b6b] line-clamp-2 leading-relaxed">
                                {post.subtitle}
                            </p>
                        )}
                    </Link>

                    {/* Tags */}
                    {post.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {post.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="px-2 py-0.5 bg-[#f5f5f5] text-[#6b6b6b] text-xs rounded-full"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 text-[#6b6b6b]">
                        <span className="flex items-center gap-1 text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            {post.readTime} min read
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                            <Heart className="w-3.5 h-3.5" />
                            {formatCount(post.likesCount || 0)}
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {formatCount(post.commentsCount || 0)}
                        </span>
                    </div>
                </div>

                {/* Cover Image */}
                {post.coverImage && (
                    <Link href={`/diaries/${post.postId}`} className="shrink-0">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden">
                            <img
                                src={post.coverImage}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                    </Link>
                )}
            </div>
        </article>
    );
}
