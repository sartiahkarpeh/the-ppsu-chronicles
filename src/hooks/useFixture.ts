'use client';

import { useState, useEffect } from 'react';
import { subscribeToFixture } from '@/lib/afcon/fixturesFirestore';
import type { Fixture } from '@/types/fixtureTypes';

interface UseFixtureReturn {
    fixture: Fixture | null;
    loading: boolean;
    error: string | null;
}

/**
 * Hook for real-time fixture subscription using Firestore onSnapshot
 */
export function useFixture(fixtureId: string | null): UseFixtureReturn {
    const [fixture, setFixture] = useState<Fixture | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!fixtureId) {
            setFixture(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const unsubscribe = subscribeToFixture(fixtureId, (updatedFixture) => {
            setFixture(updatedFixture);
            setLoading(false);
            if (!updatedFixture) {
                setError('Fixture not found');
            }
        });

        return () => {
            unsubscribe();
        };
    }, [fixtureId]);

    return { fixture, loading, error };
}

export default useFixture;
