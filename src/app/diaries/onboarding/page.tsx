import { NextRequest, NextResponse } from 'next/server';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, PenLine, BookOpen } from 'lucide-react';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import { createProfile, uploadDiaryImage } from '@/lib/diary/firebase';
import { validatePPSUEmail } from '@/lib/diary/utils';
import type { DiaryProfile } from '@/types/diary';
import toast from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';

export default function OnboardingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, profile, loading } = useDiaryAuth();

    // Check for pre-selected role
    const preSelectedRole = searchParams.get('role') as 'writer' | 'reader' | null;

    const [step, setStep] = useState<'role' | 'details'>(preSelectedRole ? 'details' : 'role');
    const [role, setRole] = useState<'writer' | 'reader'>(preSelectedRole || 'reader');
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [program, setProgram] = useState('');
    const [year, setYear] = useState('');
    const [emailPrefix, setEmailPrefix] = useState('');
    const [avatar, setAvatar] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push('/diaries/login');
        if (!loading && profile) router.push('/diaries');
        if (user) {
            setDisplayName(user.displayName || '');
            // Only pre-fill prefix if user is already using a university email
            if (user.email?.toLowerCase().endsWith('@ppsu.ac.in')) {
                setEmailPrefix(user.email.split('@')[0]);
            } else {
                setEmailPrefix('');
            }
        }
    }, [loading, user, profile, router]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const toastId = toast.loading('Uploading...');
        try {
            const url = await uploadDiaryImage(file, 'avatars');
            setAvatar(url);
            toast.success('Uploaded!', { id: toastId });
        } catch { toast.error('Upload failed', { id: toastId }); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const universityEmail = `${emailPrefix.trim().toLowerCase()}@ppsu.ac.in`;

        if (!emailPrefix.trim()) {
            toast.error('Please enter your university ID prefix');
            return;
        }

        if (!validatePPSUEmail(universityEmail)) {
            toast.error('Invalid university email format');
            return;
        }

        setSubmitting(true);
        try {
            const profileData: DiaryProfile = {
                userId: user.uid,
                displayName: displayName.trim(),
                avatar,
                bio: bio.trim().slice(0, 160),
                program: program.trim(),
                year: year.trim(),
                universityEmail: universityEmail,
                role,
                isApproved: role === 'reader', // Readers are auto-approved, writers need admin approval
                followersCount: 0,
                followingCount: 0,
                postsCount: 0,
                createdAt: Timestamp.now(),
            };
            await createProfile(profileData);
            toast.success(
                role === 'writer'
                    ? 'Profile created! Your writer account is pending admin approval.'
                    : 'Welcome to Student Diaries!'
            );
            router.push('/diaries');
        } catch (err) {
            toast.error('Something went wrong. Please try again.');
        }
        setSubmitting(false);
    };

    if (loading) {
        return <div className="min-h-screen bg-white flex items-center justify-center text-[#6b6b6b]">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            <div className="w-full max-w-lg">
                {step === 'role' ? (
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora), serif' }}>
                            Welcome to Student Diaries
                        </h1>
                        <p className="text-[#6b6b6b] mb-8">How would you like to participate?</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            <button
                                onClick={() => { setRole('writer'); setStep('details'); }}
                                className="p-6 border-2 border-[#e5e5e5] rounded-xl hover:border-[#FF6719] hover:bg-[#fff8f5] transition-all text-left group"
                            >
                                <PenLine className="w-8 h-8 text-[#FF6719] mb-3" />
                                <h3 className="font-bold text-[#1a1a1a] mb-1">I want to Write</h3>
                                <p className="text-sm text-[#6b6b6b]">
                                    Share your stories, poems, and thoughts with the campus
                                </p>
                            </button>
                            <button
                                onClick={() => { setRole('reader'); setStep('details'); }}
                                className="p-6 border-2 border-[#e5e5e5] rounded-xl hover:border-[#FF6719] hover:bg-[#fff8f5] transition-all text-left group"
                            >
                                <BookOpen className="w-8 h-8 text-[#FF6719] mb-3" />
                                <h3 className="font-bold text-[#1a1a1a] mb-1">I want to Read</h3>
                                <p className="text-sm text-[#6b6b6b]">
                                    Discover and follow your favourite student writers
                                </p>
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {!preSelectedRole && (
                            <button type="button" onClick={() => setStep('role')} className="text-sm text-[#FF6719] hover:underline mb-4">
                                ← Change role
                            </button>
                        )}
                        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-1" style={{ fontFamily: 'var(--font-lora), serif' }}>
                            Complete your profile
                        </h1>
                        <p className="text-[#6b6b6b] text-sm mb-6">
                            {role === 'writer' ? "Set up your writer profile. You'll need admin approval before publishing." : 'Tell us about yourself.'}
                        </p>

                        <div className="space-y-4">
                            {/* Avatar */}
                            <div className="flex items-center gap-4">
                                {avatar ? (
                                    <img src={avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#6b6b6b]">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                )}
                                <label className="text-sm text-[#FF6719] hover:underline cursor-pointer font-medium">
                                    Upload photo
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Display Name *</label>
                                <input
                                    type="text" required value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#FF6719]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">University Email *</label>
                                <div className="flex items-center border border-[#e5e5e5] rounded-lg focus-within:border-[#FF6719] bg-white transition-colors overflow-hidden">
                                    <input
                                        type="text"
                                        required
                                        value={emailPrefix}
                                        onChange={e => setEmailPrefix(e.target.value.replace(/\s+/g, '').split('@')[0])}
                                        placeholder="e.g. 21BECEG001"
                                        className="flex-1 px-4 py-2.5 focus:outline-none bg-transparent min-w-0"
                                    />
                                    <span className="px-4 py-2.5 bg-[#f9f9f9] text-[#6b6b6b] border-l border-[#e5e5e5] select-none font-medium">
                                        @ppsu.ac.in
                                    </span>
                                </div>
                                <p className="text-xs text-[#6b6b6b] mt-1">Enter your student/employee ID prefix</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Program *</label>
                                <input
                                    type="text" required value={program}
                                    onChange={e => setProgram(e.target.value)}
                                    placeholder="e.g. BSc. Computer Science"
                                    className="w-full px-4 py-2.5 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#FF6719]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Year *</label>
                                <select
                                    required value={year} onChange={e => setYear(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#FF6719]"
                                >
                                    <option value="">Select year</option>
                                    <option>Year 1</option><option>Year 2</option>
                                    <option>Year 3</option><option>Year 4</option>
                                    <option>Year 5</option><option>Alumni</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Bio (max 160 chars)</label>
                                <textarea
                                    value={bio} onChange={e => setBio(e.target.value.slice(0, 160))}
                                    placeholder="A short bio about yourself..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#FF6719] resize-none"
                                />
                                <p className="text-xs text-[#6b6b6b] mt-1">{bio.length}/160</p>
                            </div>

                            <button
                                type="submit" disabled={submitting}
                                className="w-full py-3 bg-[#FF6719] text-white rounded-full font-semibold hover:bg-[#e55b14] disabled:opacity-50 transition-colors"
                            >
                                {submitting ? 'Creating profile...' : 'Complete Setup'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
