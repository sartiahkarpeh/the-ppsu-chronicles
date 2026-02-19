'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, X, Save, Send } from 'lucide-react';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import { createPost, updatePost, uploadDiaryImage } from '@/lib/diary/firebase';
import { calculateReadTime } from '@/lib/diary/utils';
import { DIARY_TAGS } from '@/types/diary';
import TipTapEditor from '@/components/diary/TipTapEditor';
import toast from 'react-hot-toast';
import { serverTimestamp, Timestamp } from 'firebase/firestore';

export default function WritePage() {
    const router = useRouter();
    const { user, profile, isWriter, isApprovedWriter, loading: authLoading } = useDiaryAuth();

    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [content, setContent] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [draftId, setDraftId] = useState<string | null>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

    // Auto-save every 30 seconds
    useEffect(() => {
        if (!user || !title.trim()) return;

        autoSaveTimer.current = setInterval(() => {
            handleSaveDraft(true);
        }, 30000);

        return () => {
            if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
        };
    }, [user, title, subtitle, content, coverImage, tags, draftId]);

    // Redirect if not a writer
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/diaries/login');
        } else if (!authLoading && user && !profile) {
            router.push('/diaries/onboarding');
        } else if (!authLoading && profile && !isWriter) {
            toast.error('Only writers can create posts');
            router.push('/diaries');
        }
    }, [authLoading, user, profile, isWriter, router]);

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const toastId = toast.loading('Uploading cover image...');
        try {
            const url = await uploadDiaryImage(file, 'covers');
            setCoverImage(url);
            toast.success('Cover uploaded!', { id: toastId });
        } catch (err) {
            toast.error('Upload failed', { id: toastId });
        }
    };

    const handleSaveDraft = async (silent = false) => {
        if (!user || !profile || !title.trim()) return;
        setSaving(true);

        const postData = {
            authorId: user.uid,
            authorName: profile.displayName,
            authorAvatar: profile.avatar || '',
            title: title.trim(),
            subtitle: subtitle.trim(),
            content,
            coverImage,
            tags,
            status: 'draft' as const,
            publishedAt: null,
            viewsCount: 0,
            likesCount: 0,
            commentsCount: 0,
            readTime: calculateReadTime(content),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        try {
            if (draftId) {
                await updatePost(draftId, postData);
            } else {
                const newId = await createPost(postData);
                setDraftId(newId);
            }
            setLastSaved(new Date());
            if (!silent) toast.success('Draft saved!');
        } catch (err) {
            if (!silent) toast.error('Failed to save draft');
        }
        setSaving(false);
    };

    const handlePublish = async () => {
        if (!user || !profile || !title.trim()) {
            toast.error('Please add a title before publishing');
            return;
        }

        if (!content.trim()) {
            toast.error('Please add some content before publishing');
            return;
        }

        setPublishing(true);

        const status = 'published';

        const postData = {
            authorId: user.uid,
            authorName: profile.displayName,
            authorAvatar: profile.avatar || '',
            title: title.trim(),
            subtitle: subtitle.trim(),
            content,
            coverImage,
            tags,
            status: status as 'published',
            publishedAt: Timestamp.now(),
            viewsCount: 0,
            likesCount: 0,
            commentsCount: 0,
            readTime: calculateReadTime(content),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        try {
            let finalPostId = draftId;
            if (draftId) {
                await updatePost(draftId, postData);
            } else {
                finalPostId = await createPost(postData);
                setDraftId(finalPostId);
            }

            // Notify subscribers if published
            if (status === 'published') {
                try {
                    await fetch('/api/diaries/notify-subscribers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            postId: finalPostId,
                            authorId: user.uid,
                            authorName: profile.displayName,
                            title: title.trim(),
                            subtitle: subtitle.trim(),
                            tags,
                            readTime: calculateReadTime(content),
                        }),
                    });
                } catch {
                    // Non-blocking
                }
            }

            toast.success('Published! 🎉');
            router.push('/diaries/dashboard');
        } catch (err) {
            toast.error('Failed to publish');
        }
        setPublishing(false);
    };

    const toggleTag = (tag: string) => {
        setTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
        );
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-[#6b6b6b]">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            {/* Top Bar */}
            <div className="sticky top-14 z-40 bg-white border-b border-[#e5e5e5]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <div className="text-sm text-[#6b6b6b]">
                        {lastSaved && (
                            <span>Saved {lastSaved.toLocaleTimeString()}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => handleSaveDraft(false)}
                            disabled={saving || !title.trim()}
                            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 border border-[#e5e5e5] rounded-full text-xs sm:text-sm font-medium text-[#6b6b6b] hover:bg-[#fafafa] disabled:opacity-50 transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save Draft'}</span>
                        </button>
                        <button
                            onClick={handlePublish}
                            disabled={publishing || !title.trim()}
                            className="flex items-center gap-1.5 px-4 sm:px-5 py-2 bg-[#FF6719] text-white rounded-full text-xs sm:text-sm font-semibold hover:bg-[#e55b14] disabled:opacity-50 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            {publishing ? '...' : 'Publish'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
                {/* Cover Image */}
                <div className="mb-6">
                    {coverImage ? (
                        <div className="relative rounded-xl overflow-hidden">
                            <img src={coverImage} alt="Cover" className="w-full h-48 sm:h-64 object-cover" />
                            <button
                                onClick={() => setCoverImage('')}
                                className="absolute top-3 right-3 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#e5e5e5] rounded-xl cursor-pointer hover:border-[#FF6719] hover:bg-[#fff8f5] transition-colors">
                            <ImagePlus className="w-8 h-8 text-[#6b6b6b] mb-2" />
                            <span className="text-sm text-[#6b6b6b]">Add a cover image</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                        </label>
                    )}
                </div>

                {/* Title */}
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1a1a1a] placeholder-[#d4d4d4] focus:outline-none mb-3"
                    style={{ fontFamily: 'var(--font-lora), serif' }}
                />

                {/* Subtitle */}
                <input
                    type="text"
                    value={subtitle}
                    onChange={e => setSubtitle(e.target.value)}
                    placeholder="A short description..."
                    className="w-full text-lg text-[#6b6b6b] placeholder-[#d4d4d4] focus:outline-none mb-6"
                />

                {/* Tags */}
                <div className="mb-6">
                    <p className="text-sm font-medium text-[#1a1a1a] mb-2">
                        Tags ({tags.length}/3)
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {DIARY_TAGS.map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`px-3 py-1 rounded-full text-sm transition-colors ${tags.includes(tag)
                                    ? 'bg-[#FF6719] text-white'
                                    : 'bg-[#f5f5f5] text-[#6b6b6b] hover:bg-[#e5e5e5]'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor */}
                <TipTapEditor content={content} onChange={setContent} />
            </div>
        </div>
    );
}
