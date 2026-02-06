// src/app/valentines/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, LogOut, Loader2, Clock, Lock, Sparkles, Gift } from 'lucide-react';
import SpinWheel from '@/components/valentines/SpinWheel';
import Confetti from '@/components/valentines/Confetti';
import AssignmentCard from '@/components/valentines/AssignmentCard';

interface User {
    fullName: string;
    enrollmentNumber: string;
    whatsappNumber: string;
    hasSpun: boolean;
    spinTimestamp: string | null;
}

interface AssignedPerson {
    fullName: string;
    enrollmentNumber: string;
    whatsappNumber: string;
}

interface GiftGiver {
    fullName: string;
    enrollmentNumber: string;
    whatsappNumber: string;
}

interface Settings {
    spinEnabled: boolean;
    systemLocked: boolean;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [assignedPerson, setAssignedPerson] = useState<AssignedPerson | null>(null);
    const [giftGiver, setGiftGiver] = useState<GiftGiver | null>(null);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showConfetti, setShowConfetti] = useState(false);
    const [justSpun, setJustSpun] = useState(false);

    const fetchUserData = useCallback(async () => {
        try {
            const response = await fetch('/api/valentines/me');

            if (response.status === 401) {
                router.push('/valentines/login');
                return;
            }

            const data = await response.json();
            setUser(data.user);
            setAssignedPerson(data.assignedPerson);
            setGiftGiver(data.giftGiver);
            setSettings(data.settings);
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleLogout = async () => {
        try {
            await fetch('/api/valentines/logout', { method: 'POST' });
            window.location.href = '/valentines/login';
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleSpinComplete = (assigned: AssignedPerson) => {
        setAssignedPerson(assigned);
        setUser(prev => prev ? { ...prev, hasSpun: true } : null);
        setShowConfetti(true);
        setJustSpun(true);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const getSpinStatus = () => {
        if (settings?.systemLocked) {
            return {
                canSpin: false,
                message: 'The system is currently locked. Please contact admin.',
                icon: Lock,
            };
        }
        if (!settings?.spinEnabled) {
            return {
                canSpin: false,
                message: 'The spin phase has not started yet. Please wait for the admin to enable it.',
                icon: Clock,
            };
        }
        return {
            canSpin: true,
            message: 'Spin the wheel to find your Valentine match!',
            icon: Sparkles,
        };
    };

    const spinStatus = getSpinStatus();

    return (
        <div className="min-h-screen py-8 px-4">
            {/* Confetti */}
            <Confetti isActive={showConfetti} />

            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
                        <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-red-600 rounded-full flex items-center justify-center">
                            <Heart className="w-6 h-6 text-white fill-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Hello, {user.fullName.split(' ')[0]}!</h1>
                            <p className="text-sm text-gray-500">{user.enrollmentNumber}</p>
                        </div>
                    </motion.div>

                    <motion.button
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="hidden sm:inline">Logout</span>
                    </motion.button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto">
                <AnimatePresence mode="wait">
                    {user.hasSpun && assignedPerson ? (
                        /* Assignment Display */
                        <motion.div
                            key="assignment"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            {justSpun && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center mb-8"
                                >
                                    <h2 className="text-3xl font-bold text-gray-800 mb-2">🎉 Congratulations!</h2>
                                    <p className="text-gray-600">You&apos;ve been matched!</p>
                                </motion.div>
                            )}

                            {/* Your Assignment - Who you're buying for */}
                            <AssignmentCard assignedPerson={assignedPerson} />

                            {/* Gift Giver Card - Who's buying for you */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mt-6 bg-white/90 backdrop-blur rounded-2xl p-6 shadow-lg border border-purple-100"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                                        <Gift className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">Your Secret Valentine</h3>
                                        <p className="text-sm text-gray-500">Someone is getting YOU a gift!</p>
                                    </div>
                                </div>

                                {giftGiver ? (
                                    <div className="bg-purple-50 rounded-xl p-4 space-y-3">
                                        <div>
                                            <p className="text-purple-800 font-semibold text-lg">{giftGiver.fullName}</p>
                                            <p className="text-purple-600 text-sm font-mono">{giftGiver.enrollmentNumber}</p>
                                        </div>
                                        <p className="text-purple-600 text-sm">is preparing a gift for you 💜</p>
                                        <a
                                            href={`https://wa.me/${giftGiver.whatsappNumber.replace(/[^0-9]/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                            </svg>
                                            Message on WhatsApp
                                        </a>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-gray-600 text-center">
                                            No one has been assigned to you yet. Check back later!
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    ) : (
                        /* Spin Wheel */
                        <motion.div
                            key="spin"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center"
                        >
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mb-8"
                            >
                                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                                    Valentine&apos;s Gift Wheel
                                </h2>
                                <div className="flex items-center justify-center gap-2 text-gray-600">
                                    <spinStatus.icon className="w-5 h-5" />
                                    <p>{spinStatus.message}</p>
                                </div>
                            </motion.div>

                            <SpinWheel
                                onSpinComplete={handleSpinComplete}
                                disabled={!spinStatus.canSpin}
                                disabledMessage={!spinStatus.canSpin ? spinStatus.message : undefined}
                            />

                            {/* Gift Giver Preview - Show even before spinning */}
                            {giftGiver && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="mt-8 max-w-md mx-auto bg-white/90 backdrop-blur rounded-2xl p-5 shadow-lg border border-purple-100"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                                            <Gift className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm text-gray-500">Someone chose you! 💜</p>
                                            <p className="font-semibold text-gray-800">{giftGiver.fullName}</p>
                                            <p className="text-xs text-purple-600 font-mono">{giftGiver.enrollmentNumber}</p>
                                        </div>
                                    </div>
                                    <a
                                        href={`https://wa.me/${giftGiver.whatsappNumber.replace(/[^0-9]/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                        Message on WhatsApp
                                    </a>
                                </motion.div>
                            )}

                            {/* Info Cards */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mt-12 grid sm:grid-cols-2 gap-4 max-w-lg mx-auto"
                            >
                                <div className="bg-white/80 backdrop-blur rounded-xl p-4 text-left">
                                    <h3 className="font-semibold text-gray-800 mb-1">⚡ One Chance</h3>
                                    <p className="text-sm text-gray-600">
                                        You can only spin once! Make sure you&apos;re ready.
                                    </p>
                                </div>
                                <div className="bg-white/80 backdrop-blur rounded-xl p-4 text-left">
                                    <h3 className="font-semibold text-gray-800 mb-1">🎁 Your Mission</h3>
                                    <p className="text-sm text-gray-600">
                                        Prepare a thoughtful Valentine&apos;s gift for your match.
                                    </p>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
