import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { updateFixtureSchema } from '@/types/fixtureTypes';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * GET /api/afcon25/fixtures/[id]
 * Get a single fixture by ID or slug
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const db = getAdminDb();
        const { id } = await params;

        // First try to get by document ID
        let docRef = db.collection('fixtures').doc(id);
        let doc = await docRef.get();

        // If not found, try by slug
        if (!doc.exists) {
            const slugQuery = await db
                .collection('fixtures')
                .where('slug', '==', id)
                .limit(1)
                .get();

            if (!slugQuery.empty) {
                doc = slugQuery.docs[0];
            }
        }

        if (!doc.exists) {
            return NextResponse.json(
                { error: 'Fixture not found' },
                { status: 404 }
            );
        }

        const data = doc.data();
        const fixture = {
            id: doc.id,
            ...data,
            // Convert Timestamps to ISO strings
            kickoffDateTime: data?.kickoffDateTime?.toDate?.()?.toISOString() || data?.kickoffDateTime,
            createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
            updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt,
        };

        return NextResponse.json({ fixture });
    } catch (error) {
        console.error('Error fetching fixture:', error);
        return NextResponse.json(
            { error: 'Failed to fetch fixture' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/afcon25/fixtures/[id]
 * Update a fixture
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const db = getAdminDb();
        const { id } = await params;
        const body = await request.json();

        // Validate request body
        const validationResult = updateFixtureSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const data = validationResult.data;
        const docRef = db.collection('fixtures').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json(
                { error: 'Fixture not found' },
                { status: 404 }
            );
        }

        // Prepare update data
        const updateData: Record<string, any> = {
            ...data,
            updatedAt: Timestamp.now(),
        };

        // Convert kickoffDateTime if provided
        if (data.kickoffDateTime) {
            updateData.kickoffDateTime = Timestamp.fromDate(new Date(data.kickoffDateTime));
        }

        await docRef.update(updateData);

        return NextResponse.json({
            id,
            message: 'Fixture updated successfully',
        });
    } catch (error) {
        console.error('Error updating fixture:', error);
        return NextResponse.json(
            { error: 'Failed to update fixture' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/afcon25/fixtures/[id]
 * Delete a fixture
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const db = getAdminDb();
        const { id } = await params;

        const docRef = db.collection('fixtures').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json(
                { error: 'Fixture not found' },
                { status: 404 }
            );
        }

        await docRef.delete();

        return NextResponse.json({
            message: 'Fixture deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting fixture:', error);
        return NextResponse.json(
            { error: 'Failed to delete fixture' },
            { status: 500 }
        );
    }
}
