// src/lib/valentines/rateLimit.ts

interface RateLimitEntry {
    attempts: number;
    firstAttempt: number;
}

// In-memory store for rate limiting
// Note: In production with multiple instances, use Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if an IP is rate limited
 * Returns true if the request should be allowed, false if rate limited
 */
export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    // Clean up old entries periodically
    if (rateLimitStore.size > 10000) {
        cleanupOldEntries();
    }

    if (!entry) {
        // First attempt
        rateLimitStore.set(ip, { attempts: 1, firstAttempt: now });
        return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetIn: WINDOW_MS };
    }

    const windowExpired = now - entry.firstAttempt > WINDOW_MS;

    if (windowExpired) {
        // Reset window
        rateLimitStore.set(ip, { attempts: 1, firstAttempt: now });
        return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetIn: WINDOW_MS };
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
        // Rate limited
        const resetIn = WINDOW_MS - (now - entry.firstAttempt);
        return { allowed: false, remaining: 0, resetIn };
    }

    // Increment attempts
    entry.attempts++;
    return { allowed: true, remaining: MAX_ATTEMPTS - entry.attempts, resetIn: WINDOW_MS - (now - entry.firstAttempt) };
}

/**
 * Reset rate limit for an IP (call after successful login)
 */
export function resetRateLimit(ip: string): void {
    rateLimitStore.delete(ip);
}

/**
 * Clean up old entries to prevent memory leak
 */
function cleanupOldEntries(): void {
    const now = Date.now();
    for (const [ip, entry] of rateLimitStore.entries()) {
        if (now - entry.firstAttempt > WINDOW_MS) {
            rateLimitStore.delete(ip);
        }
    }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }

    // Fallback
    return 'unknown';
}
