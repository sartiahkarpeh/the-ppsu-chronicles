// src/app/valentines/page.tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Gift, Users, Sparkles, Quote } from 'lucide-react';

// Famous quotes about love and friendship
const loveQuotes = [
    {
        quote: "Love is composed of a single soul inhabiting two bodies.",
        author: "Aristotle"
    },
    {
        quote: "A friend is someone who knows all about you and still loves you.",
        author: "Elbert Hubbard"
    },
    {
        quote: "The greatest thing you'll ever learn is just to love and be loved in return.",
        author: "Eden Ahbez"
    },
    {
        quote: "Love is not about how many days, months, or years you've been together. It's about how much you love each other every single day.",
        author: "Unknown"
    },
    {
        quote: "Friendship is born at that moment when one person says to another, 'What! You too? I thought I was the only one.'",
        author: "C.S. Lewis"
    },
    {
        quote: "Being deeply loved by someone gives you strength, while loving someone deeply gives you courage.",
        author: "Lao Tzu"
    }
];

export default function ValentinesLandingPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-start px-4 py-12 valentine-container">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center max-w-3xl mx-auto mt-8 mb-16"
            >
                {/* Animated Heart Icon with Pulse Glow */}
                <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="mb-8"
                >
                    <div className="w-28 h-28 mx-auto bg-gradient-to-br from-rose-400 via-pink-500 to-red-600 rounded-full flex items-center justify-center pulse-glow">
                        <Heart className="w-14 h-14 text-white fill-white drop-shadow-lg" />
                    </div>
                </motion.div>

                {/* Main Title with Gradient Text */}
                <h1 className="heading-romantic mb-6">
                    <span className="shimmer-text">
                        Valentine&apos;s Gift Exchange
                    </span>
                </h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="subheading-romantic text-gray-600 mb-10 max-w-xl mx-auto"
                >
                    Join the PPSU Chronicles Valentine&apos;s Gift Exchange! Spin the wheel
                    and discover who you&apos;ll be surprising this Valentine&apos;s Day.
                    <span className="text-rose-500 font-medium"> Spread love & friendship! 💕</span>
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                    <Link href="/valentines/register">
                        <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-rose-500 via-pink-500 to-red-500 text-white font-bold rounded-2xl btn-romantic gradient-animate text-lg"
                        >
                            <span className="flex items-center justify-center gap-3">
                                <Sparkles className="w-6 h-6" />
                                Register Now
                            </span>
                        </motion.button>
                    </Link>

                    <Link href="/valentines/login">
                        <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full sm:w-auto px-10 py-4 glass-card text-rose-600 font-bold rounded-2xl border-2 border-rose-200 hover:border-rose-400 transition-all text-lg"
                        >
                            <span className="flex items-center justify-center gap-3">
                                <Heart className="w-5 h-5" />
                                Already Registered? Login
                            </span>
                        </motion.button>
                    </Link>
                </motion.div>
            </motion.div>

            {/* Famous Quotes Section */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="max-w-5xl mx-auto w-full mb-16"
            >
                <div className="flex items-center justify-center gap-3 mb-8">
                    <Quote className="w-6 h-6 text-rose-400" />
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center">
                        Words of <span className="text-gradient-romantic">Love & Friendship</span>
                    </h2>
                    <Quote className="w-6 h-6 text-rose-400 scale-x-[-1]" />
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {loveQuotes.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 25 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                            className="glass-card quote-card rounded-2xl p-6"
                        >
                            <p className="text-gray-700 italic leading-relaxed mb-4 text-[15px]">
                                &ldquo;{item.quote}&rdquo;
                            </p>
                            <p className="text-rose-500 font-semibold text-sm flex items-center gap-2">
                                <span className="w-6 h-[2px] bg-gradient-to-r from-rose-400 to-pink-400 rounded-full"></span>
                                {item.author}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* How It Works Section */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="max-w-4xl mx-auto w-full mb-16"
            >
                <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-10">
                    How It <span className="text-gradient-romantic">Works</span>
                </h2>

                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        {
                            icon: Users,
                            title: 'Register',
                            description: 'Sign up with your enrollment number and WhatsApp to join the exchange.',
                            gradient: 'from-pink-400 to-rose-500',
                        },
                        {
                            icon: Gift,
                            title: 'Spin',
                            description: 'When the spin phase opens, spin the wheel to get your match!',
                            gradient: 'from-rose-400 to-red-500',
                        },
                        {
                            icon: Heart,
                            title: 'Gift',
                            description: 'Prepare a thoughtful Valentine\'s gift for your assigned person.',
                            gradient: 'from-red-400 to-pink-500',
                        },
                    ].map((step, index) => (
                        <motion.div
                            key={step.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.7 + index * 0.15 }}
                            className="glass-card rounded-2xl p-7 text-center group"
                        >
                            <div className={`w-16 h-16 mx-auto bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <step.icon className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">{step.title}</h3>
                            <p className="text-gray-600 leading-relaxed">{step.description}</p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Romantic Quote Banner */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="max-w-3xl mx-auto w-full mb-12"
            >
                <div className="glass-card-strong rounded-3xl p-8 text-center border-glow">
                    <p className="text-xl md:text-2xl text-gray-700 italic leading-relaxed">
                        &ldquo;In the arithmetic of love, one plus one equals everything,
                        and two minus one equals nothing.&rdquo;
                    </p>
                    <p className="text-rose-500 font-semibold mt-4">— Mignon McLaughlin</p>
                </div>
            </motion.div>

            {/* Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="mt-8 text-center pb-8"
            >
                <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
                    Made with <Heart className="w-4 h-4 text-rose-500 fill-rose-500 heartbeat" /> by The PPSU Chronicles
                </p>
            </motion.div>
        </div>
    );
}
