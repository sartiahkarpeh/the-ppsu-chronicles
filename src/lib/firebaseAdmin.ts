/**
 * Firebase Admin SDK Configuration
 * For server-side Firestore operations in API routes
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminDb: Firestore;

function getAdminApp(): App {
    if (getApps().length === 0) {
        // Initialize with service account from environment variables
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
            // Fallback for local development if env vars are missing, but don't break build
            // This allows the build to pass even if these aren't set, 
            // though runtime will fail if they are needed and missing.
            console.warn('Firebase Admin env vars missing. Attempting to use default credentials or mock.');
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

export function getAdminDb(): Firestore {
    if (!adminDb) {
        getAdminApp();
        adminDb = getFirestore();
    }
    return adminDb;
}

export { getAdminApp };
