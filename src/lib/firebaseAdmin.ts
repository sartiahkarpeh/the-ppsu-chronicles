/**
 * Firebase Admin SDK Configuration
 * For server-side Firestore operations in API routes
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

function getAdminApp(): App | null {
    if (getApps().length === 0) {
        // Initialize with service account from environment variables
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
            // Return null during build when credentials aren't available
            // This allows static generation to use fallbacks instead of throwing
            console.warn('Firebase Admin env vars missing. Build will use static fallbacks.');
            return null;
        }

        const serviceAccount = {
            projectId,
            clientEmail,
            privateKey,
        };

        adminApp = initializeApp({
            credential: cert(serviceAccount),
            projectId: projectId,
        });
    } else {
        adminApp = getApps()[0];
    }
    return adminApp;
}

export function getAdminDb(): Firestore | null {
    if (!adminDb) {
        const app = getAdminApp();
        if (!app) return null;
        adminDb = getFirestore();
    }
    return adminDb;
}

export { getAdminApp };
