import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: {
        default: 'AFCON 2025 | The PPSU Chronicles',
        template: '%s | AFCON 2025 | The PPSU Chronicles',
    },
    description: 'Follow all the happenings of AFCON 2025 at P. P. Savani University. Live scores, fixtures, standings, and more!',
    openGraph: {
        title: 'AFCON 2025 at PPSU',
        description: 'The official page to catch all the happenings of AFCON 2025 at P. P. Savani University. Live streams, fixtures, standings, and exclusive coverage!',
        url: 'https://www.theppsuchronicles.com/afcon25',
        siteName: 'The PPSU Chronicles',
        images: [
            {
                url: 'https://www.theppsuchronicles.com/afcon.jpeg',
                width: 1200,
                height: 630,
                alt: 'AFCON 2025 at P. P. Savani University',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AFCON 2025 at PPSU',
        description: 'Follow all the happenings of AFCON 2025 at P. P. Savani University!',
        images: ['https://www.theppsuchronicles.com/afcon.jpeg'],
    },
};

export default function AFCON25Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="light">
            {children}
        </div>
    );
}
