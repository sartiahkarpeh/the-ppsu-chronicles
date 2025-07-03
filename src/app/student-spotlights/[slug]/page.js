import { db } from '../../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { notFound } from 'next/navigation';

// Fetches a single spotlight by its slug
async function getSpotlight(slug) {
    const spotlightsCollection = collection(db, 'spotlights');
    const q = query(
        spotlightsCollection,
        where('slug', '==', slug),
        where('status', '==', 'published')
    );

    try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return null;
        }
        const doc = snapshot.docs[0];
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate().toISOString() || null,
        };
    } catch (error) {
        console.error("Error fetching spotlight:", error);
        return null;
    }
}

// Generates static paths for all published spotlights
export async function generateStaticParams() {
    const spotlightsCollection = collection(db, 'spotlights');
    const q = query(spotlightsCollection, where('status', '==', 'published'));
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            slug: doc.data().slug,
        }));
    } catch (error) {
        console.error("Error generating static params for spotlights:", error);
        return [];
    }
}

export default async function StudentSpotlightPage({ params }) {
    const spotlight = await getSpotlight(params.slug);

    if (!spotlight) {
        notFound();
    }

    return (
        <div className="bg-gray-50 py-16">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden md:flex">
                    <div className="md:w-1/3">
                        <img 
                            className="h-full w-full object-cover" 
                            src={spotlight.imageUrl || 'https://placehold.co/400x600/a2d2ff/ffffff?text=Spotlight'} 
                            alt={spotlight.studentName} 
                        />
                    </div>
                    <div className="p-8 md:w-2/3">
                        <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">{spotlight.major}</div>
                        <h1 className="block mt-1 text-4xl leading-tight font-bold text-black">{spotlight.studentName}</h1>
                        <blockquote className="mt-4 text-gray-500 italic border-l-4 border-indigo-200 pl-4">
                           "{spotlight.quote}"
                        </blockquote>
                        <div className="mt-6 prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: spotlight.content }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
