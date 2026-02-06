// src/lib/valentines/jwt.ts

const JWT_SECRET = process.env.JWT_SECRET || 'valentine-secret-key-change-in-production';
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface TokenPayload {
    enrollmentNumber: string;
    type: 'user' | 'admin';
    exp: number;
}

/**
 * Base64 encode that works in both Node.js and browser
 */
function base64Encode(str: string): string {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str, 'utf-8').toString('base64');
    }
    return btoa(str);
}

/**
 * Base64 decode that works in both Node.js and browser
 */
function base64Decode(str: string): string {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str, 'base64').toString('utf-8');
    }
    return atob(str);
}

/**
 * Create a simple base64-encoded token (for Edge runtime compatibility)
 */
export function createToken(enrollmentNumber: string, type: 'user' | 'admin' = 'user'): string {
    const payload: TokenPayload = {
        enrollmentNumber,
        type,
        exp: Date.now() + TOKEN_EXPIRY,
    };

    const payloadStr = JSON.stringify(payload);
    const signature = simpleSign(payloadStr);

    return base64Encode(payloadStr) + '.' + signature;
}

/**
 * Verify and decode a token
 */
export function verifyToken(token: string): TokenPayload | null {
    try {
        const [payloadB64, signature] = token.split('.');
        if (!payloadB64 || !signature) return null;

        const payloadStr = base64Decode(payloadB64);
        const expectedSignature = simpleSign(payloadStr);

        if (signature !== expectedSignature) return null;

        const payload: TokenPayload = JSON.parse(payloadStr);

        // Check expiry
        if (payload.exp < Date.now()) return null;

        return payload;
    } catch {
        return null;
    }
}

/**
 * Simple HMAC-like signing using the secret
 */
function simpleSign(data: string): string {
    let hash = 0;
    const combined = data + JWT_SECRET;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Extract token from cookie header
 */
export function getTokenFromCookies(cookieHeader: string | null, cookieName: string = 'valentine_token'): string | null {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
    }, {} as Record<string, string>);

    return cookies[cookieName] || null;
}

/**
 * Create cookie string for setting token
 */
export function createTokenCookie(token: string, cookieName: string = 'valentine_token'): string {
    const maxAge = 24 * 60 * 60; // 24 hours in seconds
    return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

/**
 * Create cookie string for clearing token
 */
export function clearTokenCookie(cookieName: string = 'valentine_token'): string {
    return `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
