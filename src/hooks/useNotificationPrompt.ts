'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePushNotifications } from './usePushNotifications';
import { useNotificationSubscription } from './useNotificationSubscription';

// Storage keys
const PROMPT_DISMISSED_KEY = 'afcon25_notification_prompt_dismissed';
const PROMPT_NEVER_ASK_KEY = 'afcon25_notification_never_ask';

export interface UseNotificationPromptReturn {
    shouldShowPrompt: boolean;
    isLoading: boolean;
    isSupported: boolean;
    permission: NotificationPermission | 'unsupported';
    enableNotifications: () => Promise<boolean>;
    dismissPrompt: () => void;
    neverAskAgain: () => void;
}

/**
 * Hook to manage the notification permission prompt on fixture pages
 * Handles auto-prompting, dismissal tracking, and FCM token setup
 */
export function useNotificationPrompt(fixtureId: string | null): UseNotificationPromptReturn {
    const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
    const [hasCheckedPrompt, setHasCheckedPrompt] = useState(false);

    const {
        isSupported,
        permission,
        requestPermission,
        isLoading: pushLoading,
    } = usePushNotifications();

    const {
        isSubscribed,
        isLoading: subscriptionLoading,
        subscribe,
    } = useNotificationSubscription(fixtureId);

    // Check if we should show the prompt - wait for hooks to initialize
    useEffect(() => {
        if (typeof window === 'undefined' || !fixtureId) return;

        // Wait for subscription loading to finish
        if (subscriptionLoading) return;

        // Set a timer for the prompt delay
        const timer = setTimeout(() => {
            // Don't show if already subscribed
            if (isSubscribed) {
                setShouldShowPrompt(false);
                setHasCheckedPrompt(true);
                return;
            }

            // Don't show if user said never ask again
            try {
                if (localStorage.getItem(PROMPT_NEVER_ASK_KEY) === 'true') {
                    setShouldShowPrompt(false);
                    setHasCheckedPrompt(true);
                    return;
                }
            } catch (e) {
                // localStorage might not be available
            }

            // Check browser support
            const browserSupported = typeof window !== 'undefined' &&
                'Notification' in window &&
                'serviceWorker' in navigator;

            if (!browserSupported) {
                console.log('Browser does not support notifications');
                setShouldShowPrompt(false);
                setHasCheckedPrompt(true);
                return;
            }

            // Get current permission status
            const currentPermission = Notification.permission;

            // Don't show if already granted (they're good!)
            if (currentPermission === 'granted') {
                setShouldShowPrompt(false);
                setHasCheckedPrompt(true);
                return;
            }

            // Don't show if permission was denied (browser will block anyway)
            if (currentPermission === 'denied') {
                setShouldShowPrompt(false);
                setHasCheckedPrompt(true);
                return;
            }

            // Check if dismissed recently (within last 24 hours)
            try {
                const dismissedTime = localStorage.getItem(PROMPT_DISMISSED_KEY);
                if (dismissedTime) {
                    const dismissedDate = new Date(parseInt(dismissedTime));
                    const hoursSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60);
                    if (hoursSinceDismissed < 24) {
                        setShouldShowPrompt(false);
                        setHasCheckedPrompt(true);
                        return;
                    }
                }
            } catch (e) {
                // localStorage might not be available
            }

            // Show the prompt!
            console.log('Showing notification prompt');
            setShouldShowPrompt(true);
            setHasCheckedPrompt(true);
        }, 2500); // 2.5 second delay for better UX

        return () => clearTimeout(timer);
    }, [fixtureId, isSubscribed, subscriptionLoading]);

    // Enable notifications: request permission and subscribe
    const enableNotifications = useCallback(async (): Promise<boolean> => {
        try {
            // Request browser permission
            const granted = await requestPermission();

            if (granted) {
                // Subscribe to the fixture
                await subscribe();
                setShouldShowPrompt(false);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error enabling notifications:', error);
            return false;
        }
    }, [requestPermission, subscribe]);

    // Dismiss for now (can show again next session)
    const dismissPrompt = useCallback(() => {
        setShouldShowPrompt(false);
        try {
            localStorage.setItem(PROMPT_DISMISSED_KEY, Date.now().toString());
        } catch (e) {
            // localStorage might not be available
        }
    }, []);

    // Never ask again
    const neverAskAgain = useCallback(() => {
        setShouldShowPrompt(false);
        try {
            localStorage.setItem(PROMPT_NEVER_ASK_KEY, 'true');
        } catch (e) {
            // localStorage might not be available
        }
    }, []);

    return {
        shouldShowPrompt: hasCheckedPrompt && shouldShowPrompt,
        isLoading: pushLoading || subscriptionLoading,
        isSupported,
        permission,
        enableNotifications,
        dismissPrompt,
        neverAskAgain,
    };
}

export default useNotificationPrompt;

