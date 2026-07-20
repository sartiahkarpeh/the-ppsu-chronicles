/**
 * Server-side admin verification for API routes.
 *
 * The client sends its Firebase ID token as `Authorization: Bearer <idToken>`.
 * We verify it with the Admin SDK and check the `role` custom claim — the same
 * claim `useAuth()` reads on the client (see src/hooks/useAuth.ts).
 *
 * Client-side route guards only hide UI; anything that grants real capability
 * (like a LiveKit publish token) has to be checked here.
 */

import { NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';

const ADMIN_ROLES = ['admin', 'editor'];

export type AdminCheck =
    | { ok: true; uid: string; role: string; email?: string }
    | { ok: false; status: number; error: string };

export async function verifyAdmin(request: NextRequest): Promise<AdminCheck> {
    const header = request.headers.get('authorization') || '';
    const match = header.match(/^Bearer (.+)$/i);

    if (!match) {
        return { ok: false, status: 401, error: 'Missing authentication token.' };
    }

    const auth = getAdminAuth();
    if (!auth) {
        return { ok: false, status: 503, error: 'Auth unavailable.' };
    }

    try {
        const decoded = await auth.verifyIdToken(match[1]);
        const role = (decoded.role as string | undefined) ?? '';

        if (!ADMIN_ROLES.includes(role)) {
            return { ok: false, status: 403, error: 'Admin access required.' };
        }

        return { ok: true, uid: decoded.uid, role, email: decoded.email };
    } catch {
        return { ok: false, status: 401, error: 'Invalid or expired token.' };
    }
}
