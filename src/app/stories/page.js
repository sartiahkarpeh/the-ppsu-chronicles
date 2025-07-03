import { db } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import BlogPostCard from '../../components/BlogPostCard';

// Fetches all published stories from Firestore
async function getStories() {
  const storiesCollection = collection(db, 'stories');
  // Create a query to get only published stories, ordered by creation date
  const q = query(
    storiesCollection, 
    where('status', '==', 'published'), 
    orderBy('createdAt', 'desc')
  );
  
  try {
    const storySnapshot = await getDocs(q);
    // Process snapshot to format data for the component
    const stories = storySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore timestamp to a serializable format (ISO string)
        createdAt: data.createdAt?.toDate().toISOString() || null,
        updatedAt: data.updatedAt?.toDate().toISOString() || null,
      };
    });
    return stories;
  } catch (error) {
    console.error("Error fetching stories:", error);
    return []; // Return an empty array in case of an error
  }
}

// The page component is now async to await data fetching
export default async function StoriesPage() {
  const stories = await getStories();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">Student Stories</h1>
      {stories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Map over the fetched stories and render a card for each */}
          {stories.map(story => (
            <BlogPostCard key={story.id} post={story} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500">No stories have been published yet. Please check back later.</p>
      )}
    </div>
  );
}
