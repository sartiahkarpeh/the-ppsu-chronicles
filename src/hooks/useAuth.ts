/**
 * Custom hook for authentication and role checking
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebase/config';

interface AuthUser extends User {
  role?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get custom claims
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const role = idTokenResult.claims.role as string | undefined;
        
        const authUser: AuthUser = {
          ...firebaseUser,
          role,
        };
        
        setUser(authUser);
        setIsAdmin(role === 'admin' || role === 'editor');
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, isAdmin };
};

