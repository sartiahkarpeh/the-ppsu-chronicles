'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
    const pathname = usePathname();

    // Hide the global navbar on pages with their own navigation
    if (pathname?.startsWith('/admin/afcon25') || pathname?.startsWith('/diaries')) {
        return null;
    }

    return <Navbar />;
}
