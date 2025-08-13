'use client';

import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

export default function MediaPage() {
    const [playingVideos, setPlayingVideos] = useState(new Set());
    const [photoStories, setPhotoStories] = useState([]);

    useEffect(() => {
        const fetchPhotoStories = async () => {
            try {
                const ref = collection(db, 'media_videos');
                const q = query(ref, where('category', '==', 'photo'), where('status', '==', 'published'), orderBy('updatedAt', 'desc'));
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPhotoStories(data);
            } catch (error) {
                console.error('Error fetching photo stories:', error);
            }
        };

        fetchPhotoStories();
    }, []);

    const getYouTubeVideoId = (url) => {
        if (!url) return null;
        // This regex is more robust and covers more YouTube URL formats.
        const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
        const match = url.match(regExp);
        return (match && match[1]) ? match[1] : null;
    };

    const getYouTubeThumbnail = (url) => {
        const videoId = getYouTubeVideoId(url);
        // Use mqdefault.jpg as it is the most reliable thumbnail format
        // that is almost always available and not a black letterboxed image.
        return videoId
            ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
            : 'https://placehold.co/400x250?text=No+Video';
    };

    const getYouTubeEmbedUrl = (url, shouldAutoplay = false) => {
        const videoId = getYouTubeVideoId(url);
        if (!videoId) return null;
        const base = `https://www.youtube.com/embed/${videoId}`;
        const params = new URLSearchParams({
            rel: '0',
            enablejsapi: '1',
            autoplay: shouldAutoplay ? '1' : '0',
        });
        return `${base}?${params.toString()}`;
    };

    const handleVideoPlay = (itemId) => {
        setPlayingVideos(prev => new Set([...prev, itemId]));
    };

    const videoHighlights = [
        {
            id: 'vh1',
            title: 'Redefining Education, Transforming Lives – P P Savani University.',
            description: 'Welcome to P P Savani University – A Campus That Feels Like Home!',
            youtubeUrl: 'https://youtu.be/IN-LuIQAS7g?si=MaOgyLiLt0k-x58y'
        },
        {
            id: 'vh2',
            title: 'P P Savani University Campus Tour',
            description: 'Welcome to P P Savani University, where education meets innovation and excellence! Embark on a captivating journey through our state-of-the-art campus and discover the myriad opportunities that await you.',
            youtubeUrl: 'https://youtu.be/bsV4_nIV2sU?si=MQi4AjLVv40UEN6T'
        },
        {
            id: 'vh3',
            title: 'PPSU Hostel Life Where Strangers Become Family.',
            description: 'At PPSU, our hostel isn’t just a place to stay - it’s where bonds are built, stories are shared, and every room echoes with laughter and late-night conversations. ',
            youtubeUrl: 'https://youtu.be/JFINaP-gJQ0?si=kFfVmlHDfUdTBUGB'
        }
    ];

    const vlogsAndPodcasts = [
        {
            id: 'vp1',
            title: 'First Weeks Abroad for University',
            description: 'Flew to Asia for university! The start of an new era, and my first year of University.This is how my first couple of weeks were, trying to settle in, on a new continent for University.There was a lot of work to be done too because not only was I new to this environment, but I started my first semester 3 weeks late as welln',
            category: 'podcast',
            youtubeUrl: 'https://youtu.be/3WqgCn_jfZE?si=ldmcgS32gkgwT-om'
        },
        {
            id: 'vp2',
            title: 'Weekly Vlog: Student life ',
            description: 'Join me on a compilation of my week as I share my life. editing, somehow getting a swollen eye, listening to music, etc.',
            category: 'vlog',
            youtubeUrl: 'https://youtu.be/xziVWKCH6NY?si=iy_C4S8fMDVNjaqV'
        },
        {
            id: 'vp3',
            title: 'Amazing Day On P P Savani University',
            description: 'Come along with me as I spend an amazing day at P P Savani University! From attending classes and exploring the beautiful campus to chilling with friends and capturing some aesthetic moments, this day was full of fun, learning, and good vibes.',
            category: 'podcast',
            youtubeUrl: 'https://youtu.be/97PSJbMmvsk?si=av3oc8EZGNl6OiT0'
        }
    ];

    const renderVideoGrid = (videos, sectionTitle, color) => (
        <section className="mb-16">
            <h2 className={`text-3xl font-bold mb-8 text-gray-700 border-b-2 border-${color}-500 pb-2`}>
                {sectionTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {videos.map((item) => (
                    <div key={item.id} className="group bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300">
                        <div className="w-full h-56 relative bg-gray-200">
                            {playingVideos.has(item.id) ? (
                                <iframe
                                    className="w-full h-full"
                                    src={getYouTubeEmbedUrl(item.youtubeUrl, true)}
                                    title={item.title}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                />
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleVideoPlay(item.id)}
                                    className="absolute inset-0 w-full h-full"
                                    aria-label={`Play video: ${item.title}`}
                                >
                                    <img
                                        src={getYouTubeThumbnail(item.youtubeUrl)}
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <span className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center">
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </span>
                                    </span>
                                </button>
                            )}
                        </div>
                        <div className="p-4">
                            <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            {item.category && (
                                <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mt-2">
                                    {item.category}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-12">
                <h1 className="text-4xl font-bold mb-12 text-center text-gray-800">Media Gallery</h1>

                {renderVideoGrid(videoHighlights, 'Video Highlights', 'red')}

                {/* Photo Stories Section */}
                <section className="mb-16">
                    <h2 className="text-3xl font-bold mb-8 text-gray-700 border-b-2 border-green-500 pb-2">
                        Photo Stories
                    </h2>
                    {photoStories.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {photoStories.map((item) => (
                                <div key={item.id} className="group bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300">
                                    <img
                                        src={item.imageUrl}
                                        alt={item.title}
                                        className="w-full h-56 object-cover"
                                    />
                                    <div className="p-4">
                                        <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                            <p className="text-gray-500 text-lg">No photo stories available.</p>
                        </div>
                    )}
                </section>

                {renderVideoGrid(vlogsAndPodcasts, 'Vlogs & Podcasts', 'purple')}
            </div>
        </div>
    );
}
