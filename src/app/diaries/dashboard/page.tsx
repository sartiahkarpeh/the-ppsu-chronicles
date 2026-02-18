'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, Heart, Users, FileText, Edit, Trash2, Plus, CheckCircle2, User2, PenLine, Star } from 'lucide-react';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import { getPostsByAuthor, deletePost, getWriterSubscribers } from '@/lib/diary/firebase';
import { formatDate, formatCount, formatRelativeDate } from '@/lib/diary/utils';
import type { DiaryPost, DiarySubscription } from '@/types/diary';
import toast from 'react-hot-toast';

export default function DashboardPage() {
    const router = useRouter();
    const { user, profile, isWriter, loading: authLoading } = useDiaryAuth();
    const [published, setPublished] = useState<DiaryPost[]>([]);
    const [drafts, setDrafts] = useState<DiaryPost[]>([]);
    const [subscribers, setSubscribers] = useState<DiarySubscription[]>([]);
    const [activeTab, setActiveTab] = useState<'published' | 'drafts' | 'subscribers'>('published');
    const [loading, setLoading] = useState(true);

    // Dashboard stats
    const totalViews = published.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
    const totalLikes = published.reduce((sum, p) => sum + (p.likesCount || 0), 0);

    useEffect(() => {
        if (!authLoading && !user) router.push('/diaries/login');
        if (!authLoading && user && !profile) router.push('/diaries/onboarding');
    }, [authLoading, user, profile, router]);

    useEffect(() => {
        if (!user) return;
        loadDashboard();
    }, [user]);

    const loadDashboard = async () => {
        if (!user) return;
        try {
            const [pub, dft, subs] = await Promise.all([
                getPostsByAuthor(user.uid, 'published'),
                getPostsByAuthor(user.uid, 'draft'),
                getWriterSubscribers(user.uid),
            ]);
            setPublished(pub);
            setDrafts(dft);
            setSubscribers(subs);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        }
        setLoading(false);
    };

    const handleDelete = async (postId: string, isDraft: boolean) => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        try {
            await deletePost(postId);
            if (isDraft) setDrafts(prev => prev.filter(p => p.postId !== postId));
            else setPublished(prev => prev.filter(p => p.postId !== postId));
            toast.success('Post deleted');
        } catch { toast.error('Failed to delete'); }
    };

    // Onboarding checklist for new writers
    const checklist = [
        { done: !!profile?.bio, label: 'Complete your profile' },
        { done: published.length > 0, label: 'Write your first post' },
        { done: subscribers.length > 0, label: 'Get your first subscriber' },
        { done: totalLikes > 0, label: 'Get your first like' },
    ];
    const showChecklist = isWriter && checklist.some(c => !c.done);

    if (authLoading || loading) {
        return <div className="min-h-screen bg-white flex items-center justify-center text-[#6b6b6b]">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-[#fafafa]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-[#1a1a1a]">Dashboard</h1>
                        <p className="text-xs sm:text-sm text-[#6b6b6b]">Manage your diary posts</p>
                    </div>
                    <Link
                        href="/diaries/write"
                        className="flex items-center gap-1.5 bg-[#FF6719] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold hover:bg-[#e55b14] transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Post</span>
                        <span className="sm:hidden">New</span>
                    </Link>
                </div>

                {/* Onboarding Checklist */}
                {showChecklist && (
                    <div className="bg-white border border-[#e5e5e5] rounded-xl p-5 mb-6">
                        <h3 className="flex items-center gap-2 font-bold text-[#1a1a1a] mb-3">
                            <Star className="w-5 h-5 text-[#FF6719]" />
                            Getting Started
                        </h3>
                        <div className="space-y-2">
                            {checklist.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${item.done ? 'bg-[#FF6719] border-[#FF6719]' : 'border-[#e5e5e5]'}`}>
                                        {item.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className={`text-sm ${item.done ? 'text-[#6b6b6b] line-through' : 'text-[#1a1a1a]'}`}>
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                        { icon: Eye, label: 'Total Views', value: formatCount(totalViews) },
                        { icon: Users, label: 'Subscribers', value: formatCount(subscribers.length) },
                        { icon: Heart, label: 'Total Likes', value: formatCount(totalLikes) },
                        { icon: FileText, label: 'Posts', value: String(published.length) },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white border border-[#e5e5e5] rounded-xl p-4">
                            <stat.icon className="w-5 h-5 text-[#FF6719] mb-2" />
                            <p className="text-2xl font-bold text-[#1a1a1a]">{stat.value}</p>
                            <p className="text-xs text-[#6b6b6b]">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white border border-[#e5e5e5] rounded-full p-1 mb-6 overflow-x-auto no-scrollbar">
                    {(['published', 'drafts', 'subscribers'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${activeTab === tab
                                ? 'bg-[#FF6719] text-white'
                                : 'text-[#6b6b6b] hover:text-[#1a1a1a]'
                                }`}
                        >
                            {tab} ({tab === 'published' ? published.length : tab === 'drafts' ? drafts.length : subscribers.length})
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
                    {activeTab === 'published' && (
                        published.length === 0 ? (
                            <div className="text-center py-12 text-[#6b6b6b]">
                                <PenLine className="w-8 h-8 mx-auto mb-3 text-[#e5e5e5]" />
                                <p>No published posts yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#e5e5e5]">
                                {published.map(post => (
                                    <div key={post.postId} className="flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4">
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/diaries/${post.postId}`} className="text-sm sm:text-base font-semibold text-[#1a1a1a] hover:text-[#FF6719] line-clamp-1">
                                                {post.title}
                                            </Link>
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-[#6b6b6b] mt-1">
                                                <span>{formatDate(post.publishedAt)}</span>
                                                <span>{formatCount(post.viewsCount || 0)} views</span>
                                                <span>{formatCount(post.likesCount || 0)} likes</span>
                                                <span className="hidden sm:inline">{formatCount(post.commentsCount || 0)} comments</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                            <Link href={`/diaries/write/${post.postId}`} className="p-2 text-[#6b6b6b] hover:text-[#FF6719] hover:bg-[#fff8f5] rounded-lg">
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                            <button onClick={() => handleDelete(post.postId, false)} className="p-2 text-[#6b6b6b] hover:text-red-500 hover:bg-red-50 rounded-lg">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {activeTab === 'drafts' && (
                        drafts.length === 0 ? (
                            <div className="text-center py-12 text-[#6b6b6b]">
                                <p>No drafts</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#e5e5e5]">
                                {drafts.map(post => (
                                    <div key={post.postId} className="flex items-center gap-4 px-5 py-4">
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/diaries/write/${post.postId}`} className="font-semibold text-[#1a1a1a] hover:text-[#FF6719] line-clamp-1">
                                                {post.title || 'Untitled'}
                                            </Link>
                                            <p className="text-xs text-[#6b6b6b] mt-1">Last edited {formatRelativeDate(post.updatedAt)}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Link href={`/diaries/write/${post.postId}`} className="px-3 py-1.5 bg-[#FF6719] text-white rounded-full text-xs font-medium hover:bg-[#e55b14]">
                                                Continue
                                            </Link>
                                            <button onClick={() => handleDelete(post.postId, true)} className="p-2 text-[#6b6b6b] hover:text-red-500 hover:bg-red-50 rounded-lg">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {activeTab === 'subscribers' && (
                        subscribers.length === 0 ? (
                            <div className="text-center py-12 text-[#6b6b6b]">
                                <p>No subscribers yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-[#fafafa]">
                                        <tr>
                                            <th className="text-left px-5 py-3 font-medium text-[#6b6b6b]">Name</th>
                                            <th className="text-left px-5 py-3 font-medium text-[#6b6b6b]">Email</th>
                                            <th className="text-left px-5 py-3 font-medium text-[#6b6b6b]">Subscribed</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#e5e5e5]">
                                        {subscribers.map(sub => (
                                            <tr key={sub.id}>
                                                <td className="px-5 py-3 text-[#1a1a1a]">{sub.subscriberName}</td>
                                                <td className="px-5 py-3 text-[#6b6b6b]">{sub.subscriberEmail}</td>
                                                <td className="px-5 py-3 text-[#6b6b6b]">{formatDate(sub.subscribedAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
