'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, BookOpen, Heart, Bookmark, MessageCircle, PenLine } from 'lucide-react';
import {
    signInWithPopup,
    signInWithRedirect,
    GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '@/firebase/config';
import { getProfile } from '@/lib/diary/firebase';
import toast from 'react-hot-toast';

type AuthAction = 'like' | 'save' | 'comment' | 'follow' | 'general';

interface AuthPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    action?: AuthAction;
}

const actionConfig: Record<AuthAction, { icon: typeof Heart; title: string; description: string }> = {
    like: {
        icon: Heart,
        title: 'Like this post?',
        description: 'Sign in to like posts and show your appreciation for writers.',
    },
    save: {
        icon: Bookmark,
        title: 'Save for later?',
        description: 'Sign in to bookmark posts and build your reading list.',
    },
    comment: {
        icon: MessageCircle,
        title: 'Join the conversation',
        description: 'Sign in to share your thoughts and connect with writers.',
    },
    follow: {
        icon: PenLine,
        title: 'Follow this writer?',
        description: 'Sign in to follow writers and get notified about new posts.',
    },
    general: {
        icon: BookOpen,
        title: 'Join Student Diaries',
        description: 'Sign in to unlock the full experience — like, comment, save, and more.',
    },
};

export default function AuthPromptModal({ isOpen, onClose, action = 'general' }: AuthPromptModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const config = actionConfig[action];
    const ActionIcon = config.icon;

    const handleGoogleSignIn = async () => {
        setLoading(true);
        console.log('AuthPromptModal: Initiating Google Sign-In...');
        try {
            const provider = new GoogleAuthProvider();
            try {
                // Try popup first
                const cred = await signInWithPopup(auth, provider);
                console.log('AuthPromptModal: Popup success for', cred.user.uid);
                const profile = await getProfile(cred.user.uid);
                toast.success('Welcome!');
                onClose();
                if (!profile) {
                    router.push('/diaries/onboarding');
                }
            } catch (popupErr: any) {
                console.log('AuthPromptModal: Popup error code:', popupErr.code);
                // Fallback to redirect if blocked or mobile
                if (
                    popupErr.code === 'auth/popup-blocked' ||
                    popupErr.code === 'auth/popup-closed-by-user' ||
                    popupErr.code === 'auth/cancelled-popup-request' ||
                    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                ) {
                    console.log('AuthPromptModal: Falling back to redirect...');
                    await signInWithRedirect(auth, provider);
                } else {
                    throw popupErr;
                }
            }
        } catch (err: any) {
            console.error('AuthPromptModal: Google sign-in error:', err);
            toast.error(`Sign-in failed: ${err.message}`);
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]" />

            {/* Modal */}
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl animate-[slideUp_300ms_ease-out] overflow-hidden">
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Top accent */}
                <div className="h-1 bg-gradient-to-r from-[#FF6719] to-[#ff8f4f]" />

                <div className="px-6 pt-8 pb-6">
                    {/* Branding */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <BookOpen className="w-6 h-6 text-[#FF6719]" />
                        <span className="text-lg font-bold text-[#1a1a1a]">Student Diaries</span>
                    </div>

                    {/* Action icon */}
                    <div className="flex justify-center mb-4">
                        <div className="w-14 h-14 rounded-full bg-[#fff8f5] flex items-center justify-center">
                            <ActionIcon className="w-7 h-7 text-[#FF6719]" />
                        </div>
                    </div>

                    {/* Text */}
                    <h2 className="text-xl font-bold text-[#1a1a1a] text-center mb-2" style={{ fontFamily: 'var(--font-lora), serif' }}>
                        {config.title}
                    </h2>
                    <p className="text-sm text-[#6b6b6b] text-center mb-8 leading-relaxed">
                        {config.description}
                    </p>

                    {/* Google Sign In */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 bg-white border border-[#e5e5e5] rounded-xl px-4 py-3 text-[#1a1a1a] font-medium hover:bg-[#fafafa] hover:border-[#d4d4d4] transition-all disabled:opacity-50 mb-3 shadow-sm"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        {loading ? 'Signing in...' : 'Continue with Google'}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-[#e5e5e5]" />
                        <span className="text-xs text-[#c4c4c4]">or</span>
                        <div className="flex-1 h-px bg-[#e5e5e5]" />
                    </div>

                    {/* Sign In / Register buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => { onClose(); router.push('/diaries/login'); }}
                            className="flex-1 py-2.5 bg-[#FF6719] text-white rounded-xl text-sm font-semibold hover:bg-[#e55b14] transition-colors"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => { onClose(); router.push('/diaries/register'); }}
                            className="flex-1 py-2.5 border border-[#e5e5e5] text-[#1a1a1a] rounded-xl text-sm font-semibold hover:bg-[#fafafa] transition-colors"
                        >
                            Register
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
