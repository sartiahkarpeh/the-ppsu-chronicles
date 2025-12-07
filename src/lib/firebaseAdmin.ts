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
        // Initialize with service account
        // In production, use GOOGLE_APPLICATION_CREDENTIALS env var
        // or pass the service account JSON directly
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
            : require('../../serviceAccountKey.json');

        adminApp = initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id,
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
