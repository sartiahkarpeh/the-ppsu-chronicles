'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

export interface InAppNotification {
    id: string;
    fixtureId: string;
    type: 'goal' | 'kickoff' | 'ht' | 'ft' | 'card' | 'update';
    title: string;
    body: string;
    timestamp: Timestamp;
    read: boolean;
    homeTeam?: string;
    awayTeam?: string;
    score?: string;
}

// Storage key for user identifier
const USER_ID_KEY = 'afcon25_user_id';

function getUserIdentifier(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(USER_ID_KEY) || '';
}

interface UseNotificationsReturn {
    notifications: InAppNotification[];
    unreadCount: number;
    hasPermission: boolean;
    requestPermission: () => Promise<boolean>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    subscribedFixtures: string[];
}

/**
 * Hook to manage real-time in-app notifications
 */
export function useNotifications(): UseNotificationsReturn {
    const [notifications, setNotifications] = useState<InAppNotification[]>([]);
    const [subscribedFixtures, setSubscribedFixtures] = useState<string[]>([]);
    const [hasPermission, setHasPermission] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const prevNotificationCount = useRef(0);

    // Get user's subscribed fixtures
    useEffect(() => {
        const userId = getUserIdentifier();
        if (!userId) return;

        const subscriptionsRef = collection(db, 'fixtureNotificationSubscriptions');
        const q = query(subscriptionsRef, where('userIdentifier', '==', userId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fixtureIds = snapshot.docs.map(doc => doc.data().fixtureId as string);
            setSubscribedFixtures(fixtureIds);
        });

        return () => unsubscribe();
    }, []);

    // Listen to notifications for subscribed fixtures
    useEffect(() => {
        const userId = getUserIdentifier();
        if (!userId || subscribedFixtures.length === 0) {
            setNotifications([]);
            return;
        }

        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newNotifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as InAppNotification[];

            setNotifications(newNotifications);

            // Play sound for new notifications
            if (newNotifications.length > prevNotificationCount.current && hasPermission) {
                playNotificationSound();
            }
            prevNotificationCount.current = newNotifications.length;
        });

        return () => unsubscribe();
    }, [subscribedFixtures, hasPermission]);

    // Initialize audio for notification sound
    useEffect(() => {
        // Using a base64 encoded short beep sound
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleT4cW5LT3bpxEg4thru3qGU7J16Xxd28mFY5Jj96k4yEgYmTm5OAYUc+VnuPmJSDdnN8j5uWgGpIQFh9lZ2UgXNyf5Gem35mRkJafpadlIF0coCZn5p');
    }, []);

    const playNotificationSound = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(() => {
                // Ignore audio play errors (autoplay policy)
            });
        }
    };

    const requestPermission = async (): Promise<boolean> => {
        // For in-app notifications, we just need local permission
        setHasPermission(true);
        return true;
    };

    const markAsRead = async (notificationId: string) => {
        try {
            await updateDoc(doc(db, 'notifications', notificationId), {
                read: true,
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        const userId = getUserIdentifier();
        if (!userId) return;

        try {
            const unreadNotifications = notifications.filter(n => !n.read);
            await Promise.all(
                unreadNotifications.map(n =>
                    updateDoc(doc(db, 'notifications', n.id), { read: true })
                )
            );
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        notifications,
        unreadCount,
        hasPermission,
        requestPermission,
        markAsRead,
        markAllAsRead,
        subscribedFixtures,
    };
}

export default useNotifications;
