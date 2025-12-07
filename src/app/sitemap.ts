import { MetadataRoute } from 'next';
import { db } from '@/firebase/config';
import { collection, getDocs } from 'firebase/firestore';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://theppsuchronicles.com';
  const currentDate = new Date();

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/live`,
      lastModified: currentDate,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/stories`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/campus-news`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/media`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/student-voice`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/clubs`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  try {
    // Fetch dynamic routes from Firebase
    const [storiesSnapshot, campusNewsSnapshot, clubsSnapshot, spotlightsSnapshot] = await Promise.all([
      getDocs(collection(db, 'stories')),
      getDocs(collection(db, 'campusNews')),
      getDocs(collection(db, 'clubs')),
      getDocs(collection(db, 'studentSpotlights')),
    ]);

    // Stories routes
    const storiesRoutes: MetadataRoute.Sitemap = storiesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        url: `${baseUrl}/stories/${doc.id}`,
        lastModified: data.createdAt?.toDate() || currentDate,
        changeFrequency: 'monthly' as const,
        priority: 0.75,
      };
    });

    // Campus News routes
    const campusNewsRoutes: MetadataRoute.Sitemap = campusNewsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        url: `${baseUrl}/campus-news/${doc.id}`,
        lastModified: data.createdAt?.toDate() || currentDate,
        changeFrequency: 'monthly' as const,
        priority: 0.75,
      };
    });

    // Clubs routes
    const clubsRoutes: MetadataRoute.Sitemap = clubsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        url: `${baseUrl}/clubs/${encodeURIComponent(data.name?.toLowerCase().replace(/\s+/g, '-') || doc.id)}`,
        lastModified: data.createdAt?.toDate() || currentDate,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      };
    });

    // Student Spotlights routes
    const spotlightsRoutes: MetadataRoute.Sitemap = spotlightsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        url: `${baseUrl}/student-spotlights/${doc.id}`,
        lastModified: data.createdAt?.toDate() || currentDate,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      };
    });

    // Combine all routes
    return [
      ...staticRoutes,
      ...storiesRoutes,
      ...campusNewsRoutes,
      ...clubsRoutes,
      ...spotlightsRoutes,
    ];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Return static routes if Firebase fetch fails
    return staticRoutes;
  }
}
