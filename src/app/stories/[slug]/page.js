import { db } from '../../../firebase/config';
import Image from 'next/image';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import CommentSection from '../../../components/CommentSection';
import ShareButtons from '../../../components/ShareButtons';

export const revalidate = 60;

// Fetches a single story by its slug
async function getStory(slug) {
  const postsCollection = collection(db, 'posts');
  // Query for a published story with a matching slug
  const q = query(
    postsCollection,
    where('slug', '==', slug),
    where('status', '==', 'published')
  );

  try {
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Try to find by document ID as fallback
      const docRef = doc(db, 'posts', slug);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists() || docSnap.data().status !== 'published') {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate().toISOString() || null,
        updatedAt: data.updatedAt?.toDate().toISOString() || null,
        content: data.story || data.content,
        author: data.name || data.author || 'Anonymous',
      };
    }

    const docData = snapshot.docs[0];
    const data = docData.data();

    // Format data and convert timestamps
    return {
      id: docData.id,
      ...data,
      createdAt: data.createdAt?.toDate().toISOString() || null,
      updatedAt: data.updatedAt?.toDate().toISOString() || null,
      content: data.story || data.content,
      author: data.name || data.author || 'Anonymous',
    };
  } catch (error) {
    console.error("Error fetching story:", error);
    return null;
  }
}

// Generates static paths for all published stories at build time
export async function generateStaticParams() {
  const postsCollection = collection(db, 'posts');
  const q = query(postsCollection, where('status', '==', 'published'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      slug: doc.data().slug || doc.id, // Use document ID as fallback
    }));
  } catch (error) {
    console.error("Error generating static params for stories:", error);
    return [];
  }
}

// Generate metadata for social sharing
export async function generateMetadata({ params }) {
  const story = await getStory(params.slug);

  if (!story) {
    return {
      title: 'Story Not Found',
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://the-ppsu-chronicles.vercel.app';
  const imageUrl = story.imageUrl || `${siteUrl}/ppsu.png`;

  return {
    title: story.title,
    description: story.content?.substring(0, 160) || 'Read this story on The PPSU Chronicles',
    openGraph: {
      title: story.title,
      description: story.content?.substring(0, 160) || 'Read this story on The PPSU Chronicles',
      url: `${siteUrl}/stories/${params.slug}`,
      siteName: 'The PPSU Chronicles',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: story.title,
        },
      ],
      locale: 'en_US',
      type: 'article',
      publishedTime: story.createdAt,
      authors: [story.author || 'Anonymous'],
    },
    twitter: {
      card: 'summary_large_image',
      title: story.title,
      description: story.content?.substring(0, 160) || 'Read this story on The PPSU Chronicles',
      images: [imageUrl],
    },
  };
}

export default async function StoryPage({ params }) {
  const story = await getStory(params.slug);

  // If no story is found, render the 404 page
  if (!story) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <article className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        {story.imageUrl && (
          <div className="relative w-full h-96 mb-8">
            <Image
              src={story.imageUrl}
              alt={story.title}
              fill
              className="object-cover rounded-t-lg"
              priority={false}
            />
          </div>
        )}
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">{story.title}</h1>
        <div className="text-gray-500 mb-6">
          <span>By {story.author || 'Anonymous'}</span> |
          <span> Published on {new Date(story.createdAt).toLocaleDateString()}</span>
        </div>

        {/* Render content safely */}
        <div className="prose lg:prose-xl max-w-none text-gray-800 whitespace-pre-wrap">{story.content}</div>

        {/* Share Section */}
        <div className="mt-8 flex items-center gap-4">
          <span className="text-sm text-gray-500 font-semibold">Share this story:</span>
          <ShareButtons title={story.title} />
        </div>

        {/* Optional: Render YouTube video if URL exists */}
        {story.youtubeEmbedUrl && (
          <div className="mt-8">
            <iframe
              width="100%"
              height="480"
              src={story.youtubeEmbedUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-lg"
            ></iframe>
          </div>
        )}

        {/* Comment Section */}
        <div className="mt-12 border-t pt-8">
          {/* Removed duplicate heading here */}
          <CommentSection storyId={story.id} />
        </div>
      </article>
    </div>
  );
}
