'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { FaTwitter, FaWhatsapp, FaFacebook } from 'react-icons/fa';

interface ShareSheetProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    title: string;
    text?: string;
}

export default function ShareSheet({ isOpen, onClose, url, title, text }: ShareSheetProps) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => setCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [copied]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const shareToTwitter = () => {
        const tweetText = encodeURIComponent(`${title} ${text || ''}`);
        const tweetUrl = encodeURIComponent(url);
        window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`, '_blank');
    };

    const shareToWhatsApp = () => {
        const message = encodeURIComponent(`${title}\n${url}`);
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    const shareToFacebook = () => {
        const fbUrl = encodeURIComponent(url);
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${fbUrl}`, '_blank');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-50"
                        onClick={onClose}
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl z-50 p-6 pb-8"
                    >
                        {/* Handle */}
                        <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-6" />

                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white">Share Match</h3>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* URL Input with Copy */}
                        <div className="flex items-center gap-2 mb-6">
                            <input
                                type="text"
                                value={url}
                                readOnly
                                className="flex-1 bg-gray-800 text-gray-300 text-sm rounded-xl px-4 py-3 border border-gray-700 outline-none"
                            />
                            <button
                                onClick={handleCopy}
                                className={`p-3 rounded-xl transition-all ${copied
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:text-white'
                                    }`}
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Social Share Buttons */}
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={shareToTwitter}
                                className="flex flex-col items-center gap-2 p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
                            >
                                <FaTwitter className="w-6 h-6 text-[#1DA1F2]" />
                                <span className="text-xs text-gray-400">Twitter</span>
                            </button>
                            <button
                                onClick={shareToWhatsApp}
                                className="flex flex-col items-center gap-2 p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
                            >
                                <FaWhatsapp className="w-6 h-6 text-[#25D366]" />
                                <span className="text-xs text-gray-400">WhatsApp</span>
                            </button>
                            <button
                                onClick={shareToFacebook}
                                className="flex flex-col items-center gap-2 p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
                            >
                                <FaFacebook className="w-6 h-6 text-[#1877F2]" />
                                <span className="text-xs text-gray-400">Facebook</span>
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
