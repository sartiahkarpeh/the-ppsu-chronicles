'use client';

import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Bell, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
    return (
        <div className="fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, 3000);

        return () => clearTimeout(timer);
    }, [toast.id, onRemove]);

    const icons = {
        success: <Check className="w-5 h-5 text-green-400" />,
        error: <X className="w-5 h-5 text-red-400" />,
        info: <Bell className="w-5 h-5 text-blue-400" />,
    };

    const bgColors = {
        success: 'bg-green-900/90 border-green-700',
        error: 'bg-red-900/90 border-red-700',
        info: 'bg-blue-900/90 border-blue-700',
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md pointer-events-auto ${bgColors[toast.type]}`}
        >
            {icons[toast.type]}
            <span className="text-white text-sm font-medium flex-1">{toast.message}</span>
            <button
                onClick={() => onRemove(toast.id)}
                className="text-gray-400 hover:text-white transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
}

// Standalone toast component for simpler use cases
export default function Toast({
    message,
    type = 'success',
    isVisible,
    onClose,
}: {
    message: string;
    type?: ToastType;
    isVisible: boolean;
    onClose: () => void;
}) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    const icons = {
        success: <Check className="w-5 h-5 text-green-400" />,
        error: <X className="w-5 h-5 text-red-400" />,
        info: <Bell className="w-5 h-5 text-blue-400" />,
    };

    const bgColors = {
        success: 'bg-green-900/90 border-green-700',
        error: 'bg-red-900/90 border-red-700',
        info: 'bg-blue-900/90 border-blue-700',
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    className={`fixed bottom-4 left-4 right-4 flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md z-[100] ${bgColors[type]}`}
                >
                    {icons[type]}
                    <span className="text-white text-sm font-medium flex-1">{message}</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
