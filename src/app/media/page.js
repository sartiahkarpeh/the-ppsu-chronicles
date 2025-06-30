'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Camera, Video, Mic } from 'lucide-react';
import VideoModal from '@/components/VideoModal';

export default function MediaPage() {
  const [media, setMedia] = useState({ videos: [], images: [], podcasts: [] });
  const [modalVideoUrl, setModalVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const openModal = (url) => setModalVideoUrl(url);
  const closeModal = () => setModalVideoUrl(null);

  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true);
      try {
        const mediaSnapshot = await getDocs(collection(db, 'media_videos'));
        const mediaList = mediaSnapshot.docs.map(doc => doc.data());

        // Separate by type
        const videos = mediaList.filter(item => item.type === 'video');
        const images = mediaList.filter(item => item.type === 'image');
        const podcasts = mediaList.filter(item => item.type === 'podcast');

        setMedia({ videos, images, podcasts });
      } catch (error) {
        console.error('Error fetching media:', error);
      }
      setLoading(false);
    };

    fetchMedia();
  }, []);

  if (loading) return <p className="text-center py-10">Loading media...</p>;

  return (
    <>
      <div className="container mx-auto px-6 py-12 md:py-20">
        {/* Header */}
        <header className="text-center mb-16">
          <Camera className="mx-auto text-primary h-16 w-16 mb-4" />
          <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary">Media & Gallery</h1>
          <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
            A visual journey through campus life. Explore videos, photos, and student-created content.
          </p>
        </header>

        {/* Video Highlights */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-text-primary mb-8 flex items-center gap-3">
            <Video className="text-secondary" /> Video Highlights
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {media.videos.map(video => (
              <div key={video.id || video.title} className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-2">{video.title}</h3>
                <p className="text-text-secondary mb-4">{video.description}</p>
                <div className="aspect-video">
                  <iframe
                    className="w-full h-full rounded-md"
                    src={`${video.youtubeUrl}?rel=0`}
                    title={video.title}
                    frameBorder="0"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Photo Stories */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-text-primary mb-8 flex items-center gap-3">
            <Camera className="text-secondary" /> Photo Stories
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {media.images.map(image => (
              <div key={image.id || image.alt} className="overflow-hidden rounded-lg shadow-md group">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover aspect-square transition-transform duration-300 group-hover:scale-110"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Vlogs & Podcasts */}
        <section>
          <h2 className="text-3xl font-bold text-text-primary mb-8 flex items-center gap-3">
            <Mic className="text-secondary" /> Vlogs & Podcasts
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {media.podcasts.map(podcast => (
              <div key={podcast.id || podcast.title} className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-2">{podcast.title}</h3>
                <p className="text-text-secondary mb-4">{podcast.description}</p>
                <div className="aspect-video">
                  <iframe
                    className="w-full h-full rounded-md"
                    src={podcast.embedUrl}
                    title={podcast.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {modalVideoUrl && <VideoModal videoUrl={modalVideoUrl} onClose={closeModal} />}
    </>
  );
}

