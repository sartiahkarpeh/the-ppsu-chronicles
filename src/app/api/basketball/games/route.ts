import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { createGameSchema } from '@/types/basketball';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
        }
        const { searchParams } = new URL(request.url);

        const status = searchParams.get('status');
        const date = searchParams.get('date');
        const team = searchParams.get('team');
        const limit = searchParams.get('limit');
        const gameType = searchParams.get('gameType');

        let query: FirebaseFirestore.Query = db.collection('basketball_games');

        if (status) {
            query = query.where('status', '==', status);
        }

        if (gameType) {
            query = query.where('gameType', '==', gameType);
        }

        query = query.orderBy('date', 'desc');

        if (limit) {
            query = query.limit(parseInt(limit, 10));
        }

        const snapshot = await query.get();
        let games = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
        }));

        if (team) {
            const searchLower = team.toLowerCase();
            games = games.filter(
                (g: any) =>
                    g.homeTeamId === team ||
                    g.awayTeamId === team ||
                    g.homeTeamName?.toLowerCase().includes(searchLower) ||
                    g.awayTeamName?.toLowerCase().includes(searchLower)
            );
        }

        if (date) {
            const filterDate = new Date(date).toDateString();
            games = games.filter((g: any) => {
                const gameDate = new Date(g.date);
                return gameDate.toDateString() === filterDate;
            });
        }

        return NextResponse.json({
            games,
            total: games.length,
        });
    } catch (error) {
        console.error('Error fetching games:', error);
        return NextResponse.json(
            { error: 'Failed to fetch games' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
        }
        const body = await request.json();

        const validationResult = createGameSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const data = validationResult.data;

        // Convert date string/any to Firestore Timestamp
        const gameDate = data.date ? new Date(data.date as string) : new Date();
        const now = Timestamp.now();

        const gameData = {
            ...data,
            date: Timestamp.fromDate(gameDate),
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection('basketball_games').add(gameData);

        return NextResponse.json({
            id: docRef.id,
            message: 'Game created successfully',
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating game:', error);
        return NextResponse.json(
            { error: 'Failed to create game' },
            { status: 500 }
        );
    }
}
