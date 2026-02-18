'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PenLine, Bell, BookOpen, Search, User2 } from 'lucide-react';
import { useDiaryAuth } from '@/hooks/useDiaryAuth';
import NotificationBell from './NotificationBell';

const tabs = [
    { href: '/diaries', label: 'For You' },
    { href: '/diaries/following', label: 'Following' },
    { href: '/diaries/writers', label: 'Writers' },
];

export default function DiaryNavbar() {
    const pathname = usePathname();
    const { user, profile, isWriter } = useDiaryAuth();

    return (
        <nav className="sticky top-0 z-50 bg-white border-b border-[#e5e5e5]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-14">
                    {/* Logo */}
                    <Link href="/diaries" className="flex items-center gap-2 shrink-0">
                        <BookOpen className="w-6 h-6 text-[#FF6719]" />
                        <span className="text-lg font-bold text-[#1a1a1a] hidden sm:inline">
                            Diaries
                        </span>
                    </Link>

                    {/* Center Tabs */}
                    <div className="flex items-center gap-0.5 sm:gap-1">
                        {tabs.map(tab => {
                            const isActive =
                                tab.href === '/diaries'
                                    ? pathname === '/diaries'
                                    : pathname?.startsWith(tab.href);
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${isActive
                                        ? 'bg-[#FF6719] text-white'
                                        : 'text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#fafafa]'
                                        }`}
                                >
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {user && profile && <NotificationBell />}
                        {user && profile && (
                            <Link href="/diaries/profile" className="shrink-0" title="Your profile">
                                {profile.avatar ? (
                                    <img src={profile.avatar} alt={profile.displayName} className="w-7 h-7 rounded-full object-cover border border-[#e5e5e5] hover:border-[#FF6719] transition-colors" />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-[#f5f5f5] border border-[#e5e5e5] hover:border-[#FF6719] transition-colors flex items-center justify-center">
                                        <User2 className="w-3.5 h-3.5 text-[#6b6b6b]" />
                                    </div>
                                )}
                            </Link>
                        )}
                        {user && profile && (
                            <Link
                                href="/diaries/dashboard"
                                className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] hidden sm:inline-block"
                            >
                                Dashboard
                            </Link>
                        )}
                        {user && profile && (
                            <Link
                                href="/diaries/saved"
                                className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] hidden sm:inline-block"
                            >
                                Saved
                            </Link>
                        )}
                        {isWriter ? (
                            <Link
                                href="/diaries/write"
                                className="flex items-center gap-1.5 bg-[#FF6719] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#e55b14] transition-colors"
                            >
                                <PenLine className="w-4 h-4" />
                                <span className="hidden sm:inline">Write</span>
                            </Link>
                        ) : user ? (
                            <Link
                                href="/diaries/onboarding"
                                className="flex items-center gap-1.5 bg-[#FF6719] text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold hover:bg-[#e55b14] transition-colors"
                            >
                                <span className="hidden sm:inline">Get Started</span>
                                <span className="sm:hidden">Start</span>
                            </Link>
                        ) : (
                            <Link
                                href="/diaries/login"
                                className="flex items-center gap-1.5 bg-[#FF6719] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#e55b14] transition-colors"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
