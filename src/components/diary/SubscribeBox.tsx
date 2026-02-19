'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import { subscribeToWriter } from '@/lib/diary/firebase';
import toast from 'react-hot-toast';

interface Props {
    writerId: string;
    writerName: string;
}

export default function SubscribeBox({ writerId, writerName }: Props) {
    const { user, profile } = useDiaryAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        const subEmail = email.trim() || user?.email || '';

        if (!subEmail || !subEmail.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            const subscriberId = user?.uid || subEmail;
            const subscriberName = profile?.displayName || subEmail.split('@')[0];

            await subscribeToWriter({
                subscriberId,
                subscriberEmail: subEmail,
                subscriberName,
                writerId,
                writerName,
            });

            // Send welcome email via API
            try {
                await fetch('/api/diaries/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'welcome',
                        to: subEmail,
                        subscriberName,
                        writerName,
                        writerId,
                    }),
                });
            } catch {
                // Email sending failure shouldn't block subscription
            }

            toast.success(`You're now subscribed to ${writerName}'s diary!`);
            setEmail('');
        } catch (err) {
            toast.error('Failed to subscribe. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div className="bg-[#fff8f5] border border-[#ffe0cc] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-[#FF6719]" />
                <h3 className="font-bold text-[#1a1a1a]">
                    Subscribe to {writerName}&apos;s Diaries
                </h3>
            </div>
            <p className="text-sm text-[#6b6b6b] mb-4">
                Get notified by email every time they publish a new post.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="flex-1 min-w-0 px-4 py-2.5 border border-[#e5e5e5] rounded-full text-sm focus:outline-none focus:border-[#FF6719] focus:ring-1 focus:ring-[#FF6719] transition-colors box-border"
                    required={!user?.email}
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-[#FF6719] text-white rounded-full text-sm font-semibold hover:bg-[#e55b14] transition-colors disabled:opacity-50 shrink-0 whitespace-nowrap"
                >
                    {loading ? '...' : 'Subscribe'}
                </button>
            </form>
            <p className="text-xs text-[#6b6b6b] mt-2">
                Unsubscribe anytime.
            </p>
        </div>
    );
}
