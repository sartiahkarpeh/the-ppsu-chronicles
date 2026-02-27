import type { Metadata } from 'next';
import BasketballNavbar from '@/components/basketball/BasketballNavbar';
import ScoresTicker from '@/components/basketball/ScoresTicker';

export const metadata: Metadata = {
    title: {
        default: 'Basketball | The PPSU Chronicles',
        template: '%s | Basketball | PPSU Chronicles',
    },
    description: 'The official home for PPSU Basketball. Live scores, team rosters, player stats, and schedules.',
    openGraph: {
        title: 'PPSU Basketball Hub',
        description: 'Follow PPSU Hoops with live scores, team standings, and deep dives into player performance.',
        url: 'https://www.theppsuchronicles.com/basketball',
        siteName: 'The PPSU Chronicles',
        images: [
            {
                url: 'https://www.theppsuchronicles.com/basketball-hero.jpg', // Default OG image
                width: 1200,
                height: 630,
                alt: 'PPSU Basketball',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'PPSU Basketball',
        description: 'Follow PPSU Hoops with live scores, team standings, and detailed player stats!',
    },
};

export default function BasketballLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-neutral-900 text-white font-sans flex flex-col">
            {/* Global sticky Scores Ticker */}
            <ScoresTicker />

            {/* Specialized Basketball Navigation */}
            <BasketballNavbar />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col">
                {children}
            </main>

            {/* Specialized Basketball Footer */}
            <footer className="bg-black border-t border-neutral-800 py-12 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-neutral-400">
                    <p className="font-display font-medium text-lg text-white mb-2 tracking-tight">
                        <span className="text-orange-500">PPSU</span> Hoops
                    </p>
                    <p className="text-sm">
                        &copy; {new Date().getFullYear()} The PPSU Chronicles. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
