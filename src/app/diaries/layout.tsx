import { Toaster } from 'react-hot-toast';
import { Inter, Lora } from 'next/font/google';
import DiaryNavbar from '@/components/diary/DiaryNavbar';
import Footer from '@/components/Footer';
import type { Metadata } from 'next';

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin'],
    display: 'swap',
});

const lora = Lora({
    variable: '--font-lora',
    subsets: ['latin'],
    display: 'swap',
});



export default function DiariesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={`${inter.variable} ${lora.variable} min-h-screen flex flex-col`}>
            <DiaryNavbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster
                position="bottom-right"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#1a1a1a',
                        color: '#fff',
                        borderRadius: '12px',
                        fontSize: '14px',
                    },
                }}
            />
        </div>
    );
}
