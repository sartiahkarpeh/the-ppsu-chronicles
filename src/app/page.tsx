'use client';
import Link from 'next/link';
import Image from 'next/image'; // Import the Image component
import { BookOpen, Calendar, Mic, Camera, ArrowRight, Star } from 'lucide-react';
import { CalendarDays, Clock, MapPin} from 'lucide-react';
import { motion } from 'framer-motion';
import { posts } from '@/data/posts';
import { events } from '@/data/events';
import BlogPostCard from '@/components/BlogPostCard';
import EventCard from '@/components/EventCard';
import { upcomingEvents } from '@/data/upcomingEvents';
import { spotlights } from '@/data/spotlights';
import { format, isToday, isThisWeek, parseISO } from 'date-fns';
import Footer from '@/components/Footer'; // Import the Footer component
import Header from '@/components/Header'; // Import the Header component


export default function HomePage() {
  const featuredPosts = posts.slice(0, 3);
  const filteredEvents = events.filter(e => new Date(e.date) >= new Date()).slice(0, 3);

  const FADE_IN_VARIANTS = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <>
      <Header />
      <main className="overflow-x-hidden">
        {/* Hero Section */}
        
        <section 
          className="relative h-[85vh] md:h-[90vh] bg-cover bg-center flex items-center justify-center text-white"
          style={{ backgroundImage: `url('/campus.jpg')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/30"></div>

          {/* University Logo - Top Left */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="absolute top-6 left-6 md:top-8 md:left-8 z-20"
          >
            <Image
              src="/ppsu.png"
              alt="P. P. Savani University Logo"
              width={400}
              height={160}
              priority
            />
          </motion.div>

          <div className="relative z-10 text-center p-4 max-w-4xl mx-auto pt-24">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeInOut" }}
              className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-yellow-300 via-red-500 to-pink-500 text-transparent bg-clip-text drop-shadow-[0_2px_20px_rgba(255,255,255,0.25)] animate-pulse"
            >
              The PPSU Chronicles
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeInOut" }}
              className="text-lg md:text-2xl font-light max-w-3xl mx-auto text-gray-200 backdrop-blur-md bg-black/30 px-4 py-3 rounded-lg shadow-md"
            >
              The voice of students—sharing stories, ideas, events, and culture from <span className="text-white font-semibold">P. P. Savani University</span>.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeInOut" }}
            >
              <Link
                href="/student-voice"
                className="mt-10 inline-block bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 px-10 rounded-full text-lg transition-all duration-300 transform hover:scale-110 shadow-xl animate-flash"
              >
                Share Your Story
              </Link>
            </motion.div>
          </div>
        </section>


        {/* Introduction & Quick Links Section */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-6 text-center">
              <motion.h2 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={FADE_IN_VARIANTS}
                transition={{ duration: 0.6 }}
                className="text-3xl md:text-4xl font-extrabold text-text-primary mb-6"
              >
                Explore the Chronicles
              </motion.h2>
              <motion.p 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={FADE_IN_VARIANTS}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-3xl mx-auto text-text-secondary text-lg mb-12"
              >
                  Dive into the vibrant life of our campus. From personal tales to breaking news, find it all here.
              </motion.p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { icon: <BookOpen size={32} />, title: "Stories & Blogs", href: "/stories" },
                  { icon: <Calendar size={32} />, title: "Campus Events", href: "/events" },
                  { icon: <Camera size={32} />, title: "Media Gallery", href: "/media" },
                  { icon: <Mic size={32} />, title: "Student Voice", href: "/student-voice" },
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={FADE_IN_VARIANTS}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <QuickLinkCard icon={item.icon} title={item.title} href={item.href} />
                  </motion.div>
                ))}
              </div>
          </div>
        </section>
        
        {/* Featured Stories Section */}
        <section className="py-16 md:py-24 section-bg">
          <div className="container mx-auto px-6">
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={FADE_IN_VARIANTS}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-4xl font-extrabold text-text-primary text-center mb-12"
            >
              Featured Stories
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredPosts.map((post, index) => (
                <motion.div
                  key={post.slug}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={FADE_IN_VARIANTS}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                >
                  <BlogPostCard post={post} />
                </motion.div>
              ))}
            </div>
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={FADE_IN_VARIANTS} transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center mt-16"
            >
              <Link href="/stories" className="group text-primary hover:text-blue-600 font-bold text-lg inline-flex items-center">
                Read More Stories <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </section>

      {/* Student Spotlight Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.h2 
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={FADE_IN_VARIANTS} transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-extrabold text-text-primary text-center mb-12"
          >
            Student Spotlight
          </motion.h2>

          <div className="grid gap-10 max-w-4xl mx-auto">
            {spotlights.map((student, index) => (
              <motion.div
                key={student.id}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={FADE_IN_VARIANTS} transition={{ duration: 0.6, delay: index * 0.2 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-card-bg rounded-2xl shadow-lg p-8 items-center"
              >
                <div className="flex justify-center">
                  <img
                    src={student.image}
                    alt={student.name}
                    className="w-40 h-40 rounded-full object-cover border-4 border-secondary"
                  />
                </div>
                <div className="md:col-span-2 text-center md:text-left">
                  <div className="flex justify-center md:justify-start items-center gap-2 mb-2">
                    {Array(student.stars).fill().map((_, i) => (
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
              </motion.div>
            ))}
          </div>
        </div>
      </section>
            {/* Upcoming Events Section */}
<section className="py-16 md:py-24 section-bg">
  <div className="container mx-auto px-6">
    <motion.h2 
      initial="hidden" whileInView="visible" viewport={{ once: true }}
      variants={FADE_IN_VARIANTS} transition={{ duration: 0.6 }}
      className="text-3xl md:text-4xl font-extrabold text-text-primary text-center mb-12"
    >
      What's Happening on Campus
    </motion.h2>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {upcomingEvents.length > 0 ? (
        upcomingEvents.map((event, index) => {
          const eventDate = parseISO(event.date);
          let badge = "Upcoming";
          if (isToday(eventDate)) badge = "Today";
          else if (isThisWeek(eventDate)) badge = "This Week";

          return (
            <motion.div
              key={event.id}
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={FADE_IN_VARIANTS} transition={{ duration: 0.5, delay: index * 0.2 }}
              className="bg-white shadow-lg rounded-2xl overflow-hidden hover:shadow-2xl transition duration-300 relative"
            >
              {/* Image */}
              <div className="relative h-48 w-full">
                <Image 
                  src={event.imageUrl || '/placeholder.jpg'}
                  alt={event.title}
                  layout="fill"
                  objectFit="cover"
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
                    <span>{event.venue}</span>
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
            </motion.div>
          );
        })
      ) : (
        <p className="text-text-secondary text-center col-span-full">
          No upcoming events. Check back soon!
        </p>
      )}
    </div>

    <motion.div 
      initial="hidden" whileInView="visible" viewport={{ once: true }}
      variants={FADE_IN_VARIANTS} transition={{ duration: 0.5, delay: 0.4 }}
      className="text-center mt-16"
    >
      <Link href="/events" className="group text-primary hover:text-blue-600 font-bold text-lg inline-flex items-center">
        View All Events <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
      </Link>
    </motion.div>
  </div>
</section>
        <Footer />
      </main>
    </>
  );
}

const QuickLinkCard = ({ icon, title, href }) => (
    <Link href={href} className="group block p-6 bg-card-bg rounded-2xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:scale-110">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-text-primary">{title}</h3>
    </Link>
);
