'use client';

import { useEffect } from 'react';

export default function BasketballError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-display font-bold text-white mb-2">Something went wrong!</h2>
                <p className="text-neutral-400 mb-8">
                    We're having trouble loading this basketball page. Please try again.
                </p>
                <button
                    onClick={() => reset()}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-colors uppercase tracking-widest text-sm"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
