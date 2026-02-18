'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

function UnsubscribeContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            return;
        }
        handleUnsubscribe();
    }, [token]);

    const handleUnsubscribe = async () => {
        try {
            await updateDoc(doc(db, 'diary_subscriptions', token!), { isActive: false });
            setStatus('success');
        } catch {
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
            <div className="text-center max-w-md">
                {status === 'loading' && (
                    <p className="text-[#6b6b6b]">Processing...</p>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">You&apos;ve been unsubscribed</h1>
                        <p className="text-[#6b6b6b] mb-6">You will no longer receive email notifications from this writer.</p>
                        <Link href="/diaries" className="inline-flex items-center gap-2 bg-[#FF6719] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#e55b14]">
                            Back to Diaries
                        </Link>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Something went wrong</h1>
                        <p className="text-[#6b6b6b] mb-6">We couldn&apos;t process your unsubscribe request. The link may be invalid or expired.</p>
                        <Link href="/diaries" className="inline-flex items-center gap-2 bg-[#FF6719] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#e55b14]">
                            Back to Diaries
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}

export default function UnsubscribePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-[#6b6b6b]">Loading...</div>}>
            <UnsubscribeContent />
        </Suspense>
    );
}
