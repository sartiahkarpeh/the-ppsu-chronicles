import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { sendDiaryEmail } from '@/lib/diary/email';

// Rate limit: send emails in batches to avoid hitting Resend's API limits
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1200; // ~4 emails/sec (Resend free tier = 10/sec, leaving headroom)

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

        // Get ONLY this writer's active subscribers (not all subscribers globally)
        const subsSnap = await adminDb.collection('diary_subscriptions')
            .where('writerId', '==', authorId)
            .where('isActive', '==', true)
            .get();

        if (subsSnap.empty) {
            console.log(`No active subscribers found for writer ${authorId}`);
            return NextResponse.json({ success: true, sent: 0, total: 0 });
        }

        // Deduplicate by email (a subscriber might have multiple entries)
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

        // Calculate content preview (50% of content, stripped of HTML)
        const strippedContent = content ? content.replace(/<[^>]*>/g, '').trim() : '';
        const previewLength = Math.floor(strippedContent.length * 0.5);
        const contentPreview = strippedContent.length > 0
            ? strippedContent.substring(0, previewLength).replace(/\s+\S*$/, '') + '...'
            : '';

        const subscribers = Array.from(uniqueSubscribers.values());
        const results: { email: string; status: 'sent' | 'failed'; error?: string }[] = [];

        console.log(`Sending notifications to ${subscribers.length} subscribers for post "${title}" by ${authorName}`);

        // Send emails in batches with delays to respect rate limits
        for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
            const batch = subscribers.slice(i, i + BATCH_SIZE);

            const batchResults = await Promise.allSettled(
                batch.map(async (sub) => {
                    const unsubscribeUrl = `${siteUrl}/diaries/unsubscribe?token=${sub.token}`;

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
                        console.log(`✓ Email sent to ${sub.email}`);
                        return { email: sub.email, status: 'sent' as const };
                    } catch (err: any) {
                        console.error(`✗ Failed to send email to ${sub.email}:`, err?.message || err);
                        return { email: sub.email, status: 'failed' as const, error: err?.message };
                    }
                })
            );

            // Collect results
            batchResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    results.push({ email: 'unknown', status: 'failed', error: result.reason?.message });
                }
            });

            // Wait between batches (skip delay after last batch)
            if (i + BATCH_SIZE < subscribers.length) {
                await delay(BATCH_DELAY_MS);
            }
        }

        const sent = results.filter(r => r.status === 'sent').length;
        const failed = results.filter(r => r.status === 'failed').length;

        console.log(`Notification summary: ${sent} sent, ${failed} failed out of ${subscribers.length} total`);

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
