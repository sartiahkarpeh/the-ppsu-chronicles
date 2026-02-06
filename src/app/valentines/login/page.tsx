// src/app/valentines/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Hash, Lock, ArrowRight, Loader2 } from 'lucide-react';

interface FormErrors {
    enrollmentNumber?: string;
    password?: string;
    general?: string;
}

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        enrollmentNumber: '',
        password: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.enrollmentNumber.trim() || !formData.password) {
            setErrors({
                enrollmentNumber: !formData.enrollmentNumber.trim() ? 'Required' : undefined,
                password: !formData.password ? 'Required' : undefined,
            });
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const response = await fetch('/api/valentines/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enrollmentNumber: formData.enrollmentNumber.trim(),
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setErrors({ general: data.error || 'Login failed' });
                return;
            }

            // Use window.location for reliable navigation after cookie is set
            window.location.href = '/valentines/dashboard';
        } catch {
            setErrors({ general: 'An error occurred. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white/90 backdrop-blur rounded-3xl p-8 shadow-xl max-w-md w-full"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-16 h-16 mx-auto bg-gradient-to-br from-rose-500 to-red-600 rounded-full flex items-center justify-center mb-4"
                    >
                        <Heart className="w-8 h-8 text-white fill-white" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
                    <p className="text-gray-600 mt-1">Login to continue to your dashboard</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {errors.general && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 text-red-600 p-3 rounded-lg text-sm"
                        >
                            {errors.general}
                        </motion.div>
                    )}

                    {/* Enrollment Number */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Enrollment Number
                        </label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                name="enrollmentNumber"
                                value={formData.enrollmentNumber}
                                onChange={handleChange}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.enrollmentNumber ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    } focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all`}
                                placeholder="Enter your enrollment number"
                            />
                        </div>
                        {errors.enrollmentNumber && (
                            <p className="mt-1 text-sm text-red-500">{errors.enrollmentNumber}</p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    } focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all`}
                                placeholder="Enter your password"
                            />
                        </div>
                        {errors.password && (
                            <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <motion.button
                        type="submit"
                        disabled={isLoading}
                        whileHover={{ scale: isLoading ? 1 : 1.02 }}
                        whileTap={{ scale: isLoading ? 1 : 0.98 }}
                        className="w-full py-4 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-rose-200 hover:shadow-xl transition-shadow disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Logging in...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                Login
                                <ArrowRight className="w-5 h-5" />
                            </span>
                        )}
                    </motion.button>
                </form>

                {/* Register Link */}
                <p className="text-center mt-6 text-gray-600">
                    Don&apos;t have an account?{' '}
                    <Link href="/valentines/register" className="text-rose-600 font-semibold hover:underline">
                        Register here
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
