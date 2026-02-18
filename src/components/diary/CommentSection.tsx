'use client';

import { useState, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import { addComment, getComments, deleteComment } from '@/lib/diary/firebase';
import { formatRelativeDate } from '@/lib/diary/utils';
import type { DiaryComment } from '@/types/diary';
import toast from 'react-hot-toast';
import Link from 'next/link';
import AuthPromptModal from '@/components/diary/AuthPromptModal';

interface Props {
    postId: string;
    postAuthorId: string;
}

export default function CommentSection({ postId, postAuthorId }: Props) {
    const { user, profile } = useDiaryAuth();
    const [comments, setComments] = useState<DiaryComment[]>([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    const loadComments = async () => {
        try {
            const data = await getComments(postId);
            setComments(data);
        } catch (err) {
            console.error('Failed to load comments:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadComments();
    }, [postId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !profile || !text.trim()) return;

        setSubmitting(true);
        try {
            await addComment({
                postId,
                authorId: user.uid,
                authorName: profile.displayName,
                authorAvatar: profile.avatar || '',
                text: text.trim(),
            });
            setText('');
            await loadComments();
            toast.success('Comment posted!');
        } catch (err) {
            toast.error('Failed to post comment');
        }
        setSubmitting(false);
    };

    const handleDelete = async (commentId: string) => {
        try {
            await deleteComment(commentId, postId);
            setComments(prev => prev.filter(c => c.id !== commentId));
            toast.success('Comment deleted');
        } catch (err) {
            toast.error('Failed to delete comment');
        }
    };

    return (
        <div>
            <h3 className="text-lg font-bold text-[#1a1a1a] mb-4">
                Comments ({comments.length})
            </h3>

            {/* Add comment form */}
            {user && profile ? (
                <form onSubmit={handleSubmit} className="mb-6">
                    <div className="flex items-start gap-3">
                        {profile.avatar ? (
                            <img src={profile.avatar} alt={profile.displayName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-[#FF6719] flex items-center justify-center text-white text-sm font-bold shrink-0">
                                {profile.displayName?.charAt(0)?.toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1">
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="Write a comment..."
                                rows={2}
                                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:border-[#FF6719] resize-none"
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    type="submit"
                                    disabled={!text.trim() || submitting}
                                    className="flex items-center gap-1.5 bg-[#FF6719] text-white px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-50 hover:bg-[#e55b14] transition-colors"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    {submitting ? 'Posting...' : 'Post'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            ) : (
                <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full text-left px-4 py-3 border border-dashed border-[#e5e5e5] rounded-xl text-sm text-[#6b6b6b] hover:border-[#FF6719] hover:text-[#FF6719] hover:bg-[#fff8f5] transition-all mb-6 cursor-pointer"
                >
                    💬 Sign in to leave a comment...
                </button>
            )}

            {/* Comments list */}
            {loading ? (
                <div className="text-center py-8 text-sm text-[#6b6b6b]">Loading comments...</div>
            ) : comments.length === 0 ? (
                <div className="text-center py-8 text-sm text-[#6b6b6b]">
                    No comments yet. Be the first to share your thoughts!
                </div>
            ) : (
                <div className="space-y-4">
                    {comments.map(comment => (
                        <div key={comment.id} className="flex gap-3">
                            <Link href={`/diaries/writers/${comment.authorId}`} className="shrink-0">
                                {comment.authorAvatar ? (
                                    <img src={comment.authorAvatar} alt={comment.authorName} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-[#e5e5e5] flex items-center justify-center text-[#6b6b6b] text-sm font-bold">
                                        {comment.authorName?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}
                            </Link>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <Link href={`/diaries/writers/${comment.authorId}`} className="text-sm font-semibold text-[#1a1a1a] hover:underline">
                                        {comment.authorName}
                                    </Link>
                                    <span className="text-xs text-[#6b6b6b]">{formatRelativeDate(comment.createdAt)}</span>
                                </div>
                                <p className="text-sm text-[#1a1a1a] mt-1 leading-relaxed">{comment.text}</p>
                                {user && (user.uid === comment.authorId || user.uid === postAuthorId) && (
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        className="flex items-center gap-1 text-xs text-[#6b6b6b] hover:text-red-500 mt-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Auth Prompt Modal */}
            <AuthPromptModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                action="comment"
            />
        </div>
    );
}
