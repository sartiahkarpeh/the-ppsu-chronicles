'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { app, db } from '@/firebase/config';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';
const USER_ID_KEY = 'afcon25_user_id';

function getUserIdentifier(): string {
    if (typeof window === 'undefined') return '';
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
}

interface UsePushNotificationsReturn {
    isSupported: boolean;
    permission: NotificationPermission | 'unsupported';
    fcmToken: string | null;
    requestPermission: () => Promise<boolean>;
    isLoading: boolean;
    error: string | null;
}

/**
 * Hook for managing push notifications via FCM
 */
export function usePushNotifications(): UsePushNotificationsReturn {
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check if push notifications are supported
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const supported = 'Notification' in window && 'serviceWorker' in navigator;
            setIsSupported(supported);
            if (supported) {
                setPermission(Notification.permission);
            }
        }
    }, []);

    // Register service worker and get token if permission already granted
    useEffect(() => {
        if (isSupported && permission === 'granted') {
            registerServiceWorkerAndGetToken();
        }
    }, [isSupported, permission]);

    // Listen for foreground messages
    useEffect(() => {
        if (!isSupported || permission !== 'granted' || typeof window === 'undefined') return;

        try {
            const messaging = getMessaging(app);
            const unsubscribe = onMessage(messaging, (payload) => {
                console.log('Foreground message received:', payload);

                // Show notification even when app is in foreground
                if (Notification.permission === 'granted' && payload.notification) {
                    new Notification(payload.notification.title || 'AFCON 2025', {
                        body: payload.notification.body,
                        icon: '/afcon-logo.png',
                        tag: payload.data?.fixtureId || 'afcon-notification',
                    });
                }
            });

            return () => unsubscribe();
        } catch (err) {
            console.error('Error setting up message listener:', err);
        }
    }, [isSupported, permission]);

    const registerServiceWorkerAndGetToken = async () => {
        try {
            // Register service worker
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('Service Worker registered:', registration);

            // Get FCM token
            const messaging = getMessaging(app);
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration,
            });

            if (token) {
                console.log('FCM Token:', token);
                setFcmToken(token);

                // Store token in Firestore
                await saveTokenToFirestore(token);
            }
        } catch (err) {
            console.error('Error getting FCM token:', err);
            setError('Failed to get notification token');
        }
    };

    const saveTokenToFirestore = async (token: string) => {
        const userId = getUserIdentifier();
        if (!userId) return;

        try {
            await setDoc(doc(db, 'fcmTokens', userId), {
                token,
                userId,
                platform: 'web',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        } catch (err) {
            console.error('Error saving FCM token:', err);
        }
    };

    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            setError('Push notifications are not supported in this browser');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                await registerServiceWorkerAndGetToken();
                return true;
            } else {
                setError('Notification permission denied');
                return false;
            }
        } catch (err) {
            console.error('Error requesting permission:', err);
            setError('Failed to request notification permission');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [isSupported]);

    return {
        isSupported,
        permission,
        fcmToken,
        requestPermission,
        isLoading,
        error,
    };
}

export default usePushNotifications;
