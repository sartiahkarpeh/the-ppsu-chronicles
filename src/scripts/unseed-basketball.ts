import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase Admin credentials in .env.local');
    process.exit(1);
}

if (getApps().length === 0) {
    initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

const db = getFirestore();

async function clearCollection(collectionPath: string) {
    const collectionRef = db.collection(collectionPath);
    // Be careful with large collections. For our mock data size (~150 docs), a single batch is fine (limit is 500)
    const snapshot = await collectionRef.limit(500).get();

    if (snapshot.size === 0) {
        console.log(`Collection ${collectionPath} is already empty.`);
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Cleared ${snapshot.size} documents from ${collectionPath}.`);
}

async function unseedDatabase() {
    console.log('🧹 Clearing Basketball Mock Data...');
    try {
        await clearCollection('basketball_games');
        await clearCollection('basketball_players');
        await clearCollection('basketball_teams');

        await db.collection('basketball_configs').doc('page').delete();
        console.log('Deleted basketball_configs/page document.');

        console.log('✅ Unseeding Complete! The database is now empty.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error Clearing Database:', error);
        process.exit(1);
    }
}

unseedDatabase();
