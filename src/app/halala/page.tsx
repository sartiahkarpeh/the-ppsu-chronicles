import type { Metadata } from 'next';
import { getAdminDb } from '@/lib/firebaseAdmin';
import HalalaMemorial from '@/components/halala/HalalaMemorial';
import Footer from '@/components/Footer';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'In Loving Memory of Halala Khumalo | The PPSU Chronicles',
  description:
    'A memorial for Halala Khumalo (2005–2026), a beloved international student from the Kingdom of Eswatini at P. P. Savani University. Share a tribute and honour his memory.',
  openGraph: {
    title: 'In Loving Memory of Halala Khumalo',
    description:
      'A beloved brother, friend, and teammate from the Kingdom of Eswatini. Gone far too soon, but never forgotten.',
    url: 'https://www.theppsuchronicles.com/halala',
    siteName: 'The PPSU Chronicles',
    images: [
      {
        url: '/halala/pic3.jpeg',
        width: 1086,
        height: 1448,
        alt: 'In loving memory of Halala Khumalo',
      },
    ],
    type: 'profile',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'In Loving Memory of Halala Khumalo',
    description:
      'A beloved brother, friend, and teammate from the Kingdom of Eswatini. Gone far too soon, but never forgotten.',
    images: ['/halala/pic3.jpeg'],
  },
};

type Tribute = {
  id: string;
  name: string;
  country: string;
  message: string;
  images: string[];
  createdAt: string;
  updatedAt?: string;
};

async function getTributes(): Promise<Tribute[]> {
  try {
    const db = getAdminDb();
    if (!db) return [];
    // Order by a single field (createdAt) so only the automatic index is needed —
    // no composite index required. Status is filtered in code.
    const snapshot = await db
      .collection('halala_tributes')
      .orderBy('createdAt', 'desc')
      .limit(300)
      .get();

    return snapshot.docs
      .filter((doc) => (doc.data().status || 'published') === 'published')
      .slice(0, 200)
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Anonymous',
          country: data.country || '',
          message: data.message || '',
          images: Array.isArray(data.images) ? data.images : [],
          createdAt:
            data.createdAt ||
            data.timestamp?.toDate?.().toISOString() ||
            new Date().toISOString(),
          updatedAt: data.updatedAt || undefined,
        };
      });
  } catch (error) {
    console.error('Error fetching Halala tributes:', error);
    return [];
  }
}

export default async function HalalaPage() {
  const tributes = await getTributes();

  return (
    <>
      <HalalaMemorial initialTributes={tributes} />
      <Footer />
    </>
  );
}
