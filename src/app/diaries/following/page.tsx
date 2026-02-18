'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, PenLine } from 'lucide-react';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import { getFollowedPosts } from '@/lib/diary/firebase';
import DiaryPostCard from '@/components/diary/DiaryPostCard';
import type { DiaryPost } from '@/types/diary';

export default function FollowingPage() {
    const router = useRouter();
    const { user, profile, loading: authLoading } = useDiaryAuth();
    const [posts, setPosts] = useState<DiaryPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) router.push('/diaries/login');
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;
        getFollowedPosts(user.uid, 30)
            .then(setPosts)
            .finally(() => setLoading(false));
    }, [user]);

    return (
        <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
                <h1 className="text-2xl font-bold text-[#1a1a1a] mb-1" style={{ fontFamily: 'var(--font-lora), serif' }}>
                    Following
                </h1>
                <p className="text-[#6b6b6b] mb-8">Latest posts from writers you follow</p>

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
                ) : posts.length === 0 ? (
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
                )}
            </div>
        </div>
    );
}
