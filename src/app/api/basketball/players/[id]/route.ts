import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { updatePlayerSchema } from '@/types/basketball';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

        const { id } = await params;
        const docRef = db.collection('basketball_players').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        const data = doc.data();
        let teamData = null;

        if (data?.teamId) {
            const teamDoc = await db.collection('basketball_teams').doc(data.teamId).get();
            if (teamDoc.exists) teamData = teamDoc.data();
        }

        const player = {
            id: doc.id,
            ...data,
            teamName: teamData?.name,
            teamAbbreviation: teamData?.abbreviation,
            createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
            updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt,
        };

        return NextResponse.json({ player });
    } catch (error) {
        console.error('Error fetching player:', error);
        return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

        const { id } = await params;
        const body = await request.json();

        const validationResult = updatePlayerSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const docRef = db.collection('basketball_players').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        const updateData = {
            ...validationResult.data,
            updatedAt: Timestamp.now(),
        };

        await docRef.update(updateData);

        return NextResponse.json({ id, message: 'Player updated successfully' });
    } catch (error) {
        console.error('Error updating player:', error);
        return NextResponse.json({ error: 'Failed to update player' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

        const { id } = await params;
        const docRef = db.collection('basketball_players').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        await docRef.delete();

        return NextResponse.json({ message: 'Player deleted successfully' });
    } catch (error) {
        console.error('Error deleting player:', error);
        return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 });
    }
}
