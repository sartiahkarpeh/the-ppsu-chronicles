import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { sendDiaryEmail } from '@/lib/diary/email';

// Resend rate limit: 2 emails/second on free tier
// Send ONE email at a time with 600ms delay (≈1.6 emails/sec, safely under 2/sec)
const DELAY_BETWEEN_EMAILS_MS = 600;
const MAX_RETRIES = 2;

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
    try {
        const {
            postId, authorId, authorName, authorAvatar,
            title, subtitle, tags, readTime, content,
            coverImage, publishedAt
        } = await req.json();

        if (!authorId || !title) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) {
            console.error('Firebase Admin not initialized');
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        // Get ONLY this writer's active subscribers
        const subsSnap = await adminDb.collection('diary_subscriptions')
            .where('writerId', '==', authorId)
            .where('isActive', '==', true)
            .get();

        if (subsSnap.empty) {
            console.log(`No active subscribers found for writer ${authorId}`);
            return NextResponse.json({ success: true, sent: 0, total: 0 });
        }

        // Deduplicate by email
        const uniqueSubscribers = new Map<string, { email: string; token: string; name: string }>();
        subsSnap.docs.forEach(doc => {
            const data = doc.data();
            const email = data.subscriberEmail?.toLowerCase().trim();
            if (email && !uniqueSubscribers.has(email)) {
                uniqueSubscribers.set(email, {
                    email,
                    token: doc.id,
                    name: data.subscriberName || email.split('@')[0],
                });
            }
        });

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theppsuchronicles.com';
        const postUrl = `${siteUrl}/diaries/${postId}`;

        // Calculate content preview
        const strippedContent = content ? content.replace(/<[^>]*>/g, '').trim() : '';
        const previewLength = Math.floor(strippedContent.length * 0.5);
        const contentPreview = strippedContent.length > 0
            ? strippedContent.substring(0, previewLength).replace(/\s+\S*$/, '') + '...'
            : '';

        const subscribers = Array.from(uniqueSubscribers.values());
        const results: { email: string; status: 'sent' | 'failed'; error?: string }[] = [];

        console.log(`Sending notifications to ${subscribers.length} subscribers for post "${title}" by ${authorName}`);

        // Send emails ONE AT A TIME with delay to stay within 2 emails/sec rate limit
        for (let i = 0; i < subscribers.length; i++) {
            const sub = subscribers[i];
            const unsubscribeUrl = `${siteUrl}/diaries/unsubscribe?token=${sub.token}`;

            let sent = false;
            let lastError = '';

            // Retry logic for rate limit (429) errors
            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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
                        publishedAt,
                    });
                    console.log(`✓ [${i + 1}/${subscribers.length}] Email sent to ${sub.email}`);
                    sent = true;
                    break;
                } catch (err: any) {
                    lastError = err?.message || String(err);
                    const isRateLimit = lastError.includes('429') || lastError.includes('rate') || lastError.includes('Too many');

                    if (isRateLimit && attempt < MAX_RETRIES) {
                        // Wait longer before retrying on rate limit
                        const backoff = (attempt + 1) * 1500; // 1.5s, 3s
                        console.log(`⏳ [${i + 1}/${subscribers.length}] Rate limited for ${sub.email}, retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
                        await delay(backoff);
                    } else {
                        console.error(`✗ [${i + 1}/${subscribers.length}] Failed to send to ${sub.email}: ${lastError}`);
                    }
                }
            }

            results.push({
                email: sub.email,
                status: sent ? 'sent' : 'failed',
                ...(sent ? {} : { error: lastError }),
            });

            // Wait between each email to respect the 2/sec rate limit
            if (i < subscribers.length - 1) {
                await delay(DELAY_BETWEEN_EMAILS_MS);
            }
        }

        const sent = results.filter(r => r.status === 'sent').length;
        const failed = results.filter(r => r.status === 'failed').length;

        console.log(`✅ Notification complete: ${sent} sent, ${failed} failed out of ${subscribers.length} total`);

        if (failed > 0) {
            const failedEmails = results.filter(r => r.status === 'failed').map(r => `${r.email}: ${r.error}`);
            console.error('Failed emails:', failedEmails);
        }

        return NextResponse.json({
            success: true,
            sent,
            failed,
            total: subscribers.length,
        });
    } catch (error: any) {
        console.error('Notify subscribers error:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to notify subscribers' },
            { status: 500 }
        );
    }
}
