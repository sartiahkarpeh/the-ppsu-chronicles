import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Live Match',
    description: 'Watch AFCON 2025 live match at P. P. Savani University. Live scores, commentary, and updates!',
    openGraph: {
        title: 'AFCON 2025 Live Match',
        description: 'Follow the live action from AFCON 2025 at P. P. Savani University. Real-time scores and updates!',
        url: 'https://www.theppsuchronicles.com/afcon25/match',
        siteName: 'The PPSU Chronicles',
        images: [
            {
                url: '/images/afcon.jpeg',
                width: 1200,
                height: 630,
                alt: 'AFCON 2025 Live Match',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AFCON 2025 Live Match',
        description: 'Follow the live action from AFCON 2025 at PPSU!',
        images: ['/images/afcon.jpeg'],
    },
};

export default function MatchLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
