import { NextRequest, NextResponse } from 'next/server';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Mail, Eye, EyeOff, User } from 'lucide-react';
import {
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '@/firebase/config';
import { getProfile } from '@/lib/diary/firebase';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import toast from 'react-hot-toast';

export default function DiaryRegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useDiaryAuth();

    // Detect role from query param
    const role = (searchParams.get('role') as 'writer' | 'reader') || 'reader';

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Auto-redirect if already logged in
    useEffect(() => {
        if (!authLoading && user) {
            router.push('/diaries');
        }
    }, [user, authLoading, router]);

    const handlePostAuth = async (uid: string) => {
        console.log('DiaryRegisterPage: handlePostAuth for', uid);
        try {
            const profile = await getProfile(uid);
            console.log('DiaryRegisterPage: Profile found:', profile ? 'yes' : 'no');
            if (profile) {
                console.log('DiaryRegisterPage: Redirecting to /diaries');
                router.push('/diaries');
            } else {
                console.log('DiaryRegisterPage: Redirecting to /diaries/onboarding');
                router.push(`/diaries/onboarding?role=${role}`);
            }
        } catch (err) {
            console.error('DiaryRegisterPage: handlePostAuth error:', err);
            toast.error('Failed to load profile. Please try refreshing.');
        }
    };

    const handleEmailRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Please enter your name');
            return;
        }
        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: name.trim() });
            toast.success('Account created!');
            router.push(`/diaries/onboarding?role=${role}`);
        } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
                toast.error('Email already in use. Try signing in instead.');
            } else if (err.code === 'auth/weak-password') {
                toast.error('Password is too weak');
            } else if (err.code === 'auth/invalid-email') {
                toast.error('Invalid email address');
            } else {
                toast.error('Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle redirect result on mount
    useEffect(() => {
        console.log('DiaryRegisterPage: Checking for redirect result...');
        getRedirectResult(auth)
            .then(async (result) => {
                if (result?.user) {
                    console.log('DiaryRegisterPage: Redirect result success for', result.user.uid);
                    toast.success('Welcome!');
                    await handlePostAuth(result.user.uid);
                } else {
                    console.log('DiaryRegisterPage: No redirect result found.');
                }
            })
            .catch((err) => {
                console.error('DiaryRegisterPage: Redirect result error:', err);
                if (err.code !== 'auth/popup-closed-by-user') {
                    toast.error(`Sign-in error: ${err.message}`);
                }
            });
    }, []);

    const handleGoogleRegister = async () => {
        setLoading(true);
        console.log('DiaryRegisterPage: Initiating Google Register...');
        try {
            const provider = new GoogleAuthProvider();
            try {
                // Try popup first
                const result = await signInWithPopup(auth, provider);
                console.log('DiaryRegisterPage: Popup register success for', result.user.uid);
                toast.success('Welcome!');
                await handlePostAuth(result.user.uid);
            } catch (popupErr: any) {
                console.log('DiaryRegisterPage: Popup error code:', popupErr.code);
                // Fallback to redirect for mobile/popup-blocked
                if (
                    popupErr.code === 'auth/popup-blocked' ||
                    popupErr.code === 'auth/popup-closed-by-user' ||
                    popupErr.code === 'auth/cancelled-popup-request' ||
                    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                ) {
                    console.log('DiaryRegisterPage: Falling back to redirect...');
                    await signInWithRedirect(auth, provider);
                } else {
                    throw popupErr;
                }
            }
        } catch (err: any) {
            console.error('DiaryRegisterPage: Google sign-in error:', err);
            toast.error(`Sign-in failed: ${err.message}`);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-[#fff7f3] to-white">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <BookOpen className="w-8 h-8 text-[#FF6719]" />
                        <span className="text-2xl font-bold text-[#1a1a1a]">Student Diaries</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: 'Lora, serif' }}>
                        Join as a <span className="text-[#FF6719] capitalize">{role}</span>
                    </h1>
                    <p className="text-[#6b6b6b]">Share your stories with fellow PPSU students</p>
                </div>

                {/* Google Button */}
                <button
                    onClick={handleGoogleRegister}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-[#e5e5e5] rounded-xl px-4 py-3 text-[#1a1a1a] font-medium hover:bg-[#fafafa] transition-colors disabled:opacity-50 mb-6"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-[#e5e5e5]" />
                    <span className="text-sm text-[#6b6b6b]">or register with email</span>
                    <div className="flex-1 h-px bg-[#e5e5e5]" />
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b6b6b]" />
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Your full name"
                                className="w-full pl-10 pr-4 py-3 border border-[#e5e5e5] rounded-xl text-[#1a1a1a] placeholder-[#c4c4c4] focus:outline-none focus:border-[#FF6719] focus:ring-1 focus:ring-[#FF6719] transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b6b6b]" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="your.email@ppsu.ac.in"
                                className="w-full pl-10 pr-4 py-3 border border-[#e5e5e5] rounded-xl text-[#1a1a1a] placeholder-[#c4c4c4] focus:outline-none focus:border-[#FF6719] focus:ring-1 focus:ring-[#FF6719] transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="At least 6 characters"
                                className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl text-[#1a1a1a] placeholder-[#c4c4c4] focus:outline-none focus:border-[#FF6719] focus:ring-1 focus:ring-[#FF6719] transition-colors pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b6b] hover:text-[#1a1a1a]"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter your password"
                            className="w-full px-4 py-3 border border-[#e5e5e5] rounded-xl text-[#1a1a1a] placeholder-[#c4c4c4] focus:outline-none focus:border-[#FF6719] focus:ring-1 focus:ring-[#FF6719] transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#FF6719] text-white py-3 rounded-xl font-semibold hover:bg-[#e55b14] transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center text-sm text-[#6b6b6b] mt-6">
                    Already have an account?{' '}
                    <Link href={`/diaries/login?role=${role}`} className="text-[#FF6719] font-medium hover:underline">
                        Sign in
                    </Link>
                </p>

                <p className="text-center text-xs text-[#c4c4c4] mt-4">
                    <Link href="/diaries" className="hover:text-[#6b6b6b]">← Back to Diaries</Link>
                </p>
            </div>
        </div>
    );
}
