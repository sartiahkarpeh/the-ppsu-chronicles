'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Trophy, Users, Film, Settings, LayoutDashboard, ArrowLeft } from 'lucide-react';

export default function AFCONAdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    const navItems = [
        { name: 'Dashboard', href: '/admin/afcon25', icon: LayoutDashboard },
        { name: 'Fixtures', href: '/admin/afcon25/fixtures', icon: Calendar },
        { name: 'Standings', href: '/admin/afcon25/standings', icon: Trophy },
        { name: 'Teams', href: '/admin/afcon25/teams', icon: Users },
        { name: 'Highlights', href: '/admin/afcon25/highlights', icon: Film },
        { name: 'Settings', href: '/admin/afcon25/settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-40">
                <div className="font-display font-bold text-afcon-green">AFCON 2025</div>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-gray-600 dark:text-gray-300"
                >
                    <LayoutDashboard className="w-6 h-6" />
                </button>
            </div>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 hidden md:block">
                    <h1 className="text-2xl font-display font-bold text-afcon-green">AFCON 2025</h1>
                    <p className="text-xs text-black dark:text-gray-400 mt-1">Admin Panel</p>
                </div>

                <div className="p-4 border-b border-gray-200 dark:border-gray-700 md:hidden flex items-center justify-between">
                    <span className="font-bold text-lg dark:text-white">Menu</span>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <Link
                        href="/admin/dashboard"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-black dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Main Admin
                    </Link>

                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-afcon-green text-white shadow-md'
                                    : 'text-black dark:text-gray-200 hover:bg-black hover:text-white dark:hover:bg-black'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-black dark:text-gray-400 group-hover:text-white'}`} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-afcon-green/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-afcon-green">AD</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-black dark:text-white">Admin User</p>
                            <p className="text-xs text-black dark:text-gray-400">admin@afcon.com</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
