import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { createSubscriptionSchema } from '@/types/fixtureTypes';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * POST /api/afcon25/fixtures/[id]/subscribe
 * Subscribe to fixture notifications
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const db = getAdminDb();
        const { id: fixtureId } = await params;
        const body = await request.json();

        // Validate request body
        const validationResult = createSubscriptionSchema.safeParse({
            ...body,
            fixtureId,
        });

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const { userIdentifier, channel } = validationResult.data;

        // Check if fixture exists
        const fixtureRef = db.collection('fixtures').doc(fixtureId);
        const fixtureDoc = await fixtureRef.get();

        if (!fixtureDoc.exists) {
            return NextResponse.json(
                { error: 'Fixture not found' },
                { status: 404 }
            );
        }

        // Check if already subscribed
        const existingQuery = await db
            .collection('fixtureNotificationSubscriptions')
            .where('fixtureId', '==', fixtureId)
            .where('userIdentifier', '==', userIdentifier)
            .limit(1)
            .get();

        if (!existingQuery.empty) {
            return NextResponse.json({
                isSubscribed: true,
                subscriptionId: existingQuery.docs[0].id,
                message: 'Already subscribed',
            });
        }

        // Create subscription
        const subscriptionData = {
            fixtureId,
            userIdentifier,
            channel: channel || 'inApp',
            createdAt: Timestamp.now(),
        };

        const docRef = await db.collection('fixtureNotificationSubscriptions').add(subscriptionData);

        return NextResponse.json({
            isSubscribed: true,
            subscriptionId: docRef.id,
            message: 'Subscribed successfully',
        }, { status: 201 });
    } catch (error) {
        console.error('Error subscribing to fixture:', error);
        return NextResponse.json(
            { error: 'Failed to subscribe' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/afcon25/fixtures/[id]/subscribe
 * Unsubscribe from fixture notifications
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const db = getAdminDb();
        const { id: fixtureId } = await params;
        const { searchParams } = new URL(request.url);
        const userIdentifier = searchParams.get('userIdentifier');

        if (!userIdentifier) {
            return NextResponse.json(
                { error: 'User identifier is required' },
                { status: 400 }
            );
        }

        // Find and delete subscription
        const query = await db
            .collection('fixtureNotificationSubscriptions')
            .where('fixtureId', '==', fixtureId)
            .where('userIdentifier', '==', userIdentifier)
            .limit(1)
            .get();

        if (query.empty) {
            return NextResponse.json({
                isSubscribed: false,
                message: 'Not subscribed',
            });
        }

        await query.docs[0].ref.delete();

        return NextResponse.json({
            isSubscribed: false,
            message: 'Unsubscribed successfully',
        });
    } catch (error) {
        console.error('Error unsubscribing from fixture:', error);
        return NextResponse.json(
            { error: 'Failed to unsubscribe' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/afcon25/fixtures/[id]/subscribe
 * Check subscription status
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const db = getAdminDb();
        const { id: fixtureId } = await params;
        const { searchParams } = new URL(request.url);
        const userIdentifier = searchParams.get('userIdentifier');

        if (!userIdentifier) {
            return NextResponse.json(
                { error: 'User identifier is required' },
                { status: 400 }
            );
        }

        const query = await db
            .collection('fixtureNotificationSubscriptions')
            .where('fixtureId', '==', fixtureId)
            .where('userIdentifier', '==', userIdentifier)
            .limit(1)
            .get();

        return NextResponse.json({
            isSubscribed: !query.empty,
        });
    } catch (error) {
        console.error('Error checking subscription:', error);
        return NextResponse.json(
            { error: 'Failed to check subscription' },
            { status: 500 }
        );
    }
}
