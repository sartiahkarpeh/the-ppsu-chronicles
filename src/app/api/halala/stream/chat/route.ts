import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import {
    MEMORIAL_MESSAGES,
    MEMORIAL_REACTIONS,
    MEMORIAL_REACTION_EMOJIS,
    MEMORIAL_STREAM_COLLECTION,
    MEMORIAL_STREAM_DOC_ID,
    MAX_MESSAGE_LENGTH,
} from '@/types/memorialStream';

export const dynamic = 'force-dynamic';

/** Strip control characters and collapse runaway whitespace. */
function clean(input: string): string {
    return input
        .replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '')
        .replace(/\s{3,}/g, '  ')
        .trim();
}

const messageSchema = z.object({
    kind: z.literal('message'),
    guestId: z.string().trim().min(1).max(80),
    guestName: z.string().trim().min(1, 'Please enter your name.').max(60),
    country: z.string().trim().max(60).optional().default(''),
    text: z.string().trim().min(1, 'Please write a message.').max(MAX_MESSAGE_LENGTH),
    // Honeypot — bots fill every field.
    website: z.string().max(0).optional().default(''),
});

const reactionSchema = z.object({
    kind: z.literal('reaction'),
    guestId: z.string().trim().min(1).max(80),
    emoji: z.enum(MEMORIAL_REACTION_EMOJIS),
});

const bodySchema = z.discriminatedUnion('kind', [messageSchema, reactionSchema]);

/**
 * In-memory per-guest rate limit. Resets on cold start, which is fine — this is
 * a speed bump against spam floods during the service, not an audit control.
 */
const lastPost = new Map<string, { message: number; reaction: number }>();
const MESSAGE_COOLDOWN_MS = 2500;
const REACTION_COOLDOWN_MS = 400;

function rateLimited(guestId: string, kind: 'message' | 'reaction'): boolean {
    const now = Date.now();
    const entry = lastPost.get(guestId) || { message: 0, reaction: 0 };
    const cooldown = kind === 'message' ? MESSAGE_COOLDOWN_MS : REACTION_COOLDOWN_MS;

    if (now - entry[kind] < cooldown) return true;

    entry[kind] = now;
    lastPost.set(guestId, entry);

    // Keep the map from growing without bound over a long broadcast.
    if (lastPost.size > 5000) {
        const cutoff = now - 60_000;
        for (const [key, value] of lastPost) {
            if (value.message < cutoff && value.reaction < cutoff) lastPost.delete(key);
        }
    }
    return false;
}

export async function POST(request: NextRequest) {
    const db = getAdminDb();
    if (!db) {
        return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });
    }

    let body;
    try {
        body = bodySchema.parse(await request.json());
    } catch (error) {
        const message =
            error instanceof z.ZodError
                ? error.issues[0]?.message || 'Invalid request.'
                : 'Invalid request.';
        return NextResponse.json({ error: message }, { status: 400 });
    }

    // Only accept chat while the service is actually live.
    const streamSnap = await db
        .collection(MEMORIAL_STREAM_COLLECTION)
        .doc(MEMORIAL_STREAM_DOC_ID)
        .get();

    if (!streamSnap.exists || streamSnap.data()?.status !== 'live') {
        return NextResponse.json({ error: 'The service is not live right now.' }, { status: 409 });
    }

    if (rateLimited(body.guestId, body.kind)) {
        return NextResponse.json(
            { error: 'You are sending messages too quickly. Please wait a moment.' },
            { status: 429 }
        );
    }

    const now = new Date();

    try {
        if (body.kind === 'reaction') {
            await db.collection(MEMORIAL_REACTIONS).add({
                guestId: body.guestId,
                emoji: body.emoji,
                createdAt: now,
            });
            return NextResponse.json({ success: true });
        }

        const text = clean(body.text);
        const guestName = clean(body.guestName);

        if (!text || !guestName) {
            return NextResponse.json({ error: 'Please enter your name and a message.' }, { status: 400 });
        }

        const ref = await db.collection(MEMORIAL_MESSAGES).add({
            guestId: body.guestId,
            guestName,
            country: clean(body.country),
            text,
            createdAt: now,
        });

        return NextResponse.json({ success: true, id: ref.id });
    } catch (error) {
        console.error('[Halala stream] Failed to post:', error);
        return NextResponse.json({ error: 'Could not send. Please try again.' }, { status: 500 });
    }
}
