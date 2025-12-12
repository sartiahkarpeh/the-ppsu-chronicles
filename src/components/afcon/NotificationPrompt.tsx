'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Smartphone, Zap } from 'lucide-react';

interface NotificationPromptProps {
    isVisible: boolean;
    isLoading: boolean;
    onEnable: () => Promise<boolean>;
    onDismiss: () => void;
    onNeverAsk: () => void;
    homeTeam?: string;
    awayTeam?: string;
}

export default function NotificationPrompt({
    isVisible,
    isLoading,
    onEnable,
    onDismiss,
    onNeverAsk,
    homeTeam,
    awayTeam,
}: NotificationPromptProps) {
    const handleEnable = async () => {
        await onEnable();
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onDismiss}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50"
                    >
                        <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
                            {/* Header with gradient */}
                            <div className="relative bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-8 text-center">
                                {/* Close button */}
                                <button
                                    onClick={onDismiss}
                                    className="absolute top-3 right-3 p-2 rounded-full bg-black/20 hover:bg-black/30 transition-colors"
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>

                                {/* Icon */}
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
                                    <Bell className="w-8 h-8 text-white" />
                                </div>

                                <h2 className="text-xl font-bold text-white mb-2">
                                    Never Miss a Goal! ⚽
                                </h2>
                                <p className="text-white/90 text-sm">
                                    {homeTeam && awayTeam
                                        ? `Get live updates for ${homeTeam} vs ${awayTeam}`
                                        : 'Get live match updates on your phone'}
                                </p>
                            </div>

                            {/* Features */}
                            <div className="px-6 py-6 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium text-sm">Instant Goal Alerts</h3>
                                        <p className="text-gray-400 text-xs">Know the moment a goal is scored</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                        <Smartphone className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium text-sm">Works on Your Phone</h3>
                                        <p className="text-gray-400 text-xs">Even when the browser is closed</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="px-6 pb-6 space-y-3">
                                <button
                                    onClick={handleEnable}
                                    disabled={isLoading}
                                    className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Enabling...
                                        </>
                                    ) : (
                                        <>
                                            <Bell className="w-5 h-5" />
                                            Enable Notifications
                                        </>
                                    )}
                                </button>

                                <div className="flex gap-3">
                                    <button
                                        onClick={onDismiss}
                                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors text-sm"
                                    >
                                        Maybe Later
                                    </button>
                                    <button
                                        onClick={onNeverAsk}
                                        className="flex-1 py-3 bg-transparent hover:bg-gray-800/50 text-gray-500 font-medium rounded-xl transition-colors text-sm"
                                    >
                                        Don't Ask Again
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
