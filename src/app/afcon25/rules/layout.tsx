import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Rules & Regulations',
    description: 'AFCON 2025 tournament rules and regulations at P. P. Savani University.',
    openGraph: {
        title: 'AFCON 2025 Rules & Regulations',
        description: 'Official rules and regulations for the AFCON 2025 tournament at P. P. Savani University.',
        url: 'https://www.theppsuchronicles.com/afcon25/rules',
        siteName: 'The PPSU Chronicles',
        images: [
            {
                url: 'https://www.theppsuchronicles.com/afcon.jpeg',
                width: 1200,
                height: 630,
                alt: 'AFCON 2025 Rules',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AFCON 2025 Rules & Regulations',
        description: 'Official rules for AFCON 2025 at PPSU!',
        images: ['https://www.theppsuchronicles.com/afcon.jpeg'],
    },
};

export default function RulesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
