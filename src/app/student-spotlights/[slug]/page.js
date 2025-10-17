import Image from 'next/image';
export const revalidate = 60;
import { db } from '../../../firebase/config';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import ShareButtons from '../../../components/ShareButtons';

// Generate dynamic metadata for SEO and social sharing
export async function generateMetadata({ params }) {
    const spotlight = await getSpotlight(params.slug);

    if (!spotlight) {
        return {
            title: 'Spotlight Not Found',
            description: 'The student spotlight you are looking for does not exist.',
        };
    }

    const baseUrl = 'https://www.theppsuchronicles.com';
    const spotlightUrl = `${baseUrl}/student-spotlights/${params.slug}`;
    const imageUrl = spotlight.imageUrl || `${baseUrl}/ppsu.png`; // Use spotlight image or fallback

    return {
        title: `${spotlight.name} - Student Spotlight`,
        description: spotlight.bio?.substring(0, 160) || `Meet ${spotlight.name}, featured in The PPSU Chronicles Student Spotlight`,
        openGraph: {
            title: `${spotlight.name} - Student Spotlight`,
            description: spotlight.bio?.substring(0, 160) || `Meet ${spotlight.name}, featured in The PPSU Chronicles Student Spotlight`,
            url: spotlightUrl,
            siteName: 'The PPSU Chronicles',
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: spotlight.name,
                },
            ],
            locale: 'en_US',
            type: 'profile',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${spotlight.name} - Student Spotlight`,
            description: spotlight.bio?.substring(0, 160) || `Meet ${spotlight.name}, featured in The PPSU Chronicles Student Spotlight`,
            images: [imageUrl],
            creator: '@PPSUChronicles',
            site: '@PPSUChronicles',
        },
    };
}

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
            // Try to find by document ID as fallback
            const docRef = doc(db, 'spotlights', slug);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists() || docSnap.data().status !== 'published') {
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
            slug: doc.data().slug || doc.id, // Use document ID as fallback
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
                    <div className="md:w-1/3 relative min-h-[400px]">
                        <Image
                            src={spotlight.imageUrl || '/ppsu.png'}
                            alt={spotlight.studentName}
                            fill
                            className="object-cover"
                            priority={false}
                        />
                    </div>
                    <div className="p-8 md:w-2/3">
                        <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">{spotlight.major}</div>
                        <h1 className="block mt-1 text-4xl leading-tight font-bold text-black">{spotlight.studentName}</h1>
                        <blockquote className="mt-4 text-gray-500 italic border-l-4 border-indigo-200 pl-4">
                            &quot;{spotlight.quote}&quot;
                        </blockquote>
                        <div className="mt-6 prose max-w-none text-gray-700 whitespace-pre-wrap">{spotlight.content}</div>
                        
                        {/* Share Section */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <span className="text-sm text-gray-500 font-semibold block mb-3">Share this spotlight:</span>
                            <ShareButtons 
                                title={`${spotlight.studentName} - Student Spotlight`} 
                                description={spotlight.bio?.substring(0, 160) || spotlight.content?.substring(0, 160)} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
