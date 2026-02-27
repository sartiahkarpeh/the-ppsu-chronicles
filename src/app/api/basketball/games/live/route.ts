import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

        // Query IN PROGRESS games optimally suited for polling
        const snapshot = await db.collection('basketball_games')
            .where('status', 'in', ['live', 'ht'])
            .orderBy('date', 'desc')
            .get();

        const games = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
        }));

        return NextResponse.json({ games, total: games.length });
    } catch (error) {
        console.error('Error fetching live games:', error);
        return NextResponse.json({ error: 'Failed to fetch live games' }, { status: 500 });
    }
}
