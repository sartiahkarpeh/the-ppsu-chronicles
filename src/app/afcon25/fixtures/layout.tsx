import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Fixtures & Results',
    description: 'AFCON 2025 match fixtures and results at P. P. Savani University. View upcoming matches and live scores!',
    openGraph: {
        title: 'AFCON 2025 Fixtures & Results',
        description: 'View all AFCON 2025 match fixtures and results at P. P. Savani University. Live scores, upcoming matches, and more!',
        url: 'https://www.theppsuchronicles.com/afcon25/fixtures',
        siteName: 'The PPSU Chronicles',
        images: [
            {
                url: 'https://www.theppsuchronicles.com/images/afcon.jpeg',
                width: 1200,
                height: 630,
                alt: 'AFCON 2025 Fixtures',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AFCON 2025 Fixtures & Results',
        description: 'View all AFCON 2025 match fixtures and results at PPSU!',
        images: ['https://www.theppsuchronicles.com/images/afcon.jpeg'],
    },
};

export default function FixturesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
