'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import { subscribeToNotifications, markAllNotificationsRead } from '@/lib/diary/firebase';
import { formatRelativeDate } from '@/lib/diary/utils';
import type { DiaryNotification } from '@/types/diary';

export default function NotificationBell() {
    const { user } = useDiaryAuth();
    const [notifications, setNotifications] = useState<DiaryNotification[]>([]);
    const [open, setOpen] = useState(false);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToNotifications(user.uid, setNotifications);
        return () => unsub();
    }, [user]);

    const handleMarkAllRead = async () => {
        if (!user) return;
        await markAllNotificationsRead(user.uid);
    };

    if (!user) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#FF6719]" />
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-[#e5e5e5] rounded-xl shadow-lg z-50 max-h-[70vh] overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5]">
                            <h3 className="font-bold text-[#1a1a1a]">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-[#FF6719] hover:underline font-medium"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>
                        <div className="overflow-y-auto max-h-[60vh]">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-sm text-[#6b6b6b]">
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <Link
                                        key={notif.id}
                                        href={notif.link || '#'}
                                        onClick={() => setOpen(false)}
                                        className={`block px-4 py-3 border-b border-[#f5f5f5] hover:bg-[#fafafa] transition-colors ${!notif.isRead ? 'bg-[#fff8f5]' : ''
                                            }`}
                                    >
                                        <p className="text-sm text-[#1a1a1a]">{notif.message}</p>
                                        <p className="text-xs text-[#6b6b6b] mt-1">
                                            {formatRelativeDate(notif.createdAt)}
                                        </p>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
