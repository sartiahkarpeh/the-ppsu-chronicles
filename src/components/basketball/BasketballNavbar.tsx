'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function BasketballNavbar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const links = [
        { label: 'Home', href: '/basketball' },
        { label: 'Games', href: '/basketball/games' },
        { label: 'Teams', href: '/basketball/teams' },
        { label: 'Players', href: '/basketball/players' },
    ];

    const isActive = (href: string) => {
        if (href === '/basketball') {
            return pathname === '/basketball';
        }
        return pathname?.startsWith(href);
    };

    return (
        <nav className="bg-black text-white sticky top-0 z-50 border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo & Brand */}
                    <Link href="/basketball" className="flex items-center gap-3 group">
                        <div className="relative w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center overflow-hidden">
                            <span className="text-xl">🏀</span>
                        </div>
                        <span className="font-display font-bold text-xl tracking-tight text-white group-hover:text-orange-500 transition-colors">
                            PPSU Hoops
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`text-sm font-medium transition-colors ${isActive(link.href)
                                        ? 'text-orange-500'
                                        : 'text-gray-300 hover:text-white'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-gray-400 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-gray-900 border-t border-gray-800 animate-in slide-in-from-top-2">
                    <div className="px-4 py-4 space-y-3">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block text-base font-medium px-4 py-2 rounded-lg transition-colors ${isActive(link.href)
                                        ? 'bg-orange-600/10 text-orange-500'
                                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
}
