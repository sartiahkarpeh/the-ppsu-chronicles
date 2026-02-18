'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import { getFollowingIds, getProfile, getFollowedPosts } from '@/lib/diary/firebase';
import DiaryPostCard from '@/components/diary/DiaryPostCard';
import WriterCard from '@/components/diary/WriterCard';
import type { DiaryPost, DiaryProfile } from '@/types/diary';

export default function FollowingPage() {
    const router = useRouter();
    const { user, profile, loading: authLoading } = useDiaryAuth();
    const [posts, setPosts] = useState<DiaryPost[]>([]);
    const [followedWriters, setFollowedWriters] = useState<DiaryProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'feed' | 'writers'>('feed');

    useEffect(() => {
        if (!authLoading && !user) router.push('/diaries/login');
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                // Get following IDs
                const followingIds = await getFollowingIds(user.uid);

                // Load followed writers' profiles
                const writerProfiles = await Promise.all(
                    followingIds.map(id => getProfile(id))
                );
                setFollowedWriters(
                    writerProfiles.filter((p): p is DiaryProfile => p !== null)
                );

                // Load posts from followed writers
                const followedPosts = await getFollowedPosts(user.uid, 30);
                setPosts(followedPosts);
            } catch (err) {
                console.error('Failed to load following data:', err);
            }
            setLoading(false);
        };

        loadData();
    }, [user]);

    return (
        <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
                <h1 className="text-2xl font-bold text-[#1a1a1a] mb-1" style={{ fontFamily: 'var(--font-lora), serif' }}>
                    Following
                </h1>
                <p className="text-[#6b6b6b] mb-6">Writers and posts you follow</p>

                {/* Tabs */}
                <div className="flex gap-1 bg-[#f5f5f5] rounded-lg p-1 mb-8">
                    <button
                        onClick={() => setActiveTab('feed')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'feed'
                                ? 'bg-white text-[#1a1a1a] shadow-sm'
                                : 'text-[#6b6b6b] hover:text-[#1a1a1a]'
                            }`}
                    >
                        Feed ({posts.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('writers')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'writers'
                                ? 'bg-white text-[#1a1a1a] shadow-sm'
                                : 'text-[#6b6b6b] hover:text-[#1a1a1a]'
                            }`}
                    >
                        Writers ({followedWriters.length})
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-8">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="h-3 bg-[#f0f0f0] rounded w-1/4 mb-3" />
                                <div className="h-5 bg-[#f0f0f0] rounded w-3/4 mb-2" />
                                <div className="h-4 bg-[#f0f0f0] rounded w-full" />
                            </div>
                        ))}
                    </div>
                ) : activeTab === 'feed' ? (
                    posts.length === 0 ? (
                        <div className="text-center py-16">
                            <Users className="w-12 h-12 text-[#e5e5e5] mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">No posts yet</h3>
                            <p className="text-[#6b6b6b] mb-6">Follow writers to see their latest posts here.</p>
                            <Link href="/diaries/writers" className="inline-flex items-center gap-2 bg-[#FF6719] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#e55b14]">
                                Discover Writers
                            </Link>
                        </div>
                    ) : (
                        posts.map(post => <DiaryPostCard key={post.postId} post={post} />)
                    )
                ) : (
                    followedWriters.length === 0 ? (
                        <div className="text-center py-16">
                            <Users className="w-12 h-12 text-[#e5e5e5] mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">Not following anyone yet</h3>
                            <p className="text-[#6b6b6b] mb-6">Discover talented student writers and follow them.</p>
                            <Link href="/diaries/writers" className="inline-flex items-center gap-2 bg-[#FF6719] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#e55b14]">
                                Discover Writers
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {followedWriters.map(writer => (
                                <WriterCard key={writer.userId} writer={writer} />
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
