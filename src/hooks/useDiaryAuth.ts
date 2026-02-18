// src/hooks/useDiaryAuth.ts
// Custom hook combining Firebase Auth with diary profile state

'use client';

import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { getProfile } from '@/lib/diary/firebase';
import type { DiaryProfile } from '@/types/diary';

interface DiaryAuthState {
    user: User | null;
    profile: DiaryProfile | null;
    loading: boolean;
    isWriter: boolean;
    isApprovedWriter: boolean;
    hasProfile: boolean;
    refreshProfile: () => Promise<void>;
}

export function useDiaryAuth(): DiaryAuthState {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<DiaryProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async (uid: string) => {
        try {
            const p = await getProfile(uid);
            setProfile(p);
        } catch (err) {
            console.error('Failed to load diary profile:', err);
            setProfile(null);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user) {
            await loadProfile(user.uid);
        }
    }, [user, loadProfile]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                await loadProfile(firebaseUser.uid);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [loadProfile]);

    return {
        user,
        profile,
        loading,
        isWriter: profile?.role === 'writer',
        isApprovedWriter: profile?.role === 'writer' && profile?.isApproved === true,
        hasProfile: profile !== null,
        refreshProfile,
    };
}
