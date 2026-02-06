// src/app/api/valentines/logout/route.ts
import { NextResponse } from 'next/server';
import { clearTokenCookie } from '@/lib/valentines/jwt';

export async function POST() {
    const response = NextResponse.json(
        { success: true, message: 'Logged out successfully' },
        { status: 200 }
    );

    response.headers.set('Set-Cookie', clearTokenCookie());
    return response;
}
