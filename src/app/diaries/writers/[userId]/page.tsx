'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Calendar } from 'lucide-react';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import {
    getProfile, getPostsByAuthor, isFollowing, followWriter,
    unfollowWriter,
} from '@/lib/diary/firebase';
import { formatDate, formatCount } from '@/lib/diary/utils';
import type { DiaryProfile, DiaryPost } from '@/types/diary';
import DiaryPostCard from '@/components/diary/DiaryPostCard';
import SubscribeBox from '@/components/diary/SubscribeBox';
import AuthPromptModal from '@/components/diary/AuthPromptModal';
import toast from 'react-hot-toast';

export default function WriterProfilePage() {
    const { userId } = useParams<{ userId: string }>();
    const { user } = useDiaryAuth();
    const [writer, setWriter] = useState<DiaryProfile | null>(null);
    const [posts, setPosts] = useState<DiaryPost[]>([]);
    const [following, setFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);

    useEffect(() => {
        if (!userId) return;
        loadWriter();
    }, [userId]);

    useEffect(() => {
        if (user && writer && user.uid !== writer.userId) {
            isFollowing(user.uid, writer.userId).then(setFollowing);
        }
    }, [user, writer]);

    const loadWriter = async () => {
        try {
            const [profileData, writerPosts] = await Promise.all([
                getProfile(userId),
                getPostsByAuthor(userId, 'published'),
            ]);
            setWriter(profileData);
            setPosts(writerPosts);
        } catch (err) {
            console.error('Failed to load writer:', err);
        }
        setLoading(false);
    };

    const handleFollow = async () => {
        if (!user) { setShowAuthModal(true); return; }
        if (!writer) return;
        setFollowLoading(true);
        try {
            if (following) {
                await unfollowWriter(user.uid, writer.userId);
                setFollowing(false);
                toast.success(`Unfollowed ${writer.displayName}`);
            } else {
                await followWriter(user.uid, writer.userId);
                setFollowing(true);
                toast.success(`Following ${writer.displayName}!`);
            }
        } catch { toast.error('Something went wrong'); }
        setFollowLoading(false);
    };

    if (loading) {
        return <div className="min-h-screen bg-white flex items-center justify-center text-[#6b6b6b]">Loading...</div>;
    }

    if (!writer) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold text-[#1a1a1a]">Writer not found</h1>
                <Link href="/diaries/writers" className="text-[#FF6719] hover:underline">← Browse writers</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            {/* Profile Header */}
            <div className="bg-gradient-to-b from-[#fff8f5] to-white border-b border-[#e5e5e5]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-center">
                    {writer.avatar ? (
                        <img src={writer.avatar} alt={writer.displayName} className="w-20 h-20 rounded-full object-cover mx-auto mb-4 ring-4 ring-white shadow-lg" />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-[#FF6719] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 ring-4 ring-white shadow-lg">
                            {writer.displayName?.charAt(0)?.toUpperCase()}
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <h1 className="text-2xl font-bold text-[#1a1a1a]">{writer.displayName}</h1>
                        {writer.isApproved && <CheckCircle className="w-5 h-5 text-[#FF6719]" />}
                    </div>

                    <p className="text-sm text-[#6b6b6b] mb-2">{writer.program} · {writer.year}</p>
                    {writer.bio && <p className="text-[#6b6b6b] max-w-md mx-auto mb-4">{writer.bio}</p>}

                    <div className="flex items-center justify-center gap-6 text-sm text-[#6b6b6b] mb-6">
                        <span><strong className="text-[#1a1a1a]">{formatCount(writer.followersCount || 0)}</strong> followers</span>
                        <span><strong className="text-[#1a1a1a]">{formatCount(writer.postsCount || 0)}</strong> posts</span>
                    </div>

                    {user && user.uid !== writer.userId && (
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={handleFollow}
                                disabled={followLoading}
                                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-colors ${following
                                    ? 'bg-[#f5f5f5] text-[#6b6b6b] hover:bg-[#e5e5e5] border border-[#e5e5e5]'
                                    : 'bg-[#FF6719] text-white hover:bg-[#e55b14]'
                                    }`}
                            >
                                {following ? 'Following' : 'Follow'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-[#e5e5e5]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 flex gap-6">
                    {(['posts', 'about'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab
                                ? 'border-[#FF6719] text-[#1a1a1a]'
                                : 'border-transparent text-[#6b6b6b] hover:text-[#1a1a1a]'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
                {activeTab === 'posts' ? (
                    posts.length === 0 ? (
                        <div className="text-center py-12 text-[#6b6b6b]">
                            No published posts yet.
                        </div>
                    ) : (
                        posts.map(post => (
                            <DiaryPostCard key={post.postId} post={post} showAuthor={false} />
                        ))
                    )
                ) : (
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-bold text-[#1a1a1a] mb-2">About</h3>
                            <p className="text-[#6b6b6b] leading-relaxed">{writer.bio || 'No bio provided.'}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#6b6b6b]">
                            <Calendar className="w-4 h-4" />
                            <span>Joined {formatDate(writer.createdAt)}</span>
                        </div>

                        {/* Subscribe */}
                        <div className="mt-8">
                            <SubscribeBox writerId={writer.userId} writerName={writer.displayName} />
                        </div>
                    </div>
                )}
            </div>

            {/* Auth Prompt Modal */}
            <AuthPromptModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                action="follow"
            />
        </div>
    );
}
