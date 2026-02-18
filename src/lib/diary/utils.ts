// src/lib/diary/utils.ts
// Utility functions for the diary feature

import { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow, format } from 'date-fns';

/**
 * Calculate estimated read time based on word count
 * ~200 words per minute average reading speed
 */
export function calculateReadTime(content: string): number {
    const text = content.replace(/<[^>]*>/g, ''); // strip HTML
    const wordCount = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Validate that email ends with @ppsu.ac.in
 */
export function validatePPSUEmail(email: string): boolean {
    return email.toLowerCase().trim().endsWith('@ppsu.ac.in');
}

/**
 * Format a Firestore Timestamp or Date to relative time string
 */
export function formatRelativeDate(date: Timestamp | Date | null): string {
    if (!date) return '';
    const d = date instanceof Timestamp ? date.toDate() : date;
    return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format a Firestore Timestamp or Date to a readable date string
 */
export function formatDate(date: Timestamp | Date | null): string {
    if (!date) return '';
    const d = date instanceof Timestamp ? date.toDate() : date;
    return format(d, 'MMM d, yyyy');
}

/**
 * Generate a short excerpt from HTML content
 */
export function generateExcerpt(html: string, maxLength: number = 160): string {
    const text = html.replace(/<[^>]*>/g, '').trim();
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '…';
}

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

/**
 * Format large numbers (e.g., 1234 → 1.2K)
 */
export function formatCount(count: number): string {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
}
