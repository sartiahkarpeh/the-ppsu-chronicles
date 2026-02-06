// src/app/api/valentines/admin/users/route.ts
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * GET /api/valentines/admin/users
 * Get all registered Valentine's users and statistics
 * Protected by Firebase Auth on the frontend (/admin pages check auth)
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

        // Get all users
        const usersSnapshot = await db.collection('valentines_users')
            .orderBy('createdAt', 'desc')
            .get();

        const users = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                enrollmentNumber: data.enrollmentNumber,
                fullName: data.fullName,
                whatsappNumber: data.whatsappNumber,
                hasSpun: data.hasSpun,
                assignedTo: data.assignedTo,
                spinTimestamp: data.spinTimestamp?.toDate?.()?.toISOString() || null,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
            };
        });

        // Get statistics
        const totalUsers = users.length;
        const usersSpun = users.filter(u => u.hasSpun).length;
        const usersNotSpun = totalUsers - usersSpun;

        return NextResponse.json({
            users,
            stats: {
                totalUsers,
                usersSpun,
                usersNotSpun,
            },
        });
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
