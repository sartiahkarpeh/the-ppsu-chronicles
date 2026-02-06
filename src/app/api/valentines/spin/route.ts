// src/app/api/valentines/spin/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyToken } from '@/lib/valentines/jwt';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export async function POST() {
    try {
        // Get token from cookies using Next.js cookies API
        const cookieStore = await cookies();
        const token = cookieStore.get('valentine_token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Verify token
        const payload = verifyToken(token);
        if (!payload || payload.type !== 'user') {
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

        const enrollmentNumber = payload.enrollmentNumber;

        // Check system settings
        const settingsDoc = await db.collection('valentines_settings').doc('config').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : null;

        if (!settings?.spinEnabled) {
            return NextResponse.json(
                { error: 'Spin phase is not currently open' },
                { status: 403 }
            );
        }

        if (settings?.systemLocked) {
            return NextResponse.json(
                { error: 'System is locked. Spinning is no longer available.' },
                { status: 403 }
            );
        }

        // Get current user
        const userRef = db.collection('valentines_users').doc(enrollmentNumber);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const userData = userDoc.data()!;

        // Check if already spun
        if (userData.hasSpun) {
            return NextResponse.json(
                { error: 'You have already spun! Each user can only spin once.' },
                { status: 400 }
            );
        }

        // Get all users except current user
        const usersSnapshot = await db.collection('valentines_users').get();
        const allUsers = usersSnapshot.docs
            .map(doc => doc.data())
            .filter(u => u.enrollmentNumber !== enrollmentNumber);

        if (allUsers.length === 0) {
            return NextResponse.json(
                { error: 'No other users available for assignment. Please wait for more registrations.' },
                { status: 400 }
            );
        }

        // Shuffle users for randomness
        const shuffledUsers = shuffleArray(allUsers);

        // Prefer users who haven't spun yet for fairness
        const notSpunUsers = shuffledUsers.filter(u => !u.hasSpun);

        // Select target: prefer users who haven't spun, fallback to any user
        const targetUser = notSpunUsers.length > 0 ? notSpunUsers[0] : shuffledUsers[0];

        // Update user atomically
        await userRef.update({
            hasSpun: true,
            assignedTo: targetUser.enrollmentNumber,
            spinTimestamp: FieldValue.serverTimestamp(),
        });

        // Return assigned person's details
        return NextResponse.json({
            success: true,
            assignedPerson: {
                fullName: targetUser.fullName,
                enrollmentNumber: targetUser.enrollmentNumber,
                whatsappNumber: targetUser.whatsappNumber,
            },
        });
    } catch (error) {
        console.error('Spin error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred during spin. Please try again.' },
            { status: 500 }
        );
    }
}
