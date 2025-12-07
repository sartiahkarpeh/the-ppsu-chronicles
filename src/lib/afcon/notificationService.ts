import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

export type NotificationType = 'goal' | 'kickoff' | 'ht' | 'ft' | 'card' | 'update' | 'substitution' | 'injury';

interface NotificationPayload {
    fixtureId: string;
    type: NotificationType;
    title: string;
    body: string;
    homeTeam?: string;
    awayTeam?: string;
    score?: string;
}

/**
 * Send push notification via API (for device alerts)
 */
async function sendPushNotification(payload: NotificationPayload): Promise<void> {
    try {
        const response = await fetch('/api/notifications/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fixtureId: payload.fixtureId,
                title: payload.title,
                body: payload.body,
                type: payload.type,
                data: {
                    homeTeam: payload.homeTeam,
                    awayTeam: payload.awayTeam,
                    score: payload.score,
                },
            }),
        });

        if (!response.ok) {
            console.error('Failed to send push notification:', await response.text());
        } else {
            const result = await response.json();
            console.log('Push notifications sent:', result);
        }
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
}

/**
 * Send notification to all users subscribed to a fixture
 * Creates in-app notifications AND sends push notifications
 */
export async function sendFixtureNotification(payload: NotificationPayload): Promise<number> {
    const { fixtureId, type, title, body, homeTeam, awayTeam, score } = payload;

    try {
        // Get all subscribers for this fixture
        const subscriptionsRef = collection(db, 'fixtureNotificationSubscriptions');
        const q = query(subscriptionsRef, where('fixtureId', '==', fixtureId));
        const subscribersSnap = await getDocs(q);

        if (subscribersSnap.empty) {
            console.log('No subscribers for fixture:', fixtureId);
            return 0;
        }

        // Create in-app notification for each subscriber
        const notificationsRef = collection(db, 'notifications');
        const notifications = subscribersSnap.docs.map(doc => {
            const subscriber = doc.data();
            return addDoc(notificationsRef, {
                userId: subscriber.userIdentifier,
                fixtureId,
                type,
                title,
                body,
                homeTeam,
                awayTeam,
                score,
                read: false,
                timestamp: Timestamp.now(),
            });
        });

        await Promise.all(notifications);
        console.log(`Sent ${notifications.length} in-app notifications for fixture:`, fixtureId);

        // Also send push notifications
        await sendPushNotification(payload);

        return notifications.length;
    } catch (error) {
        console.error('Error sending notifications:', error);
        return 0;
    }
}

/**
 * Pre-built notification templates
 */
export const notificationTemplates = {
    goal: (homeTeam: string, awayTeam: string, scorer: string, score: string) => ({
        type: 'goal' as NotificationType,
        title: `⚽ GOAL! ${homeTeam} vs ${awayTeam}`,
        body: scorer ? `${scorer} scores! Score: ${score}` : `Goal scored! Score: ${score}`,
    }),

    kickoff: (homeTeam: string, awayTeam: string) => ({
        type: 'kickoff' as NotificationType,
        title: `🏟️ Match Started!`,
        body: `${homeTeam} vs ${awayTeam} has kicked off!`,
    }),

    halfTime: (homeTeam: string, awayTeam: string, score: string) => ({
        type: 'ht' as NotificationType,
        title: `⏸️ Half Time`,
        body: `${homeTeam} ${score} ${awayTeam}`,
    }),

    fullTime: (homeTeam: string, awayTeam: string, score: string) => ({
        type: 'ft' as NotificationType,
        title: `🏁 Full Time`,
        body: `Final Score: ${homeTeam} ${score} ${awayTeam}`,
    }),

    yellowCard: (homeTeam: string, awayTeam: string, player: string) => ({
        type: 'card' as NotificationType,
        title: `🟨 Yellow Card`,
        body: `${player} receives a yellow card in ${homeTeam} vs ${awayTeam}`,
    }),

    redCard: (homeTeam: string, awayTeam: string, player: string) => ({
        type: 'card' as NotificationType,
        title: `🟥 Red Card!`,
        body: `${player} is sent off in ${homeTeam} vs ${awayTeam}`,
    }),

    penalty: (homeTeam: string, awayTeam: string, scored: boolean) => ({
        type: 'goal' as NotificationType,
        title: scored ? `⚽ Penalty Scored!` : `❌ Penalty Missed!`,
        body: `Penalty ${scored ? 'converted' : 'missed'} in ${homeTeam} vs ${awayTeam}`,
    }),
};
