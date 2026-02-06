// src/app/api/valentines/me/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyToken } from '@/lib/valentines/jwt';

export async function GET() {
    try {
        // Get token from cookies using Next.js cookies API
        const cookieStore = await cookies();
        const token = cookieStore.get('valentine_token')?.value;

        if (!token) {
            console.log('[Valentine /me] No token found in cookies');
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Verify token
        const payload = verifyToken(token);
        if (!payload || payload.type !== 'user') {
            console.log('[Valentine /me] Token verification failed');
            return NextResponse.json(
                { error: 'Invalid or expired session' },
                { status: 401 }
            );
        }

        const db = getAdminDb();
        if (!db) {
            return NextResponse.json(
                { error: 'Database connection failed' },
                { status: 500 }
            );
        }

        // Get user data
        const userDoc = await db.collection('valentines_users').doc(payload.enrollmentNumber).get();
        if (!userDoc.exists) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const userData = userDoc.data()!;

        // Get assignment details if user has spun
        let assignedPerson = null;
        if (userData.assignedTo) {
            const assignedDoc = await db.collection('valentines_users').doc(userData.assignedTo).get();
            if (assignedDoc.exists) {
                const assignedData = assignedDoc.data()!;
                assignedPerson = {
                    fullName: assignedData.fullName,
                    enrollmentNumber: assignedData.enrollmentNumber,
                    whatsappNumber: assignedData.whatsappNumber,
                };
            }
        }

        // Find who has been assigned to buy a gift for the current user (gift giver)
        let giftGiver = null;
        const giftGiverSnapshot = await db.collection('valentines_users')
            .where('assignedTo', '==', payload.enrollmentNumber)
            .limit(1)
            .get();

        if (!giftGiverSnapshot.empty) {
            const giverData = giftGiverSnapshot.docs[0].data();
            giftGiver = {
                fullName: giverData.fullName,
                enrollmentNumber: giverData.enrollmentNumber,
                whatsappNumber: giverData.whatsappNumber,
            };
        }

        // Get system settings
        const settingsDoc = await db.collection('valentines_settings').doc('config').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : { spinEnabled: false, systemLocked: false };

        return NextResponse.json({
            user: {
                fullName: userData.fullName,
                enrollmentNumber: userData.enrollmentNumber,
                whatsappNumber: userData.whatsappNumber,
                hasSpun: userData.hasSpun,
                spinTimestamp: userData.spinTimestamp?.toDate?.()?.toISOString() || null,
            },
            assignedPerson,
            giftGiver,
            settings: {
                spinEnabled: settings?.spinEnabled || false,
                systemLocked: settings?.systemLocked || false,
            },
        });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
