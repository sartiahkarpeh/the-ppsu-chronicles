// src/app/api/valentines/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyPassword } from '@/lib/valentines/password';
import { createToken } from '@/lib/valentines/jwt';
import { loginSchema, formatZodError } from '@/lib/valentines/validation';
import { checkRateLimit, resetRateLimit, getClientIP } from '@/lib/valentines/rateLimit';

export async function POST(request: NextRequest) {
    try {
        const clientIP = getClientIP(request);

        // Check rate limit
        const rateLimit = checkRateLimit(clientIP);
        if (!rateLimit.allowed) {
            const minutesRemaining = Math.ceil(rateLimit.resetIn / 60000);
            return NextResponse.json(
                { error: `Too many login attempts. Please try again in ${minutesRemaining} minutes.` },
                { status: 429 }
            );
        }

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
        const parseResult = loginSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', fields: formatZodError(parseResult.error) },
                { status: 400 }
            );
        }

        const { enrollmentNumber, password } = parseResult.data;

        // Get user
        const userDoc = await db.collection('valentines_users').doc(enrollmentNumber).get();
        if (!userDoc.exists) {
            return NextResponse.json(
                { error: 'Invalid enrollment number or password' },
                { status: 401 }
            );
        }

        const userData = userDoc.data()!;

        // Verify password
        const isValid = await verifyPassword(password, userData.passwordHash);
        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid enrollment number or password' },
                { status: 401 }
            );
        }

        // Reset rate limit on successful login
        resetRateLimit(clientIP);

        // Create token
        const token = createToken(enrollmentNumber, 'user');

        // Set cookie using Next.js cookies API
        const cookieStore = await cookies();
        cookieStore.set('valentine_token', token, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60, // 24 hours
            secure: process.env.NODE_ENV === 'production',
        });

        return NextResponse.json({
            success: true,
            message: 'Login successful',
            user: {
                fullName: userData.fullName,
                enrollmentNumber: userData.enrollmentNumber,
                hasSpun: userData.hasSpun,
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
