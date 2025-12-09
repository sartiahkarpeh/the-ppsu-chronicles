import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Tournament Draw',
    description: 'AFCON 2025 Group Stage Draw at P. P. Savani University. See which teams are in each group!',
    openGraph: {
        title: 'AFCON 2025 Tournament Draw',
        description: 'Check out the official AFCON 2025 group stage draw at P. P. Savani University. See which teams will compete in each group!',
        url: 'https://www.theppsuchronicles.com/afcon25/draw',
        siteName: 'The PPSU Chronicles',
        images: [
            {
                url: '/images/afcon.jpeg',
                width: 1200,
                height: 630,
                alt: 'AFCON 2025 Tournament Draw',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AFCON 2025 Tournament Draw',
        description: 'Check out the official AFCON 2025 group stage draw at PPSU!',
        images: ['/images/afcon.jpeg'],
    },
};

export default function DrawLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
