// src/app/live/layout.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '🔴 Live Scores - The PPSU Chronicles',
  description: 'Real-time live scores and updates from ongoing football and basketball matches at P. P. Savani University',
  openGraph: {
    title: '🔴 Live Scores - The PPSU Chronicles',
    description: 'Real-time live scores and updates from ongoing football and basketball matches at P. P. Savani University',
    url: 'https://www.theppsuchronicles.com/live',
    siteName: 'The PPSU Chronicles',
    images: [
      {
        url: 'https://www.theppsuchronicles.com/ppsu.png',
        width: 1200,
        height: 630,
        alt: 'PPSU Chronicles Live Scores',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '🔴 Live Scores - The PPSU Chronicles',
    description: 'Real-time live scores and updates from ongoing football and basketball matches',
    images: ['https://www.theppsuchronicles.com/ppsu.png'],
    creator: '@PPSUChronicles',
    site: '@PPSUChronicles',
  },
};

export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
