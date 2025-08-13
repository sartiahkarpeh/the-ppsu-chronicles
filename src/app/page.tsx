import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Calendar, Mic, Camera, ArrowRight, Star } from 'lucide-react';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import BlogPostCard from '../components/BlogPostCard';
// import EventCard from '../components/EventCard';
import { format, isToday, isThisWeek, parseISO } from 'date-fns';
import Footer from '../components/Footer';
import Header from '../components/Header';

export const revalidate = 60;

// Fetch the latest 3 published stories from Firebase
async function getFeaturedStories() {
  const postsCollection = collection(db, 'posts');
  const q = query(
    postsCollection,
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    limit(3) // Only get the latest 3 stories
  );

  try {
    const storySnapshot = await getDocs(q);
    const stories = storySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore timestamp to a serializable format
        createdAt: data.createdAt?.toDate().toISOString() || null,
        updatedAt: data.updatedAt?.toDate().toISOString() || null,
        // Format data for BlogPostCard component
        image: data.imageUrl || data.image,
        content: data.story || data.content,
        date: data.createdAt?.toDate().toLocaleDateString() || new Date().toLocaleDateString(),
        author: data.name || data.author || 'Anonymous',
        slug: data.slug || doc.id,
      };
    });
    return stories;
  } catch (error) {
    console.error("Error fetching featured stories:", error);
    return [];
  }
}

// Fetch the latest 2 student spotlights from Firebase
async function getFeaturedSpotlights() {
  const spotlightsCollection = collection(db, 'spotlights');
  const q = query(
    spotlightsCollection,
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    limit(2) // Only get the latest 2 spotlights
  );

  try {
    const snapshot = await getDocs(q);
    const spotlights = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.studentName || data.name || '',
        course: data.major || data.course || '',
        quote: data.quote || '',
        stars: data.stars || 4,
        image: data.imageUrl || data.image || '',
        link: `/student-spotlights/${data.slug || doc.id}`,
        // Convert Firestore timestamp to ISO string if needed
        createdAt: data.createdAt?.toDate().toISOString() || null,
      };
    });
    return spotlights;
  } catch (error) {
    console.error("Error fetching featured spotlights:", error);
    return [];
  }
}

// Fetch the latest 3 upcoming events from Firebase
async function getFeaturedUpcomingEvents() {
  const upcomingEventsCollection = collection(db, 'upcomingEvents');
  const q = query(
    upcomingEventsCollection,
    where('status', '==', 'published'),
    orderBy('date', 'asc'), // Show upcoming events in chronological order
    limit(3) // Only get the next 3 upcoming events
  );

  try {
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        imageUrl: data.imageUrl || '',
        time: data.time || '',
        venue: data.venue || '',
        location: data.location || '',
        registerLink: data.registerLink || '',
        // Convert Firestore timestamp to ISO string if needed
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
        createdAt: data.createdAt?.toDate().toISOString() || null,
        type: 'upcoming'
      };
    });
    return events;
  } catch (error) {
    console.error("Error fetching featured upcoming events:", error);
    return [];
  }
}

export default async function HomePage() {
  // Fetch data server-side
  const [featuredStories, featuredEvents, featuredSpotlights] = await Promise.all([
    getFeaturedStories(),
    getFeaturedUpcomingEvents(),
    getFeaturedSpotlights()
  ]);

  return (
    <>
      <Header />
      <main className="overflow-x-hidden">
        {/* Hero Section */}
        <section
          className="relative min-h-[70vh] md:min-h-[90vh] bg-cover bg-center flex items-center justify-center text-white"
          style={{ backgroundImage: `url('/campus.jpg')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/30"></div>

          {/* University Logo - Top Left */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-8 md:left-8 z-20">
            <Image
              src="/ppsu.png"
              alt="P. P. Savani University Logo"
              width={400}
              height={160}
              className="w-28 sm:w-40 md:w-64 h-auto"
              priority
            />
          </div>

          <div className="relative z-10 text-center p-4 max-w-4xl mx-auto pt-24">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-yellow-300 via-red-500 to-pink-500 text-transparent bg-clip-text drop-shadow-[0_2px_20px_rgba(255,255,255,0.25)] animate-pulse">
              The PPSU Chronicles
            </h1>

            <p className="text-lg md:text-2xl font-light max-w-3xl mx-auto text-gray-200 backdrop-blur-md bg-black/30 px-4 py-3 rounded-lg shadow-md">
              The voice of students—sharing stories, ideas, events, and culture from <span className="text-white font-semibold">P. P. Savani University</span>.
            </p>

            <div>
              <Link
                href="/student-voice"
                className="mt-10 inline-block bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-3 md:py-4 px-6 md:px-10 rounded-full text-base md:text-lg transition-all duration-300 transform hover:scale-110 shadow-xl animate-flash"
              >
                Share Your Story
              </Link>
            </div>
          </div>
        </section>

        {/* Introduction & Quick Links Section */}
        <section className="py-14 md:py-24 bg-white">
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary mb-6">
              Explore the Chronicles
            </h2>
            <p className="max-w-3xl mx-auto text-text-secondary text-lg mb-12">
              Dive into the vibrant life of our campus. From personal tales to breaking news, find it all here.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {[
                { icon: <BookOpen size={32} />, title: "Stories & Blogs", href: "/stories" },
                { icon: <Calendar size={32} />, title: "Campus Events", href: "/events" },
                { icon: <Camera size={32} />, title: "Media Gallery", href: "/media" },
                { icon: <Mic size={32} />, title: "Student Voice", href: "/student-voice" },
              ].map((item) => (
                <div key={item.title}>
                  <QuickLinkCard icon={item.icon} title={item.title} href={item.href} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Stories Section */}
        <section className="py-14 md:py-24 section-bg">
          <div className="container mx-auto px-4 sm:px-6">
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary text-center mb-12">
              Featured Stories
            </h2>
            {featuredStories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {featuredStories.map((post) => (
                  <div key={post.id}>
                    <BlogPostCard post={post} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">No featured stories available at this time.</p>
            )}
            <div className="text-center mt-16">
              <Link href="/stories" className="group text-primary hover:text-blue-600 font-bold text-lg inline-flex items-center">
                Read More Stories <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>

        {/* Student Spotlight Section */}
        <section className="py-14 md:py-24 bg-white">
          <div className="container mx-auto px-4 sm:px-6">
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary text-center mb-12">
              Student Spotlight
            </h2>

            {featuredSpotlights.length > 0 ? (
              <div className="grid gap-10 max-w-4xl mx-auto">
                {featuredSpotlights.map((student) => (
                  <div
                    key={student.id}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-card-bg rounded-2xl shadow-lg p-6 sm:p-8 items-center"
                  >
                    <div className="flex justify-center">
                      <Image
                        src={student.image || '/ppsu.png'}
                        alt={student.name}
                        width={160}
                        height={160}
                        className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full object-cover border-4 border-secondary"
                      />
                    </div>
                    <div className="md:col-span-2 text-center md:text-left">
                      <div className="flex justify-center md:justify-start items-center gap-2 mb-2">
                        {Array(student.stars).fill(null).map((_, i) => (
                          <Star key={i} className="text-secondary" fill="currentColor" />
                        ))}
                      </div>
                      <h3 className="text-2xl font-bold text-primary mb-2">
                        {student.name}, {student.course}
                      </h3>
                      <p className="text-text-secondary mb-4 italic">{student.quote}</p>
                      <Link href={student.link} className="font-bold text-secondary hover:underline">
                        Read Their Story &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">No student spotlights available at this time.</p>
            )}
          </div>
        </section>

        {/* What's Happening on Campus Section */}
        <section className="py-14 md:py-24 section-bg">
          <div className="container mx-auto px-4 sm:px-6">
            <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary text-center mb-12">
              What&apos;s Happening on Campus
            </h2>

            {featuredEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {featuredEvents.map((event) => {
                  const eventDate = parseISO(event.date);
                  let badge = "Upcoming";
                  if (isToday(eventDate)) badge = "Today";
                  else if (isThisWeek(eventDate)) badge = "This Week";

                  return (
                    <div
                      key={event.id}
                      className="bg-white shadow-lg rounded-2xl overflow-hidden hover:shadow-2xl transition duration-300 relative"
                    >
                      {/* Image */}
                      <div className="relative h-48 w-full">
                        <Image
                          src={event.imageUrl || '/placeholder.jpg'}
                          alt={event.title}
                          fill
                          style={{ objectFit: 'cover' }}
                          className="rounded-t-2xl"
                        />
                        <div className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                          {badge}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6 space-y-4">
                        <h3 className="text-xl font-semibold text-gray-800">{event.title}</h3>
                        <p className="text-sm text-gray-600">{event.description?.slice(0, 100)}...</p>

                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-primary" />
                            <span>{format(eventDate, 'MMMM dd, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            <span>{event.location || event.venue}</span>
                          </div>
                        </div>

                        {/* RSVP Button */}
                        <div className="pt-4">
                          <a
                            href={event.registerLink || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-primary text-white text-sm font-bold px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition"
                          >
                            Register / RSVP
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-text-secondary text-center">
                No upcoming events. Check back soon!
              </p>
            )}

            <div className="text-center mt-16">
              <Link href="/events" className="group text-primary hover:text-blue-600 font-bold text-lg inline-flex items-center">
                View All Events <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}

const QuickLinkCard = ({ icon, title, href }: { icon: React.ReactNode; title: string; href: string }) => (
  <Link href={href} className="group block p-6 bg-card-bg rounded-2xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:scale-110">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-text-primary">{title}</h3>
  </Link>
);
