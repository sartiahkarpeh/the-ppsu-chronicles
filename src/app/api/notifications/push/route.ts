import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fixtureId, title, body: notificationBody, type, data } = body;

        if (!fixtureId || !title || !notificationBody) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Initialize admin SDK
        const adminApp = getAdminApp();
        if (!adminApp) {
            return NextResponse.json(
                { error: 'Firebase unavailable' },
                { status: 503 }
            );
        }
        const adminDb = getFirestore(adminApp);
        const messaging = getMessaging(adminApp);

        // Get all subscribers for this fixture
        const subscriptionsSnap = await adminDb
            .collection('fixtureNotificationSubscriptions')
            .where('fixtureId', '==', fixtureId)
            .get();

        if (subscriptionsSnap.empty) {
            return NextResponse.json({ message: 'No subscribers', sent: 0 });
        }

        // Get FCM tokens for all subscribers
        const userIds = subscriptionsSnap.docs.map(doc => doc.data().userIdentifier);
        const tokensSnap = await adminDb
            .collection('fcmTokens')
            .where('userId', 'in', userIds.slice(0, 10)) // Firestore 'in' limit is 10
            .get();

        if (tokensSnap.empty) {
            return NextResponse.json({ message: 'No FCM tokens found', sent: 0 });
        }

        const tokens = tokensSnap.docs.map(doc => doc.data().token);

        // Create message payload
        const message = {
            notification: {
                title,
                body: notificationBody,
            },
            data: {
                fixtureId,
                type: type || 'update',
                ...data,
            },
            webpush: {
                notification: {
                    icon: '/afcon-logo.png',
                    badge: '/afcon-badge.png',
                    vibrate: [200, 100, 200],
                },
                fcmOptions: {
                    link: `/afcon25/fixtures/${fixtureId}`,
                },
            },
        };

        // Send to all tokens
        const responses = await Promise.allSettled(
            tokens.map(token =>
                messaging.send({ ...message, token })
            )
        );

        const successCount = responses.filter(r => r.status === 'fulfilled').length;
        const failedTokens: string[] = [];

        responses.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Failed to send to token ${index}:`, result.reason);
                failedTokens.push(tokens[index]);
            }
        });

        // Remove invalid tokens
        if (failedTokens.length > 0) {
            const batch = adminDb.batch();
            for (const token of failedTokens) {
                const tokenDoc = tokensSnap.docs.find(d => d.data().token === token);
                if (tokenDoc) {
                    batch.delete(tokenDoc.ref);
                }
            }
            await batch.commit();
        }

        // Also store as in-app notification
        const notificationsRef = adminDb.collection('notifications');
        const batch = adminDb.batch();

        for (const userId of userIds) {
            const notificationDoc = notificationsRef.doc();
            batch.set(notificationDoc, {
                userId,
                fixtureId,
                type: type || 'update',
                title,
                body: notificationBody,
                read: false,
                timestamp: new Date(),
            });
        }
        await batch.commit();

        return NextResponse.json({
            message: 'Notifications sent',
            sent: successCount,
            failed: failedTokens.length,
            inAppCreated: userIds.length,
        });
    } catch (error) {
        console.error('Error sending push notifications:', error);
        return NextResponse.json(
            { error: 'Failed to send notifications' },
            { status: 500 }
        );
    }
}
