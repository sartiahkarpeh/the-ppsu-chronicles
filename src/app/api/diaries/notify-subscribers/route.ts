import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { sendDiaryEmail } from '@/lib/diary/email';

export async function POST(req: NextRequest) {
    try {
        const { postId, authorId, authorName, authorAvatar, title, subtitle, tags, readTime, content, coverImage, publishedAt } = await req.json();

        if (!authorId || !title) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) {
            console.error('Firebase Admin not initialized');
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        // Get all active subscribers using Admin SDK for full access
        const subsSnap = await adminDb.collection('diary_subscriptions')
            .where('isActive', '==', true)
            .get();

        if (subsSnap.empty) {
            return NextResponse.json({ success: true, sent: 0 });
        }

        // Deduplicate emails
        const uniqueSubscribers = new Map();
        subsSnap.docs.forEach(doc => {
            const data = doc.data();
            if (!uniqueSubscribers.has(data.subscriberEmail)) {
                uniqueSubscribers.set(data.subscriberEmail, {
                    email: data.subscriberEmail,
                    token: doc.id
                });
            }
        });

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theppsuchronicles.com';
        const postUrl = `${siteUrl}/diaries/${postId}`;

        // Send emails using the shared utility (no more internal HTTP fetch)
        const emailPromises = Array.from(uniqueSubscribers.values()).map(async (sub) => {
            const unsubscribeUrl = `${siteUrl}/diaries/unsubscribe?token=${sub.token}`;

            // Calculate content preview (50% of context)
            const strippedContent = content ? content.replace(/<[^>]*>/g, '').trim() : '';
            const previewLength = Math.floor(strippedContent.length * 0.5);
            // Refined content preview: preserve structure and improve spacing
            const contentPreview = strippedContent.length > 0
                ? strippedContent.substring(0, previewLength).replace(/\s+\S*$/, '') + '...'
                : '';

            try {
                await sendDiaryEmail({
                    type: 'new_post',
                    to: sub.email,
                    writerName: authorName,
                    authorAvatar,
                    postTitle: title,
                    postSubtitle: subtitle,
                    readTime,
                    postUrl,
                    unsubscribeUrl,
                    featuredImage: coverImage,
                    contentPreview,
                    publishedAt
                });
                return { email: sub.email, status: 'sent' };
            } catch (err) {
                console.error(`Failed to send email to ${sub.email}:`, err);
                return { email: sub.email, status: 'failed' };
            }
        });

        const results = await Promise.allSettled(emailPromises);
        const sent = results.filter(r => r.status === 'fulfilled' && (r as any).value?.status === 'sent').length;

        return NextResponse.json({ success: true, sent, total: uniqueSubscribers.size });
    } catch (error: any) {
        console.error('Notify subscribers error:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to notify subscribers' },
            { status: 500 }
        );
    }
}
