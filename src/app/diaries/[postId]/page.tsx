'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, Bookmark, Clock, Eye, CheckCircle, ArrowLeft } from 'lucide-react';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import {
    getPost, incrementPostViews, likePost, unlikePost, hasLiked,
    bookmarkPost, removeBookmark, isBookmarked, getPostsByAuthor,
    getPublishedPosts, getProfile,
} from '@/lib/diary/firebase';
import { formatDate, formatCount } from '@/lib/diary/utils';
import type { DiaryPost, DiaryProfile } from '@/types/diary';
import CommentSection from '@/components/diary/CommentSection';
import ShareModal from '@/components/diary/ShareModal';
import ReportModal from '@/components/diary/ReportModal';
import SubscribeBox from '@/components/diary/SubscribeBox';
import ReadingProgressBar from '@/components/diary/ReadingProgressBar';
import DiaryPostCard from '@/components/diary/DiaryPostCard';
import AuthPromptModal from '@/components/diary/AuthPromptModal';
import toast from 'react-hot-toast';

export default function PostPage() {
    const { postId } = useParams<{ postId: string }>();
    const { user } = useDiaryAuth();
    const [post, setPost] = useState<DiaryPost | null>(null);
    const [author, setAuthor] = useState<DiaryProfile | null>(null);
    const [liked, setLiked] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [moreFromAuthor, setMoreFromAuthor] = useState<DiaryPost[]>([]);
    const [explorePosts, setExplorePosts] = useState<DiaryPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authAction, setAuthAction] = useState<'like' | 'save' | 'comment' | 'general'>('general');
    const viewTracked = useRef(false);

    useEffect(() => {
        if (!postId) return;
        loadPost();
    }, [postId]);

    useEffect(() => {
        if (post && user) {
            hasLiked(post.postId, user.uid).then(setLiked);
            isBookmarked(post.postId, user.uid).then(setBookmarked);
        }
    }, [post, user]);

    // Track view once per session
    useEffect(() => {
        if (post && !viewTracked.current) {
            viewTracked.current = true;
            incrementPostViews(post.postId);
        }
    }, [post]);

    const loadPost = async () => {
        try {
            const data = await getPost(postId);
            if (data) {
                setPost(data);
                setLikeCount(data.likesCount || 0);

                const [authorData, authorPosts, explore] = await Promise.all([
                    getProfile(data.authorId),
                    getPostsByAuthor(data.authorId, 'published'),
                    getPublishedPosts(3),
                ]);

                setAuthor(authorData);
                setMoreFromAuthor(authorPosts.filter(p => p.postId !== postId).slice(0, 3));
                setExplorePosts(explore.posts.filter(p => p.postId !== postId && p.authorId !== data.authorId).slice(0, 3));
            }
        } catch (err) {
            console.error('Failed to load post:', err);
        }
        setLoading(false);
    };

    const handleLike = async () => {
        if (!user) { setAuthAction('like'); setShowAuthModal(true); return; }
        if (!post) return;
        try {
            if (liked) {
                await unlikePost(post.postId, user.uid);
                setLiked(false);
                setLikeCount(prev => prev - 1);
            } else {
                await likePost(post.postId, user.uid);
                setLiked(true);
                setLikeCount(prev => prev + 1);
            }
        } catch (err) {
            toast.error('Something went wrong');
        }
    };

    const handleBookmark = async () => {
        if (!user) { setAuthAction('save'); setShowAuthModal(true); return; }
        if (!post) return;
        try {
            if (bookmarked) {
                await removeBookmark(post.postId, user.uid);
                setBookmarked(false);
                toast.success('Removed from saved');
            } else {
                await bookmarkPost(post.postId, user.uid);
                setBookmarked(true);
                toast.success('Saved for later');
            }
        } catch (err) {
            toast.error('Something went wrong');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-pulse text-[#6b6b6b]">Loading...</div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold text-[#1a1a1a]">Post not found</h1>
                <Link href="/diaries" className="text-[#FF6719] hover:underline">← Back to Diaries</Link>
            </div>
        );
    }

    return (
        <>
            <ReadingProgressBar />
            <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
                <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
                    {/* Back Link */}
                    <Link href="/diaries" className="inline-flex items-center gap-1 text-sm text-[#6b6b6b] hover:text-[#1a1a1a] mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Diaries
                    </Link>

                    {/* Author Info */}
                    <div className="flex items-center gap-3 mb-6">
                        <Link href={`/diaries/writers/${post.authorId}`} className="shrink-0">
                            {post.authorAvatar ? (
                                <img src={post.authorAvatar} alt={post.authorName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover" />
                            ) : (
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FF6719] flex items-center justify-center text-white text-base sm:text-lg font-bold">
                                    {post.authorName?.charAt(0)?.toUpperCase()}
                                </div>
                            )}
                        </Link>
                        <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                                <Link href={`/diaries/writers/${post.authorId}`} className="font-semibold text-[#1a1a1a] hover:underline">
                                    {post.authorName}
                                </Link>
                                {author?.isApproved && <CheckCircle className="w-4 h-4 text-[#FF6719]" />}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-[#6b6b6b]">
                                <span>{formatDate(post.publishedAt)}</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                    {post.readTime} min
                                </span>
                                <span className="flex items-center gap-1">
                                    <Eye className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                    {formatCount(post.viewsCount || 0)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Title & Subtitle */}
                    <h1
                        className="text-2xl sm:text-3xl lg:text-[42px] font-bold text-[#1a1a1a] leading-tight mb-2 sm:mb-3"
                        style={{ fontFamily: 'var(--font-lora), serif' }}
                    >
                        {post.title}
                    </h1>
                    {post.subtitle && (
                        <p className="text-base sm:text-xl text-[#6b6b6b] mb-4 sm:mb-6 leading-relaxed">{post.subtitle}</p>
                    )}

                    {/* Cover Image — after title & subtitle */}
                    {post.coverImage && (
                        <div className="mb-8 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '360px' }}>
                            <img
                                src={post.coverImage}
                                alt={post.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* Tags */}
                    {post.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8">
                            {post.tags.map(tag => (
                                <Link
                                    key={tag}
                                    href={`/diaries?tag=${encodeURIComponent(tag)}`}
                                    className="px-3 py-1 bg-[#f5f5f5] text-[#6b6b6b] text-sm rounded-full hover:bg-[#e5e5e5] transition-colors"
                                >
                                    {tag}
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Content */}
                    <div
                        className="diary-content prose prose-base sm:prose-lg max-w-none mb-8 sm:mb-12"
                        style={{
                            fontSize: 'clamp(16px, 2.5vw, 18px)',
                            lineHeight: '1.8',
                            color: '#1a1a1a',
                        }}
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />

                    {/* Action Bar */}
                    <div className="flex items-center justify-between py-4 border-t border-b border-[#e5e5e5] mb-8">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleLike}
                                className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-red-500' : 'text-[#6b6b6b] hover:text-red-500'
                                    }`}
                            >
                                <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                                <span className="text-sm font-medium">{formatCount(likeCount)}</span>
                            </button>
                            <ShareModal url={`/diaries/${post.postId}`} title={post.title} />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleBookmark}
                                className={`transition-colors ${bookmarked ? 'text-[#FF6719]' : 'text-[#6b6b6b] hover:text-[#FF6719]'
                                    }`}
                            >
                                <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
                            </button>
                            <ReportModal postId={post.postId} />
                        </div>
                    </div>

                    {/* Subscribe Box */}
                    <div className="mb-10">
                        <SubscribeBox writerId={post.authorId} writerName={post.authorName} />
                    </div>

                    {/* Comments */}
                    <div className="mb-12">
                        <CommentSection postId={post.postId} postAuthorId={post.authorId} />
                    </div>

                    {/* More from Author */}
                    {moreFromAuthor.length > 0 && (
                        <div className="mb-12">
                            <h3 className="text-lg font-bold text-[#1a1a1a] mb-4">
                                More from {post.authorName}
                            </h3>
                            {moreFromAuthor.map(p => (
                                <DiaryPostCard key={p.postId} post={p} showAuthor={false} />
                            ))}
                        </div>
                    )}

                    {/* Explore More */}
                    {explorePosts.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-[#1a1a1a] mb-4">
                                Explore more Diaries
                            </h3>
                            {explorePosts.map(p => (
                                <DiaryPostCard key={p.postId} post={p} />
                            ))}
                        </div>
                    )}
                </article>

                {/* Auth Prompt Modal */}
                <AuthPromptModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    action={authAction}
                />
            </div>
        </>
    );
}
