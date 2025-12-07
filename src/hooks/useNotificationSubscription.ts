'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    isSubscribedToFixture,
    subscribeToFixtureNotifications,
    unsubscribeFromFixtureNotifications,
} from '@/lib/afcon/fixturesFirestore';

// Storage key for user identifier
const USER_ID_KEY = 'afcon25_user_id';

/**
 * Generate a random user identifier
 */
function generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get or create user identifier from localStorage
 */
function getUserIdentifier(): string {
    if (typeof window === 'undefined') return '';

    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
        userId = generateUserId();
        localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
}

interface UseNotificationSubscriptionReturn {
    isSubscribed: boolean;
    isLoading: boolean;
    toggle: () => Promise<void>;
    subscribe: () => Promise<void>;
    unsubscribe: () => Promise<void>;
}

/**
 * Hook to manage notification subscription state for a fixture
 */
export function useNotificationSubscription(
    fixtureId: string | null
): UseNotificationSubscriptionReturn {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Check subscription status on mount
    useEffect(() => {
        if (!fixtureId) {
            setIsLoading(false);
            return;
        }

        const checkSubscription = async () => {
            try {
                const userId = getUserIdentifier();
                if (!userId) {
                    setIsLoading(false);
                    return;
                }

                const subscribed = await isSubscribedToFixture(fixtureId, userId);
                setIsSubscribed(subscribed);
            } catch (error) {
                console.error('Error checking subscription:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkSubscription();
    }, [fixtureId]);

    const subscribe = useCallback(async () => {
        if (!fixtureId) return;

        setIsLoading(true);
        try {
            const userId = getUserIdentifier();
            await subscribeToFixtureNotifications(fixtureId, userId, 'inApp');
            setIsSubscribed(true);
        } catch (error) {
            console.error('Error subscribing:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [fixtureId]);

    const unsubscribe = useCallback(async () => {
        if (!fixtureId) return;

        setIsLoading(true);
        try {
            const userId = getUserIdentifier();
            await unsubscribeFromFixtureNotifications(fixtureId, userId);
            setIsSubscribed(false);
        } catch (error) {
            console.error('Error unsubscribing:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [fixtureId]);

    const toggle = useCallback(async () => {
        if (isSubscribed) {
            await unsubscribe();
        } else {
            await subscribe();
        }
    }, [isSubscribed, subscribe, unsubscribe]);

    return {
        isSubscribed,
        isLoading,
        toggle,
        subscribe,
        unsubscribe,
    };
}

export default useNotificationSubscription;
