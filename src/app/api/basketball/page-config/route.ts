import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { pageConfigSchema } from '@/types/basketball';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

        const docRef = db.collection('basketball_settings').doc('page_config');
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ message: 'No config found' }, { status: 404 });
        }

        const data = doc.data();
        const config = {
            id: doc.id,
            ...data,
            updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt,
        };

        return NextResponse.json({ config });
    } catch (error) {
        console.error('Error fetching page config:', error);
        return NextResponse.json({ error: 'Failed to fetch page config' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

        const body = await request.json();

        // Allow partial updates
        const validationResult = pageConfigSchema.partial().safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const updateData: Record<string, any> = {
            ...validationResult.data,
            updatedAt: Timestamp.now(),
        };

        // Merge true so we don't overwrite other fields we didn't specify
        await db.collection('basketball_settings').doc('page_config').set(updateData, { merge: true });

        return NextResponse.json({ message: 'Page Config updated successfully' });
    } catch (error) {
        console.error('Error updating page config:', error);
        return NextResponse.json({ error: 'Failed to update page config' }, { status: 500 });
    }
}
