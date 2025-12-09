import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Highlights',
    description: 'AFCON 2025 match highlights and best moments at P. P. Savani University. Watch the action!',
    openGraph: {
        title: 'AFCON 2025 Highlights',
        description: 'Watch the best moments from AFCON 2025 matches at P. P. Savani University. Goals, saves, and all the action!',
        url: 'https://www.theppsuchronicles.com/afcon25/highlights',
        siteName: 'The PPSU Chronicles',
        images: [
            {
                url: '/images/afcon.jpeg',
                width: 1200,
                height: 630,
                alt: 'AFCON 2025 Highlights',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AFCON 2025 Highlights',
        description: 'Watch the best moments from AFCON 2025 at PPSU!',
        images: ['/images/afcon.jpeg'],
    },
};

export default function HighlightsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
