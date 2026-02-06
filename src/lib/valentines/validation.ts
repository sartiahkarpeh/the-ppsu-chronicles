// src/lib/valentines/validation.ts
import { z } from 'zod';

/**
 * WhatsApp number validation (international format)
 * Accepts formats: +1234567890, 1234567890, +1 234 567 890
 */
const whatsappRegex = /^\+?[1-9]\d{1,14}$/;

/**
 * Registration schema
 */
export const registrationSchema = z.object({
    fullName: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be less than 100 characters')
        .trim(),
    enrollmentNumber: z
        .string()
        .min(3, 'Enrollment number must be at least 3 characters')
        .max(50, 'Enrollment number must be less than 50 characters')
        .trim()
        .toUpperCase(),
    whatsappNumber: z
        .string()
        .transform(val => val.replace(/[\s\-()]/g, '')) // Remove spaces, dashes, parentheses
        .refine(val => whatsappRegex.test(val), {
            message: 'Please enter a valid WhatsApp number (e.g., +1234567890)',
        }),
    password: z
        .string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must be less than 100 characters'),
});

/**
 * Login schema
 */
export const loginSchema = z.object({
    enrollmentNumber: z
        .string()
        .min(1, 'Enrollment number is required')
        .trim()
        .toUpperCase(),
    password: z
        .string()
        .min(1, 'Password is required'),
});

/**
 * Admin login schema
 */
export const adminLoginSchema = z.object({
    username: z
        .string()
        .min(1, 'Username is required')
        .trim(),
    password: z
        .string()
        .min(1, 'Password is required'),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/**
 * Format Zod errors for API response
 */
export function formatZodError(error: z.ZodError): Record<string, string> {
    const errors: Record<string, string> = {};
    error.errors.forEach(err => {
        const path = err.path.join('.');
        if (!errors[path]) {
            errors[path] = err.message;
        }
    });
    return errors;
}
