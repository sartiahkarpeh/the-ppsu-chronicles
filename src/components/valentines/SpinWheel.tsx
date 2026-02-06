// src/components/valentines/SpinWheel.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface AssignedPerson {
    fullName: string;
    enrollmentNumber: string;
    whatsappNumber: string;
}

interface SpinWheelProps {
    onSpinComplete: (assignedPerson: AssignedPerson) => void;
    disabled?: boolean;
    disabledMessage?: string;
}

export default function SpinWheel({ onSpinComplete, disabled, disabledMessage }: SpinWheelProps) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleSpin = async () => {
        if (isSpinning || disabled) return;

        setIsSpinning(true);
        setError(null);

        // Start the visual spinning animation
        const spins = 5 + Math.random() * 3; // 5-8 full rotations
        const totalRotation = rotation + (spins * 360);
        setRotation(totalRotation);

        try {
            // Make the API call - assignment happens server-side
            const response = await fetch('/api/valentines/spin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Spin failed');
            }

            // Wait for animation to complete (3 seconds)
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Call completion handler with assigned person
            onSpinComplete(data.assignedPerson);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setRotation(rotation); // Reset rotation on error
        } finally {
            setIsSpinning(false);
        }
    };

    // Wheel segments - purely decorative
    const segments = [
        { color: 'from-rose-400 to-rose-500', label: '❤️' },
        { color: 'from-pink-400 to-pink-500', label: '💕' },
        { color: 'from-red-400 to-red-500', label: '💗' },
        { color: 'from-rose-500 to-rose-600', label: '💖' },
        { color: 'from-pink-500 to-pink-600', label: '💘' },
        { color: 'from-red-500 to-red-600', label: '💝' },
        { color: 'from-rose-400 to-pink-500', label: '💞' },
        { color: 'from-pink-400 to-red-500', label: '💓' },
    ];

    return (
        <div className="flex flex-col items-center">
            {/* Wheel Container */}
            <div className="relative w-72 h-72 md:w-80 md:h-80">
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
                    <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-rose-600 drop-shadow-md" />
                </div>

                {/* Spinning Wheel */}
                <motion.div
                    animate={{ rotate: rotation }}
                    transition={{ duration: 3, ease: [0.25, 0.1, 0.25, 1] }}
                    className="w-full h-full rounded-full shadow-2xl overflow-hidden relative"
                    style={{ transformOrigin: 'center center' }}
                >
                    {/* Wheel Segments */}
                    {segments.map((segment, index) => {
                        const angle = (360 / segments.length) * index;
                        return (
                            <div
                                key={index}
                                className={`absolute w-full h-full origin-center bg-gradient-to-br ${segment.color}`}
                                style={{
                                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.tan(Math.PI / segments.length)}% 0%)`,
                                    transform: `rotate(${angle}deg)`,
                                }}
                            >
                                <span
                                    className="absolute text-2xl"
                                    style={{
                                        top: '20%',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                    }}
                                >
                                    {segment.label}
                                </span>
                            </div>
                        );
                    })}

                    {/* Center Circle */}
                    <div className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center z-10">
                        <span className="text-3xl">💝</span>
                    </div>
                </motion.div>

                {/* Glow Effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-400/20 to-red-500/20 blur-xl -z-10" />
            </div>

            {/* Spin Button */}
            <div className="mt-8">
                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-4 text-red-600 text-center text-sm bg-red-50 px-4 py-2 rounded-lg"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {disabled ? (
                    <div className="text-center">
                        <p className="text-gray-500 text-sm">{disabledMessage || 'Spin is not available'}</p>
                    </div>
                ) : (
                    <motion.button
                        onClick={handleSpin}
                        disabled={isSpinning}
                        whileHover={{ scale: isSpinning ? 1 : 1.05 }}
                        whileTap={{ scale: isSpinning ? 1 : 0.95 }}
                        className="px-10 py-4 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-lg rounded-full shadow-xl shadow-rose-200 hover:shadow-2xl transition-all disabled:opacity-80"
                    >
                        {isSpinning ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Spinning...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                🎰 Spin Now!
                            </span>
                        )}
                    </motion.button>
                )}
            </div>
        </div>
    );
}
