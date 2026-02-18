'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PenLine, TrendingUp, Sparkles } from 'lucide-react';
import DiaryPostCard from '@/components/diary/DiaryPostCard';
import WriterCard from '@/components/diary/WriterCard';
import TagFilter from '@/components/diary/TagFilter';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import { getPublishedPosts, getTrendingPosts, getWriters, getPostsByTag } from '@/lib/diary/firebase';
import type { DiaryPost, DiaryProfile } from '@/types/diary';
import { DIARY_TAGS } from '@/types/diary';

export default function DiariesPage() {
    const [posts, setPosts] = useState<DiaryPost[]>([]);
    const [trendingPosts, setTrendingPosts] = useState<DiaryPost[]>([]);
    const [writers, setWriters] = useState<DiaryProfile[]>([]);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { isWriter } = useDiaryAuth();

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedTag) {
            getPostsByTag(selectedTag).then(setPosts);
        } else {
            getPublishedPosts(20).then(res => setPosts(res.posts));
        }
    }, [selectedTag]);

    const loadData = async () => {
        try {
            const [postsRes, trending, writersList] = await Promise.all([
                getPublishedPosts(20),
                getTrendingPosts(5),
                getWriters(5),
            ]);
            setPosts(postsRes.posts);
            setTrendingPosts(trending);
            setWriters(writersList);
        } catch (err) {
            console.error('Failed to load diary data:', err);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            {/* Hero Section */}
            <section className="border-b border-[#e5e5e5]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
                    <h1
                        className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#1a1a1a] mb-3 sm:mb-4 leading-tight"
                        style={{ fontFamily: 'var(--font-lora), serif' }}
                    >
                        Student Diaries
                    </h1>
                    <p className="text-base sm:text-lg lg:text-xl text-[#6b6b6b] max-w-xl mx-auto mb-6 sm:mb-8">
                        Real voices from P.&nbsp;P.&nbsp;Savani University
                    </p>
                    {isWriter && (
                        <Link
                            href="/diaries/write"
                            className="inline-flex items-center gap-2 bg-[#FF6719] text-white px-8 py-3 rounded-full text-base font-semibold hover:bg-[#e55b14] transition-colors shadow-lg shadow-[#FF6719]/20"
                        >
                            <PenLine className="w-5 h-5" />
                            Start Writing
                        </Link>
                    )}
                </div>
            </section>

            {/* Tag Filter */}
            <section className="border-b border-[#e5e5e5]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 overflow-x-auto">
                    <TagFilter selectedTag={selectedTag} onSelect={setSelectedTag} />
                </div>
            </section>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex gap-8">
                    {/* Left: Post Feed */}
                    <div className="flex-1 min-w-0">
                        {loading ? (
                            <div className="space-y-8">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="animate-pulse">
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <div className="h-3 bg-[#f0f0f0] rounded w-1/4 mb-3" />
                                                <div className="h-5 bg-[#f0f0f0] rounded w-3/4 mb-2" />
                                                <div className="h-4 bg-[#f0f0f0] rounded w-full mb-3" />
                                                <div className="h-3 bg-[#f0f0f0] rounded w-1/3" />
                                            </div>
                                            <div className="w-28 h-28 bg-[#f0f0f0] rounded-lg shrink-0" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="text-center py-16">
                                <Sparkles className="w-12 h-12 text-[#e5e5e5] mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">
                                    {selectedTag ? `No posts in "${selectedTag}" yet` : 'No posts yet'}
                                </h3>
                                <p className="text-[#6b6b6b] mb-6">Be the first to share your story!</p>
                                {isWriter && (
                                    <Link
                                        href="/diaries/write"
                                        className="inline-flex items-center gap-2 bg-[#FF6719] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#e55b14]"
                                    >
                                        <PenLine className="w-4 h-4" />
                                        Write a Post
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div>
                                {posts.map(post => (
                                    <DiaryPostCard key={post.postId} post={post} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar (desktop) */}
                    <aside className="hidden lg:block w-80 shrink-0">
                        {/* Writers to Follow */}
                        {writers.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wide mb-3">
                                    Writers to Follow
                                </h3>
                                <div className="space-y-1">
                                    {writers.map(w => (
                                        <WriterCard key={w.userId} writer={w} compact />
                                    ))}
                                </div>
                                <Link
                                    href="/diaries/writers"
                                    className="block text-sm text-[#FF6719] font-medium mt-3 hover:underline"
                                >
                                    See all writers →
                                </Link>
                            </div>
                        )}

                        {/* Trending Posts */}
                        {trendingPosts.length > 0 && (
                            <div className="mb-8">
                                <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#1a1a1a] uppercase tracking-wide mb-3">
                                    <TrendingUp className="w-4 h-4 text-[#FF6719]" />
                                    Trending
                                </h3>
                                <div className="space-y-3">
                                    {trendingPosts.map((post, idx) => (
                                        <Link
                                            key={post.postId}
                                            href={`/diaries/${post.postId}`}
                                            className="flex gap-3 group"
                                        >
                                            <span className="text-2xl font-bold text-[#e5e5e5] leading-none">
                                                {String(idx + 1).padStart(2, '0')}
                                            </span>
                                            <div>
                                                <p className="text-xs text-[#6b6b6b]">{post.authorName}</p>
                                                <p className="text-sm font-semibold text-[#1a1a1a] leading-snug group-hover:text-[#FF6719] transition-colors line-clamp-2">
                                                    {post.title}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trending Tags */}
                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wide mb-3">
                                Trending Topics
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {DIARY_TAGS.slice(0, 8).map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setSelectedTag(tag)}
                                        className="px-3 py-1 bg-[#f5f5f5] text-[#6b6b6b] text-sm rounded-full hover:bg-[#e5e5e5] transition-colors"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* About */}
                        <div className="bg-[#fafafa] rounded-xl p-5">
                            <h3 className="font-bold text-[#1a1a1a] mb-2">About Student Diaries</h3>
                            <p className="text-sm text-[#6b6b6b] leading-relaxed">
                                A platform for P.&nbsp;P.&nbsp;Savani University students to share their stories,
                                thoughts, and creative works. Write, read, and connect with fellow students.
                            </p>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
