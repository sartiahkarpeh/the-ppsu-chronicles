import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
        }

        const { searchParams } = new URL(request.url);
        const gameId = searchParams.get('gameId');

        if (gameId) {
            // Get active stream for a specific game
            const snapshot = await db
                .collection('basketball_streams')
                .where('gameId', '==', gameId)
                .where('status', '==', 'live')
                .limit(1)
                .get();

            if (snapshot.empty) {
                return NextResponse.json({ isLive: false, stream: null });
            }

            const streamDoc = snapshot.docs[0];
            return NextResponse.json({
                isLive: true,
                stream: { id: streamDoc.id, ...streamDoc.data() },
            });
        }

        // Get all streams (for admin history)
        const snapshot = await db
            .collection('basketball_streams')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const streams = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({ streams });
    } catch (error) {
        console.error('Error fetching streams:', error);
        return NextResponse.json({ error: 'Failed to fetch streams' }, { status: 500 });
    }
}
