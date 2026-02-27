import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { createPlayerSchema } from '@/types/basketball';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

        const { searchParams } = new URL(request.url);
        const teamId = searchParams.get('teamId');
        const status = searchParams.get('status');
        const search = searchParams.get('search');

        let query: FirebaseFirestore.Query = db.collection('basketball_players');

        if (teamId) {
            query = query.where('teamId', '==', teamId);
        }

        if (status) {
            query = query.where('status', '==', status);
        }

        query = query.orderBy('name', 'asc');

        const snapshot = await query.get();
        let players = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
        }));

        if (search) {
            const searchLower = search.toLowerCase();
            players = players.filter(
                (p: any) => p.name.toLowerCase().includes(searchLower)
            );
        }

        return NextResponse.json({ players, total: players.length });
    } catch (error) {
        console.error('Error fetching players:', error);
        return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

        const body = await request.json();
        const validationResult = createPlayerSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const data = validationResult.data;
        const now = Timestamp.now();

        const playerData = {
            ...data,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection('basketball_players').add(playerData);

        return NextResponse.json({ id: docRef.id, message: 'Player created successfully' }, { status: 201 });
    } catch (error) {
        console.error('Error creating player:', error);
        return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
    }
}
