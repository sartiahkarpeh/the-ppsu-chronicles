'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Mail } from 'lucide-react';
import { getProfile } from '@/lib/diary/firebase';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import SubscribeBox from '@/components/diary/SubscribeBox';
import type { DiaryProfile } from '@/types/diary';

export default function SubscribePage() {
    const { writerId } = useParams<{ writerId: string }>();
    const { user } = useDiaryAuth();
    const [writer, setWriter] = useState<DiaryProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!writerId) return;
        getProfile(writerId)
            .then(setWriter)
            .finally(() => setLoading(false));
    }, [writerId]);

    if (loading) {
        return <div className="min-h-screen bg-white flex items-center justify-center text-[#6b6b6b]">Loading...</div>;
    }

    if (!writer) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold text-[#1a1a1a]">Writer not found</h1>
                <Link href="/diaries" className="text-[#FF6719] hover:underline">← Back to Diaries</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            <div className="w-full max-w-md text-center">
                {writer.avatar ? (
                    <img src={writer.avatar} alt={writer.displayName} className="w-20 h-20 rounded-full object-cover mx-auto mb-4" />
                ) : (
                    <div className="w-20 h-20 rounded-full bg-[#FF6719] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                        {writer.displayName?.charAt(0)?.toUpperCase()}
                    </div>
                )}

                <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: 'var(--font-lora), serif' }}>
                    Subscribe to {writer.displayName}
                </h1>
                <p className="text-[#6b6b6b] mb-2">{writer.program} · {writer.year}</p>
                {writer.bio && <p className="text-sm text-[#6b6b6b] mb-6">{writer.bio}</p>}

                <SubscribeBox writerId={writer.userId} writerName={writer.displayName} />

                <div className="mt-6">
                    <Link href={`/diaries/writers/${writer.userId}`} className="text-sm text-[#FF6719] hover:underline">
                        View profile →
                    </Link>
                </div>
            </div>
        </div>
    );
}
