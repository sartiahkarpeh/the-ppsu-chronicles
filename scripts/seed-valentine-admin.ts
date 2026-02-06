// scripts/seed-valentine-admin.ts
/**
 * Script to create an initial admin user for the Valentine's system
 * 
 * Usage:
 * 1. Set your Firebase credentials in .env.local
 * 2. Run: npx tsx scripts/seed-valentine-admin.ts
 * 
 * Default credentials:
 *   Username: admin
 *   Password: valentine2024!
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function seedAdmin() {
    // Initialize Firebase Admin
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        console.error('❌ Missing Firebase Admin credentials in .env.local');
        console.error('Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
        process.exit(1);
    }

    const app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
    });

    const db = getFirestore(app);

    // Admin credentials
    const username = 'admin';
    const password = 'valentine2024!';
    const passwordHash = await bcrypt.hash(password, 12);

    try {
        // Check if admin already exists
        const existingAdmin = await db.collection('valentines_admins')
            .where('username', '==', username)
            .limit(1)
            .get();

        if (!existingAdmin.empty) {
            console.log('ℹ️  Admin user already exists');
            process.exit(0);
        }

        // Create admin user
        await db.collection('valentines_admins').add({
            username,
            passwordHash,
            role: 'admin',
            createdAt: FieldValue.serverTimestamp(),
        });

        console.log('✅ Admin user created successfully!');
        console.log('');
        console.log('Login credentials:');
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
        console.log('');
        console.log('⚠️  Please change the password after first login!');

        // Initialize settings if not exists
        const settingsDoc = await db.collection('valentines_settings').doc('config').get();
        if (!settingsDoc.exists) {
            await db.collection('valentines_settings').doc('config').set({
                spinEnabled: false,
                systemLocked: false,
                updatedAt: FieldValue.serverTimestamp(),
            });
            console.log('✅ System settings initialized');
        }

    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }

    process.exit(0);
}

seedAdmin();
