import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { updateTeamSchema } from '@/types/basketball';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

        const { id } = await params;
        const docRef = db.collection('basketball_teams').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        const data = doc.data();
        const team = {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
            updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt,
        };

        return NextResponse.json({ team });
    } catch (error) {
        console.error('Error fetching team:', error);
        return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
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

        const validationResult = updateTeamSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const docRef = db.collection('basketball_teams').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        const updateData = {
            ...validationResult.data,
            updatedAt: Timestamp.now(),
        };

        await docRef.update(updateData);

        return NextResponse.json({ id, message: 'Team updated successfully' });
    } catch (error) {
        console.error('Error updating team:', error);
        return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
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
        const docRef = db.collection('basketball_teams').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        await docRef.delete();

        return NextResponse.json({ message: 'Team deleted successfully' });
    } catch (error) {
        console.error('Error deleting team:', error);
        return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
    }
}
