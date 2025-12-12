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
    const [hasInitialized, setHasInitialized] = useState(false);

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

    // Check if we should show the prompt
    useEffect(() => {
        if (typeof window === 'undefined' || !fixtureId) return;

        // Delay to let the page render first
        const timer = setTimeout(() => {
            // Don't show if already subscribed
            if (isSubscribed) {
                setShouldShowPrompt(false);
                setHasInitialized(true);
                return;
            }

            // Don't show if user said never ask again
            if (localStorage.getItem(PROMPT_NEVER_ASK_KEY) === 'true') {
                setShouldShowPrompt(false);
                setHasInitialized(true);
                return;
            }

            // Don't show if already granted permission (they're good!)
            if (permission === 'granted') {
                setShouldShowPrompt(false);
                setHasInitialized(true);
                return;
            }

            // Don't show if permission was denied (browser will block anyway)
            if (permission === 'denied') {
                setShouldShowPrompt(false);
                setHasInitialized(true);
                return;
            }

            // Don't show if not supported
            if (!isSupported) {
                setShouldShowPrompt(false);
                setHasInitialized(true);
                return;
            }

            // Check if dismissed recently (within last session)
            const dismissedTime = localStorage.getItem(PROMPT_DISMISSED_KEY);
            if (dismissedTime) {
                const dismissedDate = new Date(parseInt(dismissedTime));
                const hoursSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60);
                // Don't show for 24 hours after dismissing
                if (hoursSinceDismissed < 24) {
                    setShouldShowPrompt(false);
                    setHasInitialized(true);
                    return;
                }
            }

            // Show the prompt!
            setShouldShowPrompt(true);
            setHasInitialized(true);
        }, 2500); // 2.5 second delay for better UX

        return () => clearTimeout(timer);
    }, [fixtureId, isSubscribed, permission, isSupported]);

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
        localStorage.setItem(PROMPT_DISMISSED_KEY, Date.now().toString());
    }, []);

    // Never ask again
    const neverAskAgain = useCallback(() => {
        setShouldShowPrompt(false);
        localStorage.setItem(PROMPT_NEVER_ASK_KEY, 'true');
    }, []);

    return {
        shouldShowPrompt: hasInitialized && shouldShowPrompt,
        isLoading: pushLoading || subscriptionLoading,
        isSupported,
        permission,
        enableNotifications,
        dismissPrompt,
        neverAskAgain,
    };
}

export default useNotificationPrompt;
