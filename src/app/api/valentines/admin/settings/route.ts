// src/app/api/valentines/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/valentines/admin/settings
 * Get Valentine's system settings
 */
export async function GET() {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json(
                { error: 'Database connection failed' },
                { status: 500 }
            );
        }

        const settingsDoc = await db.collection('valentines_settings').doc('config').get();

        if (!settingsDoc.exists) {
            // Return default settings if not initialized
            return NextResponse.json({
                spinEnabled: false,
                systemLocked: false,
                updatedAt: null,
            });
        }

        const data = settingsDoc.data();
        return NextResponse.json({
            spinEnabled: data?.spinEnabled || false,
            systemLocked: data?.systemLocked || false,
            updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || null,
        });
    } catch (error) {
        console.error('Get settings error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/valentines/admin/settings
 * Update Valentine's system settings
 */
export async function POST(request: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json(
                { error: 'Database connection failed' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { spinEnabled, systemLocked } = body;

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (typeof spinEnabled === 'boolean') {
            updateData.spinEnabled = spinEnabled;
        }

        if (typeof systemLocked === 'boolean') {
            updateData.systemLocked = systemLocked;
        }

        await db.collection('valentines_settings').doc('config').set(
            updateData,
            { merge: true }
        );

        return NextResponse.json({
            message: 'Settings updated successfully',
        });
    } catch (error) {
        console.error('Update settings error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
