import { Calendar } from 'lucide-react';
import { events } from '@/data/events';
import { clubs } from '@/data/clubs';
import EventCard from '@/components/EventCard';
import ClubProfile from '@/components/ClubProfile';
import { upcomingEvents as staticUpcomingEvents } from '@/data/upcomingEvents';

export default function EventsPage() {
  const dynamicUpcomingEvents = events.filter(e => new Date(e.date) >= new Date());
  const allUpcomingEvents = [...staticUpcomingEvents, ...dynamicUpcomingEvents];

  return (
    <div className="container mx-auto px-6 py-12 md:py-20">
      <header className="text-center mb-16">
        <Calendar className="mx-auto text-primary h-16 w-16 mb-4" />
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary">Events & Campus Life</h1>
        <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
          Stay updated with the latest happenings, from tech fests to cultural nights, and discover student clubs.
        </p>
      </header>

      {/* Upcoming Events */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-text-primary mb-8">Upcoming Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {allUpcomingEvents.length > 0 ? (
            allUpcomingEvents.map(event => <EventCard key={event.id} event={event} />)
          ) : (
            <p className="text-text-secondary col-span-full">No new events scheduled. Stay tuned!</p>
          )}
        </div>
      </section>

      {/* Past Event Highlights */}
<section className="mb-16">
  <h2 className="text-3xl font-bold text-text-primary mb-8">Past Event Highlights</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {events
      .filter(e => new Date(e.date) < new Date())
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map(event => {
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        return (
          event.id === 1 ? (
            // Custom layout for VOICES OF BHARAT
            <div key={event.id} className="bg-white rounded-lg shadow-lg overflow-hidden md:col-span-2">
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-64 object-cover"
              />
              <div className="p-6">
                <h3 className="text-2xl font-bold text-primary mb-2">{event.title}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Date:</strong> {formattedDate}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Time:</strong> {event.time}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Location:</strong> {event.location}
                </p>
                {event.speaker && (
                  <p className="text-text-secondary mb-1">
                    <strong>Speaker:</strong> {event.speaker}
                  </p>
                )}
                {event.position && (
                  <p className="text-text-secondary mb-3">
                    <strong>Position:</strong> {event.position}
                  </p>
                )}
                <p className="text-sm italic text-gray-600">
                  This event focused on anti-terrorism awareness and national unity.
                </p>
              </div>
            </div>
          ) : (
            // Default layout for other past events
            <div
              key={event.id}
              className={`rounded-lg shadow-md overflow-hidden ${event.customStyle || 'bg-white'}`}
            >
              {event.image && (
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <h3 className="font-bold text-xl mb-2">{event.title}</h3>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Date:</strong> {formattedDate}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Time:</strong> {event.time}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Location:</strong> {event.location}
                </p>
                <p className="text-text-secondary text-sm mb-2">
                  {event.description || 'A quick look back at our successful event.'}
                </p>
                {event.highlightText && (
                  <p className="text-sm font-semibold italic text-primary">
                    {event.highlightText}
                  </p>
                )}
              </div>
            </div>
          )
        );
      })}
  </div>
</section>

      {/* Clubs and Organizations */}
      <section>
        <h2 className="text-3xl font-bold text-text-primary mb-8">Clubs & Organizations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {clubs.map(club => <ClubProfile key={club.id} club={club} />)}
        </div>
      </section>
    </div>
  );
}
