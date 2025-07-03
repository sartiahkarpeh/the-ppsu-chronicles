'use client'

import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import VideoModal from '../../components/VideoModal';

// This is now a client component to handle modal state
export default function MediaPage() {
    const [mediaItems, setMediaItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState(null);

    useEffect(() => {
        // Fetches all published media items
        async function getMedia() {
            const mediaCollection = collection(db, 'media');
            const q = query(
                mediaCollection,
                where('status', '==', 'published'),
                orderBy('createdAt', 'desc')
            );
            try {
                const snapshot = await getDocs(q);
                const items = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate().toISOString() || null,
                    };
                });
                setMediaItems(items);
            } catch (error) {
                console.error("Error fetching media:", error);
            } finally {
                setLoading(false);
            }
        }
        getMedia();
    }, []);

    if (loading) {
        return <div className="text-center py-10">Loading Media...</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">Media Gallery</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {mediaItems.map((item) => (
                    <div key={item.id} className="group bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300">
                        {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-56 object-cover" />
                        )}
                        {item.youtubeEmbedUrl && !item.imageUrl && (
                            // Display a thumbnail for videos
                            <div className="w-full h-56 bg-black flex items-center justify-center cursor-pointer" onClick={() => setSelectedVideo(item.youtubeEmbedUrl)}>
                               <svg className="w-16 h-16 text-white opacity-70 group-hover:opacity-100" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"></path></svg>
                            </div>
                        )}
                        <div className="p-4">
                            <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            {item.youtubeEmbedUrl && (
                                <button onClick={() => setSelectedVideo(item.youtubeEmbedUrl)} className="text-sm text-indigo-600 hover:text-indigo-800 mt-2 font-semibold">
                                    Watch Video
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {selectedVideo && (
                <VideoModal videoUrl={selectedVideo} onClose={() => setSelectedVideo(null)} />
            )}
        </div>
    );
}
