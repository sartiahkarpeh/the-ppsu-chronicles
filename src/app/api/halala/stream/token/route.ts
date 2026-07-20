import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { verifyAdmin } from '@/lib/adminAuth';
import { MEMORIAL_ROOM } from '@/types/memorialStream';

export const dynamic = 'force-dynamic';

/**
 * Issues LiveKit access tokens for the Halala memorial stream.
 *
 *   GET /api/halala/stream/token?role=viewer       → open to the public
 *   GET /api/halala/stream/token?role=broadcaster  → requires an admin ID token
 *
 * The broadcaster grant carries canPublish, so it is gated on a server-verified
 * Firebase admin claim. A viewer grant can only subscribe.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    if (role !== 'broadcaster' && role !== 'viewer') {
        return NextResponse.json(
            { error: 'Invalid role. Must be "broadcaster" or "viewer".' },
            { status: 400 }
        );
    }

    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !apiKey || !apiSecret) {
        console.error('[Halala stream] Missing LiveKit environment variables');
        return NextResponse.json({ error: 'Live streaming is not configured.' }, { status: 503 });
    }

    let identity: string;

    if (role === 'broadcaster') {
        const check = await verifyAdmin(request);
        if (!check.ok) {
            return NextResponse.json({ error: check.error }, { status: check.status });
        }
        identity = `broadcaster-${check.uid}`;
    } else {
        identity = `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    try {
        const at = new AccessToken(apiKey, apiSecret, {
            identity,
            // Long enough to cover a full service without a mid-stream refresh.
            ttl: '6h',
        });

        if (role === 'broadcaster') {
            at.addGrant({
                room: MEMORIAL_ROOM,
                roomCreate: true,
                roomJoin: true,
                canPublish: true,
                canSubscribe: false,
            });
        } else {
            at.addGrant({
                room: MEMORIAL_ROOM,
                roomJoin: true,
                canPublish: false,
                canSubscribe: true,
            });
        }

        return NextResponse.json({
            token: await at.toJwt(),
            url: livekitUrl,
            roomName: MEMORIAL_ROOM,
        });
    } catch (error) {
        console.error('[Halala stream] Error generating LiveKit token:', error);
        return NextResponse.json({ error: 'Failed to generate token.' }, { status: 500 });
    }
}
