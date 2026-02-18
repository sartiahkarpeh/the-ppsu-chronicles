'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ImagePlus, X, Save, Send } from 'lucide-react';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import { getPost, updatePost, uploadDiaryImage } from '@/lib/diary/firebase';
import { calculateReadTime } from '@/lib/diary/utils';
import { DIARY_TAGS } from '@/types/diary';
import TipTapEditor from '@/components/diary/TipTapEditor';
import toast from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';

export default function EditPostPage() {
    const { postId } = useParams<{ postId: string }>();
    const router = useRouter();
    const { user, profile, isWriter, isApprovedWriter, loading: authLoading } = useDiaryAuth();

    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [content, setContent] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [originalStatus, setOriginalStatus] = useState<string>('draft');
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [loadingPost, setLoadingPost] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    useEffect(() => {
        if (!postId || authLoading) return;
        loadPost();
    }, [postId, authLoading]);

    useEffect(() => {
        if (!authLoading && !user) router.push('/diaries/login');
        else if (!authLoading && profile && !isWriter) {
            router.push('/diaries');
        }
    }, [authLoading, user, profile, isWriter, router]);

    const loadPost = async () => {
        try {
            const post = await getPost(postId);
            if (!post || post.authorId !== user?.uid) {
                toast.error('Post not found or access denied');
                router.push('/diaries/dashboard');
                return;
            }
            setTitle(post.title);
            setSubtitle(post.subtitle);
            setContent(post.content);
            setCoverImage(post.coverImage || '');
            setTags(post.tags || []);
            setOriginalStatus(post.status);
        } catch (err) {
            toast.error('Failed to load post');
        }
        setLoadingPost(false);
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const toastId = toast.loading('Uploading...');
        try {
            const url = await uploadDiaryImage(file, 'covers');
            setCoverImage(url);
            toast.success('Uploaded!', { id: toastId });
        } catch { toast.error('Upload failed', { id: toastId }); }
    };

    const handleSave = async () => {
        if (!user || !profile || !title.trim()) return;
        setSaving(true);
        try {
            await updatePost(postId, {
                title: title.trim(),
                subtitle: subtitle.trim(),
                content,
                coverImage,
                tags,
                readTime: calculateReadTime(content),
            });
            setLastSaved(new Date());
            toast.success('Saved!');
        } catch { toast.error('Save failed'); }
        setSaving(false);
    };

    const handlePublish = async () => {
        if (!title.trim() || !content.trim()) {
            toast.error('Title and content are required');
            return;
        }
        setPublishing(true);
        try {
            await updatePost(postId, {
                title: title.trim(),
                subtitle: subtitle.trim(),
                content,
                coverImage,
                tags,
                status: 'published',
                publishedAt: Timestamp.now(),
                readTime: calculateReadTime(content),
            });
            toast.success('Published! 🎉');
            router.push('/diaries/dashboard');
        } catch { toast.error('Failed to publish'); }
        setPublishing(false);
    };

    const toggleTag = (tag: string) => {
        setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 3 ? [...prev, tag] : prev);
    };

    if (authLoading || loadingPost) {
        return <div className="min-h-screen bg-white flex items-center justify-center text-[#6b6b6b]">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            {/* Top bar */}
            <div className="sticky top-14 z-40 bg-white border-b border-[#e5e5e5]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <span className="text-sm text-[#6b6b6b]">
                        {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : `Editing · ${originalStatus}`}
                    </span>
                    <div className="flex items-center gap-3">
                        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 border border-[#e5e5e5] rounded-full text-sm font-medium text-[#6b6b6b] hover:bg-[#fafafa] disabled:opacity-50">
                            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}
                        </button>
                        {originalStatus !== 'published' && (
                            <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-1.5 px-5 py-2 bg-[#FF6719] text-white rounded-full text-sm font-semibold hover:bg-[#e55b14] disabled:opacity-50">
                                <Send className="w-4 h-4" />{publishing ? 'Publishing...' : 'Publish'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
                {/* Cover Image */}
                <div className="mb-6">
                    {coverImage ? (
                        <div className="relative rounded-xl overflow-hidden">
                            <img src={coverImage} alt="Cover" className="w-full h-64 object-cover" />
                            <button onClick={() => setCoverImage('')} className="absolute top-3 right-3 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70">
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

                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full text-3xl sm:text-4xl font-bold text-[#1a1a1a] placeholder-[#d4d4d4] focus:outline-none mb-3" style={{ fontFamily: 'var(--font-lora), serif' }} />
                <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="A short description..." className="w-full text-lg text-[#6b6b6b] placeholder-[#d4d4d4] focus:outline-none mb-6" />

                <div className="mb-6">
                    <p className="text-sm font-medium text-[#1a1a1a] mb-2">Tags ({tags.length}/3)</p>
                    <div className="flex flex-wrap gap-2">
                        {DIARY_TAGS.map(tag => (
                            <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`px-3 py-1 rounded-full text-sm transition-colors ${tags.includes(tag) ? 'bg-[#FF6719] text-white' : 'bg-[#f5f5f5] text-[#6b6b6b] hover:bg-[#e5e5e5]'}`}>
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {content !== undefined && <TipTapEditor content={content} onChange={setContent} />}
            </div>
        </div>
    );
}
