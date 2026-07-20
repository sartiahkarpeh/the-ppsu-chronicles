import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';
import {
    MEMORIAL_STREAM_COLLECTION,
    MEMORIAL_STREAM_DOC_ID,
} from '@/types/memorialStream';

export const dynamic = 'force-dynamic';

const actionSchema = z.object({
    action: z.enum(['start', 'end']),
    title: z.string().trim().max(120).optional().default(''),
});

function streamDoc() {
    const db = getAdminDb();
    return db ? db.collection(MEMORIAL_STREAM_COLLECTION).doc(MEMORIAL_STREAM_DOC_ID) : null;
}

/**
 * GET — public. Current memorial stream status.
 *
 * The viewer UI subscribes to Firestore directly for realtime updates; this
 * endpoint exists for the server-rendered first paint and as a fallback when
 * the realtime listener can't connect.
 */
export async function GET() {
    const ref = streamDoc();
    if (!ref) {
        return NextResponse.json({ status: 'offline', currentViewers: 0, title: '' });
    }

    try {
        const snap = await ref.get();
        if (!snap.exists) {
            return NextResponse.json({ status: 'offline', currentViewers: 0, title: '' });
        }

        const data = snap.data() || {};
        return NextResponse.json({
            status: data.status || 'offline',
            currentViewers: data.currentViewers || 0,
            viewerPeak: data.viewerPeak || 0,
            title: data.title || '',
            startedAt: data.startedAt?.toDate?.().toISOString() || null,
            endedAt: data.endedAt?.toDate?.().toISOString() || null,
        });
    } catch (error) {
        console.error('[Halala stream] Failed to read status:', error);
        return NextResponse.json({ status: 'offline', currentViewers: 0, title: '' });
    }
}

/**
 * POST — admin only. Marks the memorial stream live or ended.
 *
 * Ending is idempotent and safe to call from an unload handler, so a dropped
 * phone or closed tab can't leave the page showing "live" forever.
 */
export async function POST(request: NextRequest) {
    const check = await verifyAdmin(request);
    if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const ref = streamDoc();
    if (!ref) {
        return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });
    }

    let parsed;
    try {
        parsed = actionSchema.parse(await request.json());
    } catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const now = new Date();

    try {
        if (parsed.action === 'start') {
            await ref.set(
                {
                    status: 'live',
                    startedAt: now,
                    endedAt: null,
                    currentViewers: 0,
                    viewerPeak: 0,
                    title: parsed.title,
                    broadcasterUid: check.uid,
                    updatedAt: now,
                },
                { merge: true }
            );
        } else {
            await ref.set(
                {
                    status: 'ended',
                    endedAt: now,
                    currentViewers: 0,
                    updatedAt: now,
                },
                { merge: true }
            );
        }

        return NextResponse.json({ success: true, status: parsed.action === 'start' ? 'live' : 'ended' });
    } catch (error) {
        console.error('[Halala stream] Failed to update status:', error);
        return NextResponse.json({ error: 'Failed to update stream status.' }, { status: 500 });
    }
}
