'use client';

import React from 'react';
import type { FormResultType } from '@/types/fixtureTypes';

interface FormDotsProps {
    form: FormResultType[];
    size?: 'sm' | 'md' | 'lg';
}

const dotColors: Record<FormResultType, string> = {
    W: 'bg-green-500',
    D: 'bg-gray-400',
    L: 'bg-red-500',
};

const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
};

export default function FormDots({ form, size = 'md' }: FormDotsProps) {
    // Show last 5 results, pad with empty if needed
    const displayForm = [...form].slice(-5);

    return (
        <div className="flex items-center gap-1">
            {displayForm.map((result, index) => (
                <div
                    key={index}
                    className={`${sizeClasses[size]} rounded-full ${dotColors[result]}`}
                    title={result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}
                />
            ))}
            {/* Fill remaining spots with empty dots */}
            {Array.from({ length: 5 - displayForm.length }).map((_, index) => (
                <div
                    key={`empty-${index}`}
                    className={`${sizeClasses[size]} rounded-full bg-gray-700`}
                />
            ))}
        </div>
    );
}
