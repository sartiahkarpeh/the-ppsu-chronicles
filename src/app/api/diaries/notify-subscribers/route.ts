import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

export async function POST(req: NextRequest) {
    try {
        const { postId, authorId, authorName, title, subtitle, tags, readTime } = await req.json();

        if (!authorId || !title) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get active subscribers for this writer
        const subsRef = collection(db, 'diary_subscriptions');
        const subsQuery = query(
            subsRef,
            where('writerId', '==', authorId),
            where('isActive', '==', true)
        );
        const subsSnap = await getDocs(subsQuery);

        if (subsSnap.empty) {
            return NextResponse.json({ success: true, sent: 0 });
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ppsuchronicles.com';
        const postUrl = `${siteUrl}/diaries/${postId}`;

        // Send emails to each subscriber
        const emailPromises = subsSnap.docs.map(async (doc) => {
            const sub = doc.data();
            const unsubscribeUrl = `${siteUrl}/diaries/unsubscribe?token=${doc.id}`;

            try {
                await fetch(`${siteUrl}/api/diaries/send-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'new_post',
                        to: sub.subscriberEmail,
                        writerName: authorName,
                        postTitle: title,
                        postSubtitle: subtitle,
                        readTime,
                        postUrl,
                        unsubscribeUrl,
                    }),
                });
                return { email: sub.subscriberEmail, status: 'sent' };
            } catch (err) {
                return { email: sub.subscriberEmail, status: 'failed' };
            }
        });

        const results = await Promise.allSettled(emailPromises);
        const sent = results.filter(r => r.status === 'fulfilled' && (r as any).value?.status === 'sent').length;

        return NextResponse.json({ success: true, sent, total: subsSnap.size });
    } catch (error: any) {
        console.error('Notify subscribers error:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to notify subscribers' },
            { status: 500 }
        );
    }
}
