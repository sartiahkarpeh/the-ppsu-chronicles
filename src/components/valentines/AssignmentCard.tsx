// src/components/valentines/AssignmentCard.tsx
'use client';

import { motion } from 'framer-motion';
import { Heart, Phone, Hash, MessageCircle } from 'lucide-react';

interface AssignedPerson {
    fullName: string;
    enrollmentNumber: string;
    whatsappNumber: string;
}

interface AssignmentCardProps {
    assignedPerson: AssignedPerson;
}

export default function AssignmentCard({ assignedPerson }: AssignmentCardProps) {
    const whatsappLink = `https://wa.me/${assignedPerson.whatsappNumber.replace(/\D/g, '')}`;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md mx-auto"
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-red-600 p-6 text-center">
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-20 h-20 mx-auto bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-4"
                >
                    <Heart className="w-10 h-10 text-white fill-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white">Your Valentine Assignment</h2>
                <p className="text-rose-100 mt-1">Prepare a heartfelt gift for...</p>
            </div>

            {/* Content */}
            <div className="p-6">
                {/* Name */}
                <div className="text-center mb-6">
                    <motion.h3
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-3xl font-bold text-gray-800"
                    >
                        {assignedPerson.fullName}
                    </motion.h3>
                </div>

                {/* Details */}
                <div className="space-y-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center gap-3 p-4 bg-rose-50 rounded-xl"
                    >
                        <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center">
                            <Hash className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Enrollment Number</p>
                            <p className="font-semibold text-gray-800">{assignedPerson.enrollmentNumber}</p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center gap-3 p-4 bg-green-50 rounded-xl"
                    >
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                            <Phone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">WhatsApp Number</p>
                            <p className="font-semibold text-gray-800">{assignedPerson.whatsappNumber}</p>
                        </div>
                    </motion.div>
                </div>

                {/* WhatsApp Button */}
                <motion.a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-6 flex items-center justify-center gap-2 w-full py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
                >
                    <MessageCircle className="w-5 h-5" />
                    Open WhatsApp Chat
                </motion.a>

                {/* Note */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-center text-sm text-gray-500 mt-4"
                >
                    Remember: This assignment is permanent and confidential until Valentine&apos;s Day! 💕
                </motion.p>
            </div>
        </motion.div>
    );
}
