import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { updateGameSchema } from '@/types/basketball';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

        const { id } = await params;
        const docRef = db.collection('basketball_games').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        const data = doc.data();

        let homeTeamData = null;
        let awayTeamData = null;

        if (data?.homeTeamId) {
            const homeDoc = await db.collection('basketball_teams').doc(data.homeTeamId).get();
            if (homeDoc.exists) homeTeamData = homeDoc.data();
        }

        if (data?.awayTeamId) {
            const awayDoc = await db.collection('basketball_teams').doc(data.awayTeamId).get();
            if (awayDoc.exists) awayTeamData = awayDoc.data();
        }

        const game = {
            id: doc.id,
            ...data,
            homeTeamName: homeTeamData?.name,
            homeTeamLogo: homeTeamData?.logo,
            homeTeamAbbr: homeTeamData?.abbreviation,
            awayTeamName: awayTeamData?.name,
            awayTeamLogo: awayTeamData?.logo,
            awayTeamAbbr: awayTeamData?.abbreviation,
            date: data?.date?.toDate?.()?.toISOString() || data?.date,
            createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
            updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt,
        };

        return NextResponse.json({ game });
    } catch (error) {
        console.error('Error fetching game:', error);
        return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
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

        const validationResult = updateGameSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const data = validationResult.data;
        const docRef = db.collection('basketball_games').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        const updateData: Record<string, any> = {
            ...data,
            updatedAt: Timestamp.now(),
        };

        if (data.date) {
            updateData.date = Timestamp.fromDate(new Date(data.date as string));
        }

        await docRef.update(updateData);

        return NextResponse.json({ id, message: 'Game updated successfully' });
    } catch (error) {
        console.error('Error updating game:', error);
        return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
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
        const docRef = db.collection('basketball_games').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        await docRef.delete();

        return NextResponse.json({ message: 'Game deleted successfully' });
    } catch (error) {
        console.error('Error deleting game:', error);
        return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 });
    }
}
