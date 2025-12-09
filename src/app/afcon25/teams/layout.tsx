import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Teams',
    description: 'AFCON 2025 participating teams at P. P. Savani University. Meet the teams competing for glory!',
    openGraph: {
        title: 'AFCON 2025 Teams',
        description: 'Discover all the teams participating in AFCON 2025 at P. P. Savani University!',
        url: 'https://www.theppsuchronicles.com/afcon25/teams',
        siteName: 'The PPSU Chronicles',
        images: [
            {
                url: 'https://www.theppsuchronicles.com/images/afcon.jpeg',
                width: 1200,
                height: 630,
                alt: 'AFCON 2025 Teams',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AFCON 2025 Teams',
        description: 'Meet the teams competing in AFCON 2025 at PPSU!',
        images: ['https://www.theppsuchronicles.com/images/afcon.jpeg'],
    },
};

export default function TeamsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
