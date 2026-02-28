import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ gameId: string }> }
) {
    const { gameId } = await params;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as 'broadcaster' | 'viewer';

    if (!role || !['broadcaster', 'viewer'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role. Must be "broadcaster" or "viewer".' }, { status: 400 });
    }

    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !apiKey || !apiSecret) {
        console.error('Missing LiveKit environment variables');
        return NextResponse.json({ error: 'LiveKit not configured' }, { status: 503 });
    }

    const roomName = `basketball-game-${gameId}`;

    try {
        const at = new AccessToken(apiKey, apiSecret, {
            identity: role === 'broadcaster'
                ? `broadcaster-admin`
                : `viewer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            ttl: '6h',
        });

        if (role === 'broadcaster') {
            at.addGrant({
                room: roomName,
                roomCreate: true,
                roomJoin: true,
                canPublish: true,
                canSubscribe: false,
            });
        } else {
            at.addGrant({
                room: roomName,
                roomJoin: true,
                canPublish: false,
                canSubscribe: true,
            });
        }

        const token = await at.toJwt();

        return NextResponse.json({
            token,
            url: livekitUrl,
            roomName,
        });
    } catch (error) {
        console.error('Error generating LiveKit token:', error);
        return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
    }
}
