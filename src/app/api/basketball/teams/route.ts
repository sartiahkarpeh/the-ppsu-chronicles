import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { createTeamSchema } from '@/types/basketball';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

        let query: FirebaseFirestore.Query = db.collection('basketball_teams').orderBy('name', 'asc');

        const snapshot = await query.get();
        const teams = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
        }));

        return NextResponse.json({ teams, total: teams.length });
    } catch (error) {
        console.error('Error fetching teams:', error);
        return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

        const body = await request.json();
        const validationResult = createTeamSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const data = validationResult.data;
        const now = Timestamp.now();

        const teamData = {
            ...data,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection('basketball_teams').add(teamData);

        return NextResponse.json({ id: docRef.id, message: 'Team created successfully' }, { status: 201 });
    } catch (error) {
        console.error('Error creating team:', error);
        return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
    }
}
