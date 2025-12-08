'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
    const pathname = usePathname();

    // Hide the global navbar on AFCON admin pages (they have their own sidebar)
    if (pathname?.startsWith('/admin/afcon25')) {
        return null;
    }

    return <Navbar />;
}
