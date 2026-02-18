'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User2, Edit, Camera, BookOpen, Users, Heart, FileText, Save, X, ArrowLeft } from 'lucide-react';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import { updateProfile, getPostsByAuthor, uploadDiaryImage } from '@/lib/diary/firebase';
import { formatCount } from '@/lib/diary/utils';
import type { DiaryPost } from '@/types/diary';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const router = useRouter();
    const { user, profile, loading: authLoading, refreshProfile, isWriter } = useDiaryAuth();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [publishedPosts, setPublishedPosts] = useState<DiaryPost[]>([]);
    const [editForm, setEditForm] = useState({
        displayName: '',
        bio: '',
        program: '',
        year: '',
    });

    useEffect(() => {
        if (!authLoading && !user) router.push('/diaries/login');
        if (!authLoading && user && !profile) router.push('/diaries/onboarding');
    }, [authLoading, user, profile, router]);

    useEffect(() => {
        if (profile) {
            setEditForm({
                displayName: profile.displayName,
                bio: profile.bio || '',
                program: profile.program || '',
                year: profile.year || '',
            });
        }
    }, [profile]);

    useEffect(() => {
        if (!user) return;
        getPostsByAuthor(user.uid, 'published').then(setPublishedPosts).catch(() => { });
    }, [user]);

    const totalViews = publishedPosts.reduce((s, p) => s + (p.viewsCount || 0), 0);
    const totalLikes = publishedPosts.reduce((s, p) => s + (p.likesCount || 0), 0);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        const toastId = toast.loading('Uploading photo...');
        try {
            const url = await uploadDiaryImage(file, 'avatars');
            await updateProfile(user.uid, { avatar: url });
            await refreshProfile();
            toast.success('Photo updated!', { id: toastId });
        } catch {
            toast.error('Upload failed', { id: toastId });
        }
    };

    const handleSave = async () => {
        if (!user || !editForm.displayName.trim()) return;
        setSaving(true);
        try {
            await updateProfile(user.uid, {
                displayName: editForm.displayName.trim(),
                bio: editForm.bio.trim(),
                program: editForm.program.trim(),
                year: editForm.year.trim(),
            });
            await refreshProfile();
            setEditing(false);
            toast.success('Profile updated!');
        } catch {
            toast.error('Failed to update profile');
        }
        setSaving(false);
    };

    if (authLoading || !profile) {
        return <div className="min-h-screen bg-white flex items-center justify-center text-[#6b6b6b]">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-[#fafafa]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
                {/* Back Button */}
                <button onClick={() => router.back()} className="flex items-center gap-1 text-[#6b6b6b] hover:text-[#1a1a1a] text-sm mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>

                {/* Profile Card */}
                <div className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden">
                    {/* Header Banner */}
                    <div className="h-24 bg-gradient-to-r from-[#FF6719] to-[#ff8f4f]" />

                    {/* Avatar & Name */}
                    <div className="px-6 pb-6 -mt-12">
                        <div className="flex items-end gap-4 mb-4">
                            <div className="relative group">
                                {profile.avatar ? (
                                    <img src={profile.avatar} alt={profile.displayName} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md" />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-[#f5f5f5] border-4 border-white shadow-md flex items-center justify-center">
                                        <User2 className="w-8 h-8 text-[#6b6b6b]" />
                                    </div>
                                )}
                                <label className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 cursor-pointer flex items-center justify-center transition-colors">
                                    <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                                </label>
                            </div>
                            <div className="flex-1 pt-12">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-xl font-bold text-[#1a1a1a]">{profile.displayName}</h1>
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${isWriter ? 'bg-[#fff8f5] text-[#FF6719]' : 'bg-[#f0f7ff] text-[#3b82f6]'
                                            }`}>
                                            {isWriter ? 'Writer' : 'Reader'}
                                        </span>
                                    </div>
                                    {!editing && (
                                        <button
                                            onClick={() => setEditing(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e5e5e5] rounded-full text-sm text-[#6b6b6b] hover:bg-[#fafafa] transition-colors"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                            Edit
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Edit Mode */}
                        {editing ? (
                            <div className="space-y-4 mt-4">
                                <div>
                                    <label className="block text-xs font-medium text-[#6b6b6b] mb-1">Display Name</label>
                                    <input
                                        type="text"
                                        value={editForm.displayName}
                                        onChange={e => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                                        className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6719]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#6b6b6b] mb-1">Bio</label>
                                    <textarea
                                        value={editForm.bio}
                                        onChange={e => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                                        rows={3}
                                        className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6719] resize-none"
                                        placeholder="Tell readers about yourself..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-[#6b6b6b] mb-1">Program</label>
                                        <input
                                            type="text"
                                            value={editForm.program}
                                            onChange={e => setEditForm(prev => ({ ...prev, program: e.target.value }))}
                                            className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6719]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[#6b6b6b] mb-1">Year</label>
                                        <input
                                            type="text"
                                            value={editForm.year}
                                            onChange={e => setEditForm(prev => ({ ...prev, year: e.target.value }))}
                                            className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6719]"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6719] text-white rounded-full text-sm font-medium hover:bg-[#e55b14] disabled:opacity-50 transition-colors"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => setEditing(false)}
                                        className="flex items-center gap-1.5 px-4 py-2 border border-[#e5e5e5] text-[#6b6b6b] rounded-full text-sm hover:bg-[#fafafa] transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Bio */}
                                {profile.bio && (
                                    <p className="text-sm text-[#6b6b6b] mt-3 leading-relaxed">{profile.bio}</p>
                                )}

                                {/* Info */}
                                <div className="flex flex-wrap gap-3 mt-3 text-xs text-[#6b6b6b]">
                                    {profile.program && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{profile.program}</span>}
                                    {profile.year && <span>Year {profile.year}</span>}
                                    {profile.universityEmail && <span>{profile.universityEmail}</span>}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    {isWriter ? (
                        <>
                            {[
                                { icon: FileText, label: 'Posts', value: formatCount(publishedPosts.length) },
                                { icon: Users, label: 'Followers', value: formatCount(profile.followersCount || 0) },
                                { icon: Heart, label: 'Total Likes', value: formatCount(totalLikes) },
                                { icon: BookOpen, label: 'Total Views', value: formatCount(totalViews) },
                            ].map((s, i) => (
                                <div key={i} className="bg-white border border-[#e5e5e5] rounded-xl p-3 text-center">
                                    <s.icon className="w-4 h-4 text-[#FF6719] mx-auto mb-1" />
                                    <p className="text-lg font-bold text-[#1a1a1a]">{s.value}</p>
                                    <p className="text-[10px] text-[#6b6b6b]">{s.label}</p>
                                </div>
                            ))}
                        </>
                    ) : (
                        <>
                            {[
                                { icon: Users, label: 'Following', value: formatCount(profile.followingCount || 0) },
                                { icon: BookOpen, label: 'Bookmarks', value: '—' },
                            ].map((s, i) => (
                                <div key={i} className="bg-white border border-[#e5e5e5] rounded-xl p-3 text-center">
                                    <s.icon className="w-4 h-4 text-[#FF6719] mx-auto mb-1" />
                                    <p className="text-lg font-bold text-[#1a1a1a]">{s.value}</p>
                                    <p className="text-[10px] text-[#6b6b6b]">{s.label}</p>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Published Posts (Writers only) */}
                {isWriter && publishedPosts.length > 0 && (
                    <div className="mt-6">
                        <h2 className="text-base font-bold text-[#1a1a1a] mb-3">Your Published Posts</h2>
                        <div className="bg-white border border-[#e5e5e5] rounded-xl divide-y divide-[#e5e5e5]">
                            {publishedPosts.slice(0, 5).map(post => (
                                <Link
                                    key={post.postId}
                                    href={`/diaries/${post.postId}`}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#fafafa] transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#1a1a1a] truncate">{post.title}</p>
                                        <div className="flex gap-3 text-[10px] text-[#6b6b6b] mt-0.5">
                                            <span>{formatCount(post.viewsCount || 0)} views</span>
                                            <span>{formatCount(post.likesCount || 0)} likes</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        {publishedPosts.length > 5 && (
                            <Link href="/diaries/dashboard" className="block text-center text-sm text-[#FF6719] mt-3 hover:underline">
                                View all in Dashboard →
                            </Link>
                        )}
                    </div>
                )}

                {/* Quick Actions */}
                <div className="mt-6 flex flex-wrap gap-3">
                    {isWriter && (
                        <Link href="/diaries/write" className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6719] text-white rounded-full text-sm font-medium hover:bg-[#e55b14] transition-colors">
                            <Edit className="w-3.5 h-3.5" />
                            Write New Post
                        </Link>
                    )}
                    <Link href="/diaries/dashboard" className="flex items-center gap-1.5 px-4 py-2 border border-[#e5e5e5] text-[#6b6b6b] rounded-full text-sm hover:bg-white transition-colors">
                        Dashboard
                    </Link>
                    <Link href="/diaries/saved" className="flex items-center gap-1.5 px-4 py-2 border border-[#e5e5e5] text-[#6b6b6b] rounded-full text-sm hover:bg-white transition-colors">
                        Saved Posts
                    </Link>
                </div>
            </div>
        </div>
    );
}
