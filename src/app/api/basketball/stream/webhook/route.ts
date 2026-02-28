import { NextRequest, NextResponse } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
        return NextResponse.json({ error: 'LiveKit not configured' }, { status: 503 });
    }

    try {
        const body = await request.text();
        const authHeader = request.headers.get('authorization') || '';

        const receiver = new WebhookReceiver(apiKey, apiSecret);
        const event = await receiver.receive(body, authHeader);

        console.log(`[LiveKit Webhook] Event: ${event.event}, Room: ${event.room?.name}`);

        const db = getAdminDb();
        if (!db) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
        }

        const roomName = event.room?.name;
        if (!roomName || !roomName.startsWith('basketball-game-')) {
            return NextResponse.json({ received: true });
        }

        const gameId = roomName.replace('basketball-game-', '');

        switch (event.event) {
            case 'room_started': {
                // Find or create stream session, mark game as streaming
                const streamsRef = db.collection('basketball_streams');
                const existing = await streamsRef
                    .where('gameId', '==', gameId)
                    .where('status', '==', 'live')
                    .limit(1)
                    .get();

                if (existing.empty) {
                    await streamsRef.add({
                        gameId,
                        status: 'live',
                        startedAt: new Date(),
                        endedAt: null,
                        viewerPeak: 0,
                        currentViewers: 0,
                        roomId: roomName,
                        broadcasterId: 'admin',
                        resolution: '1280x720',
                        recordingUrl: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }

                await db.collection('basketball_games').doc(gameId).update({
                    isStreaming: true,
                    updatedAt: new Date(),
                });

                console.log(`[LiveKit Webhook] Game ${gameId} is now streaming`);
                break;
            }

            case 'room_finished': {
                // End all live streams for this game
                const liveStreams = await db.collection('basketball_streams')
                    .where('gameId', '==', gameId)
                    .where('status', '==', 'live')
                    .get();

                const batch = db.batch();
                liveStreams.docs.forEach(doc => {
                    batch.update(doc.ref, {
                        status: 'ended',
                        endedAt: new Date(),
                        currentViewers: 0,
                        updatedAt: new Date(),
                    });
                });
                await batch.commit();

                await db.collection('basketball_games').doc(gameId).update({
                    isStreaming: false,
                    updatedAt: new Date(),
                });

                console.log(`[LiveKit Webhook] Game ${gameId} stream ended`);
                break;
            }

            case 'participant_joined':
            case 'participant_left': {
                const numParticipants = event.room?.numParticipants || 0;
                // Subtract 1 for the broadcaster
                const viewerCount = Math.max(0, numParticipants - 1);

                const streams = await db.collection('basketball_streams')
                    .where('gameId', '==', gameId)
                    .where('status', '==', 'live')
                    .limit(1)
                    .get();

                if (!streams.empty) {
                    const streamDoc = streams.docs[0];
                    const currentData = streamDoc.data();
                    const newPeak = Math.max(currentData.viewerPeak || 0, viewerCount);

                    await streamDoc.ref.update({
                        currentViewers: viewerCount,
                        viewerPeak: newPeak,
                        updatedAt: new Date(),
                    });
                }

                console.log(`[LiveKit Webhook] Game ${gameId} viewers: ${viewerCount}`);
                break;
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('[LiveKit Webhook] Error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
