import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Team Standings',
    description: 'AFCON 2025 group standings and team rankings at P. P. Savani University. See how teams are performing!',
    openGraph: {
        title: 'AFCON 2025 Team Standings',
        description: 'Check the AFCON 2025 group standings and team rankings at P. P. Savani University. Points, goals, and more!',
        url: 'https://www.theppsuchronicles.com/afcon25/standings',
        siteName: 'The PPSU Chronicles',
        images: [
            {
                url: 'https://www.theppsuchronicles.com/images/afcon.jpeg',
                width: 1200,
                height: 630,
                alt: 'AFCON 2025 Team Standings',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AFCON 2025 Team Standings',
        description: 'Check the AFCON 2025 group standings at PPSU!',
        images: ['https://www.theppsuchronicles.com/images/afcon.jpeg'],
    },
};

export default function StandingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
