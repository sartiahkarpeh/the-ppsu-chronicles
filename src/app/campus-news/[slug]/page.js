import Image from 'next/image';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { notFound } from 'next/navigation';
import ShareButtons from '../../../components/ShareButtons';

export const revalidate = 60;

// Fetches a single news article by its slug
async function getNews(slug) {
  const newsCollection = collection(db, 'events');
  const q = query(newsCollection, where('slug', '==', slug));

  try {
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Try to find by document ID as fallback
      const docRef = doc(db, 'events', slug);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate().toISOString() || null,
      };
    }

    const docData = snapshot.docs[0];
    const data = docData.data();

    return {
      id: docData.id,
      ...data,
      createdAt: data.createdAt?.toDate().toISOString() || null,
    };
  } catch (error) {
    console.error('Error fetching news:', error);
    return null;
  }
}

// Generates static paths for all news articles at build time
export async function generateStaticParams() {
  const newsCollection = collection(db, 'events');
  try {
    const snapshot = await getDocs(newsCollection);
    return snapshot.docs.map(doc => ({
      slug: doc.data().slug || doc.id,
    }));
  } catch (error) {
    console.error('Error generating static params for campus news:', error);
    return [];
  }
}

// Generate metadata for social sharing
export async function generateMetadata({ params }) {
  const news = await getNews(params.slug);

  if (!news) {
    return {
      title: 'News Article Not Found',
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://the-ppsu-chronicles.vercel.app';
  const imageUrl = news.imageUrl || `${siteUrl}/ppsu.png`;

  return {
    title: news.title,
    description: news.content?.substring(0, 160) || 'Read this article on The PPSU Chronicles',
    openGraph: {
      title: news.title,
      description: news.content?.substring(0, 160) || 'Read this article on The PPSU Chronicles',
      url: `${siteUrl}/campus-news/${params.slug}`,
      siteName: 'The PPSU Chronicles',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: news.title,
        },
      ],
      locale: 'en_US',
      type: 'article',
      publishedTime: news.createdAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: news.title,
      description: news.content?.substring(0, 160) || 'Read this article on The PPSU Chronicles',
      images: [imageUrl],
    },
  };
}

export default async function NewsDetail({ params }) {
  const news = await getNews(params.slug);

  if (!news) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{news.title}</h1>
          {news.createdAt && (
            <div className="text-gray-600">
              Posted on {new Date(news.createdAt).toLocaleDateString()}
            </div>
          )}
        </header>

        {news.imageUrl && (
          <div className="mb-8 rounded-lg overflow-hidden relative h-96 w-full">
            <Image
              src={news.imageUrl}
              alt={news.title}
              fill
              className="object-cover"
              priority={false}
            />
          </div>
        )}

        <div className="prose prose-lg max-w-none">
          <div className="text-gray-800 whitespace-pre-wrap mb-8">{news.content}</div>
        </div>

        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Share this article</h3>
          <ShareButtons title={news.title} />
        </div>
      </article>
    </div>
  );
}
