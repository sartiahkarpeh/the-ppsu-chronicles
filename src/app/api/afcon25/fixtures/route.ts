import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { createFixtureSchema } from '@/types/fixtureTypes';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * GET /api/afcon25/fixtures
 * List fixtures with optional filters
 */
export async function GET(request: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json(
                { error: 'Database unavailable' },
                { status: 503 }
            );
        }
        const { searchParams } = new URL(request.url);

        // Parse query parameters
        const status = searchParams.get('status');
        const date = searchParams.get('date');
        const team = searchParams.get('team');
        const groupOrStage = searchParams.get('groupOrStage');
        const limit = searchParams.get('limit');
        const featured = searchParams.get('featured');

        // Build query
        let query: FirebaseFirestore.Query = db.collection('fixtures');

        if (status) {
            query = query.where('status', '==', status);
        }

        if (groupOrStage) {
            query = query.where('groupOrStage', '==', groupOrStage);
        }

        if (featured === 'true') {
            query = query.where('isFeatured', '==', true);
        }

        // Order by kickoff date
        query = query.orderBy('kickoffDateTime', 'asc');

        if (limit) {
            query = query.limit(parseInt(limit, 10));
        }

        const snapshot = await query.get();
        let fixtures = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert Timestamps to ISO strings for JSON serialization
            kickoffDateTime: doc.data().kickoffDateTime?.toDate?.()?.toISOString() || doc.data().kickoffDateTime,
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
        }));

        // Client-side filtering for team name (Firestore doesn't support OR queries)
        if (team) {
            const searchLower = team.toLowerCase();
            fixtures = fixtures.filter(
                (f: any) =>
                    f.homeTeamName?.toLowerCase().includes(searchLower) ||
                    f.awayTeamName?.toLowerCase().includes(searchLower)
            );
        }

        // Client-side filtering for date
        if (date) {
            const filterDate = new Date(date).toDateString();
            fixtures = fixtures.filter((f: any) => {
                const kickoff = new Date(f.kickoffDateTime);
                return kickoff.toDateString() === filterDate;
            });
        }

        return NextResponse.json({
            fixtures,
            total: fixtures.length,
        });
    } catch (error) {
        console.error('Error fetching fixtures:', error);
        return NextResponse.json(
            { error: 'Failed to fetch fixtures' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/afcon25/fixtures
 * Create a new fixture
 */
export async function POST(request: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json(
                { error: 'Database unavailable' },
                { status: 503 }
            );
        }
        const body = await request.json();

        // Validate request body
        const validationResult = createFixtureSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const data = validationResult.data;

        // Convert kickoffDateTime to Firestore Timestamp
        const kickoffDate = new Date(data.kickoffDateTime);
        const now = Timestamp.now();

        const fixtureData = {
            ...data,
            kickoffDateTime: Timestamp.fromDate(kickoffDate),
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection('fixtures').add(fixtureData);

        return NextResponse.json({
            id: docRef.id,
            message: 'Fixture created successfully',
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating fixture:', error);
        return NextResponse.json(
            { error: 'Failed to create fixture' },
            { status: 500 }
        );
    }
}
