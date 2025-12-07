'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Check, X, Smartphone } from 'lucide-react';
import { useNotifications, InAppNotification } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface NotificationBellProps {
    onToggleSubscription?: () => void;
    isSubscribed?: boolean;
    isLoading?: boolean;
}

export default function NotificationBell({
    onToggleSubscription,
    isSubscribed = false,
    isLoading = false,
}: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const {
        isSupported: pushSupported,
        permission,
        requestPermission: requestPushPermission,
        isLoading: pushLoading
    } = usePushNotifications();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getNotificationIcon = (type: InAppNotification['type']) => {
        switch (type) {
            case 'goal': return '⚽';
            case 'kickoff': return '🏟️';
            case 'ht': return '⏸️';
            case 'ft': return '🏁';
            case 'card': return '🟨';
            default: return '📢';
        }
    };

    const handleNotificationClick = async (notification: InAppNotification) => {
        if (!notification.read) {
            await markAsRead(notification.id);
        }
    };

    // Handle subscription toggle with push permission request
    const handleSubscriptionToggle = async () => {
        // If enabling notifications, request push permission first
        if (!isSubscribed && pushSupported && permission !== 'granted') {
            await requestPushPermission();
        }

        // Then toggle the subscription
        if (onToggleSubscription) {
            onToggleSubscription();
        }
    };

    const showPushPrompt = pushSupported && permission !== 'granted' && isSubscribed;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className={`relative p-2 rounded-full transition-all ${isSubscribed
                    ? 'bg-green-600/20 text-green-400'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isSubscribed ? (
                    <Bell className="w-5 h-5" />
                ) : (
                    <BellOff className="w-5 h-5" />
                )}

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-12 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                            <h3 className="font-bold text-white">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-green-400 hover:text-green-300"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 text-gray-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Subscription Toggle */}
                        <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/50">
                            <button
                                onClick={handleSubscriptionToggle}
                                disabled={isLoading || pushLoading}
                                className={`w-full py-2 rounded-xl font-medium text-sm transition-all ${isSubscribed
                                    ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                {isLoading || pushLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Processing...
                                    </span>
                                ) : isSubscribed ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Check className="w-4 h-4" />
                                        Notifications On
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <Bell className="w-4 h-4" />
                                        Enable Notifications
                                    </span>
                                )}
                            </button>

                            {/* Push notification permission prompt */}
                            {showPushPrompt && (
                                <button
                                    onClick={requestPushPermission}
                                    className="w-full mt-2 py-2 px-3 rounded-xl text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 flex items-center justify-center gap-2"
                                >
                                    <Smartphone className="w-3 h-3" />
                                    Enable phone alerts
                                </button>
                            )}

                            {permission === 'granted' && isSubscribed && (
                                <p className="text-xs text-green-500 mt-2 text-center flex items-center justify-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Phone alerts enabled
                                </p>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-64 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="py-8 text-center text-gray-500">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No notifications yet</p>
                                    <p className="text-xs mt-1">Subscribe to matches to get updates</p>
                                </div>
                            ) : (
                                notifications.slice(0, 10).map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`px-4 py-3 border-b border-gray-800 cursor-pointer transition-colors ${notification.read
                                            ? 'bg-transparent'
                                            : 'bg-blue-900/10'
                                            } hover:bg-gray-800/50`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl">
                                                {getNotificationIcon(notification.type)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium ${notification.read ? 'text-gray-400' : 'text-white'
                                                    }`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-gray-500 line-clamp-2">
                                                    {notification.body}
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    {dayjs(notification.timestamp?.toDate()).fromNow()}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
