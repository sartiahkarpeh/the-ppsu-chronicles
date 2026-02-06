// src/app/valentines/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, User, Hash, Phone, Lock, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

interface FormErrors {
    fullName?: string;
    enrollmentNumber?: string;
    whatsappNumber?: string;
    password?: string;
    general?: string;
}

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: '',
        enrollmentNumber: '',
        whatsappNumber: '',
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        }

        if (!formData.enrollmentNumber.trim()) {
            newErrors.enrollmentNumber = 'Enrollment number is required';
        }

        if (!formData.whatsappNumber.trim()) {
            newErrors.whatsappNumber = 'WhatsApp number is required';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.password = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        setErrors({});

        try {
            const response = await fetch('/api/valentines/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: formData.fullName.trim(),
                    enrollmentNumber: formData.enrollmentNumber.trim(),
                    whatsappNumber: formData.whatsappNumber.trim(),
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.fields) {
                    setErrors(data.fields);
                } else {
                    setErrors({ general: data.error || 'Registration failed' });
                }
                return;
            }

            setIsSuccess(true);
            setTimeout(() => {
                window.location.href = '/valentines/login';
            }, 2000);
        } catch {
            setErrors({ general: 'An error occurred. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/90 backdrop-blur rounded-3xl p-8 shadow-xl text-center max-w-md w-full"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4"
                    >
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration Successful!</h2>
                    <p className="text-gray-600">Redirecting you to login...</p>
                </motion.div>
            </div>
        );
    }

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
                    <h1 className="text-2xl font-bold text-gray-800">Join the Exchange</h1>
                    <p className="text-gray-600 mt-1">Create your account to participate</p>
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

                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    } focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all`}
                                placeholder="Enter your full name"
                            />
                        </div>
                        {errors.fullName && (
                            <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>
                        )}
                    </div>

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

                    {/* WhatsApp Number */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            WhatsApp Number
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="tel"
                                name="whatsappNumber"
                                value={formData.whatsappNumber}
                                onChange={handleChange}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.whatsappNumber ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    } focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all`}
                                placeholder="+1234567890"
                            />
                        </div>
                        {errors.whatsappNumber && (
                            <p className="mt-1 text-sm text-red-500">{errors.whatsappNumber}</p>
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
                                placeholder="Create a password"
                            />
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                    } focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all`}
                                placeholder="Confirm your password"
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
                                Registering...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                Register
                                <ArrowRight className="w-5 h-5" />
                            </span>
                        )}
                    </motion.button>
                </form>

                {/* Login Link */}
                <p className="text-center mt-6 text-gray-600">
                    Already registered?{' '}
                    <Link href="/valentines/login" className="text-rose-600 font-semibold hover:underline">
                        Login here
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
