// src/components/valentines/Confetti.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
    id: number;
    x: number;
    initialY: number;
    size: number;
    color: string;
    rotation: number;
    delay: number;
}

interface ConfettiProps {
    isActive: boolean;
    duration?: number;
}

const colors = [
    '#FF6B6B', // Red
    '#FF8E8E', // Light red
    '#FFB4B4', // Pink-red
    '#FF69B4', // Hot pink
    '#FF1493', // Deep pink
    '#FFD700', // Gold
    '#FFFFFF', // White
    '#FFC0CB', // Pink
];

export default function Confetti({ isActive, duration = 5000 }: ConfettiProps) {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isActive) {
            // Generate confetti pieces
            const newPieces: ConfettiPiece[] = [];
            for (let i = 0; i < 100; i++) {
                newPieces.push({
                    id: i,
                    x: Math.random() * 100, // % of viewport width
                    initialY: -10, // Start above viewport
                    size: Math.random() * 8 + 4, // 4-12px
                    color: colors[Math.floor(Math.random() * colors.length)],
                    rotation: Math.random() * 360,
                    delay: Math.random() * 0.5, // 0-0.5s delay
                });
            }
            setPieces(newPieces);
            setShow(true);

            // Hide after duration
            const timer = setTimeout(() => {
                setShow(false);
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [isActive, duration]);

    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                    {pieces.map((piece) => (
                        <motion.div
                            key={piece.id}
                            initial={{
                                x: `${piece.x}vw`,
                                y: piece.initialY,
                                rotate: piece.rotation,
                                opacity: 1,
                            }}
                            animate={{
                                y: '110vh',
                                rotate: piece.rotation + 720,
                                opacity: [1, 1, 0],
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: 3 + Math.random() * 2,
                                delay: piece.delay,
                                ease: 'linear',
                            }}
                            style={{
                                position: 'absolute',
                                width: piece.size,
                                height: piece.size,
                                backgroundColor: piece.color,
                                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
                            }}
                        />
                    ))}

                    {/* Hearts */}
                    {[...Array(15)].map((_, i) => (
                        <motion.div
                            key={`heart-${i}`}
                            initial={{
                                x: `${Math.random() * 100}vw`,
                                y: -20,
                                scale: 0,
                                opacity: 1,
                            }}
                            animate={{
                                y: '110vh',
                                scale: [0, 1, 1, 0.5],
                                opacity: [0, 1, 1, 0],
                            }}
                            transition={{
                                duration: 4 + Math.random() * 2,
                                delay: Math.random() * 1,
                                ease: 'easeOut',
                            }}
                            className="absolute text-3xl"
                        >
                            ❤️
                        </motion.div>
                    ))}
                </div>
            )}
        </AnimatePresence>
    );
}
