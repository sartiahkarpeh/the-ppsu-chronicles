// src/app/api/valentines/admin/export/route.ts
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * GET /api/valentines/admin/export
 * Export all Valentine's assignments as CSV
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

        // Get all users who have spun
        const usersSnapshot = await db.collection('valentines_users')
            .where('hasSpun', '==', true)
            .get();

        // Get all users for name resolution
        const allUsersSnapshot = await db.collection('valentines_users').get();
        const userMap = new Map(
            allUsersSnapshot.docs.map(doc => [doc.data().enrollmentNumber, doc.data()])
        );

        // Build CSV content
        const headers = [
            'From Enrollment',
            'From Name',
            'From WhatsApp',
            'To Enrollment',
            'To Name',
            'To WhatsApp',
            'Spin Timestamp',
        ];

        const rows = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            const assignedUser = userMap.get(data.assignedTo);

            return [
                data.enrollmentNumber,
                data.fullName,
                data.whatsappNumber,
                data.assignedTo,
                assignedUser?.fullName || 'Unknown',
                assignedUser?.whatsappNumber || 'Unknown',
                data.spinTimestamp?.toDate?.()?.toISOString() || '',
            ];
        });

        // Create CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

        // Return as downloadable CSV
        const response = new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="valentines_assignments.csv"',
            },
        });

        return response;
    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
