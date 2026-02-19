'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import { followWriter, unfollowWriter, isFollowing } from '@/lib/diary/firebase';
import { formatCount } from '@/lib/diary/utils';
import type { DiaryProfile } from '@/types/diary';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface Props {
    writer: DiaryProfile;
    compact?: boolean;
}

export default function WriterCard({ writer, compact = false }: Props) {
    const { user } = useDiaryAuth();
    const router = useRouter();
    const [following, setFollowing] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user && user.uid !== writer.userId) {
            isFollowing(user.uid, writer.userId).then(setFollowing);
        }
    }, [user, writer.userId]);

    const handleFollow = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            toast('Sign in to follow writers', { icon: '🔒' });
            router.push('/diaries/login');
            return;
        }
        setLoading(true);
        try {
            if (following) {
                await unfollowWriter(user.uid, writer.userId);
                setFollowing(false);
                toast.success(`Unfollowed ${writer.displayName}`);
            } else {
                await followWriter(user.uid, writer.userId);
                setFollowing(true);
                toast.success(`Following ${writer.displayName}`);
            }
        } catch (err) {
            toast.error('Something went wrong');
        }
        setLoading(false);
    };

    if (compact) {
        return (
            <div className="flex items-center gap-3 py-2">
                <Link href={`/diaries/writers/${writer.userId}`} className="shrink-0">
                    {writer.avatar ? (
                        <img src={writer.avatar} alt={writer.displayName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-[#FF6719] flex items-center justify-center text-white font-bold">
                            {writer.displayName?.charAt(0)?.toUpperCase()}
                        </div>
                    )}
                </Link>
                <div className="flex-1 min-w-0">
                    <Link href={`/diaries/writers/${writer.userId}`} className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-[#1a1a1a] truncate hover:underline">
                            {writer.displayName}
                        </span>
                        {writer.isApproved && <CheckCircle className="w-3.5 h-3.5 text-[#FF6719] shrink-0" />}
                    </Link>
                    <p className="text-xs text-[#6b6b6b] truncate">{writer.bio}</p>
                </div>
                {(!user || user.uid !== writer.userId) && (
                    <button
                        onClick={handleFollow}
                        disabled={loading}
                        className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${following
                            ? 'bg-[#f5f5f5] text-[#6b6b6b] hover:bg-[#e5e5e5]'
                            : 'bg-[#FF6719] text-white hover:bg-[#e55b14]'
                            }`}
                    >
                        {following ? 'Following' : 'Follow'}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white border border-[#e5e5e5] rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
                <Link href={`/diaries/writers/${writer.userId}`} className="shrink-0">
                    {writer.avatar ? (
                        <img src={writer.avatar} alt={writer.displayName} className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-[#FF6719] flex items-center justify-center text-white text-xl font-bold">
                            {writer.displayName?.charAt(0)?.toUpperCase()}
                        </div>
                    )}
                </Link>
                <div className="flex-1 min-w-0">
                    <Link href={`/diaries/writers/${writer.userId}`} className="flex items-center gap-1">
                        <h3 className="font-bold text-[#1a1a1a] hover:underline">{writer.displayName}</h3>
                        {writer.isApproved && <CheckCircle className="w-4 h-4 text-[#FF6719]" />}
                    </Link>
                    <p className="text-sm text-[#6b6b6b] mt-0.5">{writer.program} · {writer.year}</p>
                    <p className="text-sm text-[#6b6b6b] mt-1 line-clamp-2">{writer.bio}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#6b6b6b]">
                        <span>{formatCount(writer.followersCount || 0)} followers</span>
                        <span>{formatCount(writer.postsCount || 0)} posts</span>
                    </div>
                </div>
            </div>
            {(!user || user.uid !== writer.userId) && (
                <button
                    onClick={handleFollow}
                    disabled={loading}
                    className={`w-full mt-4 py-2 rounded-full text-sm font-semibold transition-colors ${following
                        ? 'bg-[#f5f5f5] text-[#6b6b6b] hover:bg-[#e5e5e5] border border-[#e5e5e5]'
                        : 'bg-[#FF6719] text-white hover:bg-[#e55b14]'
                        }`}
                >
                    {following ? 'Following' : 'Follow'}
                </button>
            )}
        </div>
    );
}
