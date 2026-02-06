// src/app/api/valentines/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { hashPassword } from '@/lib/valentines/password';
import { registrationSchema, formatZodError } from '@/lib/valentines/validation';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json(
                { error: 'Database connection failed' },
                { status: 500 }
            );
        }

        // Parse request body
        const body = await request.json();

        // Validate input
        const parseResult = registrationSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', fields: formatZodError(parseResult.error) },
                { status: 400 }
            );
        }

        const { fullName, enrollmentNumber, whatsappNumber, password } = parseResult.data;

        // Check if system is locked
        const settingsDoc = await db.collection('valentines_settings').doc('config').get();
        if (settingsDoc.exists && settingsDoc.data()?.systemLocked) {
            return NextResponse.json(
                { error: 'Registration is currently closed' },
                { status: 403 }
            );
        }

        // Check if enrollment number already exists
        const existingUser = await db.collection('valentines_users').doc(enrollmentNumber).get();
        if (existingUser.exists) {
            return NextResponse.json(
                { error: 'Enrollment number already registered', fields: { enrollmentNumber: 'This enrollment number is already registered' } },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user document
        await db.collection('valentines_users').doc(enrollmentNumber).set({
            fullName,
            enrollmentNumber,
            whatsappNumber,
            passwordHash,
            hasSpun: false,
            assignedTo: null,
            spinTimestamp: null,
            createdAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json(
            { success: true, message: 'Registration successful' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
