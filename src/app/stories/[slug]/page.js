import { db } from '../../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import CommentSection from '../../../components/CommentSection'; // Assuming this component exists

// Fetches a single story by its slug
async function getStory(slug) {
  const storiesCollection = collection(db, 'stories');
  // Query for a published story with a matching slug
  const q = query(
    storiesCollection,
    where('slug', '==', slug),
    where('status', '==', 'published')
  );

  try {
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null; // No story found
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Format data and convert timestamps
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate().toISOString() || null,
      updatedAt: data.updatedAt?.toDate().toISOString() || null,
    };
  } catch (error) {
    console.error("Error fetching story:", error);
    return null;
  }
}

// Generates static paths for all published stories at build time
export async function generateStaticParams() {
  const storiesCollection = collection(db, 'stories');
  const q = query(storiesCollection, where('status', '==', 'published'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      slug: doc.data().slug,
    }));
  } catch (error) {
    console.error("Error generating static params for stories:", error);
    return [];
  }
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
            <img 
                src={story.imageUrl} 
                alt={story.title} 
                className="w-full h-96 object-cover rounded-t-lg mb-8" 
            />
        )}
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">{story.title}</h1>
        <div className="text-gray-500 mb-6">
          <span>By {story.author || 'Anonymous'}</span> | 
          <span> Published on {new Date(story.createdAt).toLocaleDateString()}</span>
        </div>
        
        {/* Render content safely */}
        <div className="prose lg:prose-xl max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: story.content }}></div>
        
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
            <h2 className="text-2xl font-bold mb-4">Comments</h2>
            <CommentSection storyId={story.id} />
        </div>
      </article>
    </div>
  );
}
