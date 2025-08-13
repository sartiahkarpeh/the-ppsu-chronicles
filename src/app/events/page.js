import { db } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import EventCard from '../../components/EventCard';

// Fetches upcoming events
async function getUpcomingEvents() {
    const upcomingEventsCollection = collection(db, 'upcomingEvents');
    const q = query(
        upcomingEventsCollection,
        where('status', '==', 'published'),
        orderBy('date', 'asc') // Show upcoming events in chronological order
    );

    try {
        const snapshot = await getDocs(q);
        const events = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert Firestore timestamp to ISO string if needed
                date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
                createdAt: data.createdAt?.toDate().toISOString() || null,
                type: 'upcoming'
            };
        });
        return events;
    } catch (error) {
        console.error("Error fetching upcoming events:", error);
        return [];
    }
}

// Fetches past events
async function getPastEvents() {
    const eventsCollection = collection(db, 'events');
    const q = query(
        eventsCollection,
        where('status', '==', 'published'),
        orderBy('date', 'desc') // Show most recent past events first
    );

    try {
        const snapshot = await getDocs(q);
        const events = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert Firestore timestamp to ISO string if needed
                date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
                createdAt: data.createdAt?.toDate().toISOString() || null,
                type: 'past'
            };
        });
        return events;
    } catch (error) {
        console.error("Error fetching past events:", error);
        return [];
    }
}

export default async function EventsPage() {
    const [upcomingEvents, pastEvents] = await Promise.all([
        getUpcomingEvents(),
        getPastEvents()
    ]);

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 py-12">
                <h1 className="text-4xl font-bold mb-12 text-center text-gray-800">Campus Events</h1>
                
                {/* Upcoming Events Section */}
                <section className="mb-16">
                    <h2 className="text-3xl font-bold mb-8 text-gray-700 border-b-2 border-blue-500 pb-2">
                        What's Happening on Campus
                    </h2>
                    {upcomingEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {upcomingEvents.map(event => (
                                <EventCard key={event.id} event={event} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                            <p className="text-gray-500 text-lg">No upcoming events scheduled at this time.</p>
                            <p className="text-gray-400 text-sm mt-2">Check back soon for exciting campus activities!</p>
                        </div>
                    )}
                </section>

                {/* Past Events Section */}
                <section>
                    <h2 className="text-3xl font-bold mb-8 text-gray-700 border-b-2 border-green-500 pb-2">
                        Past Events
                    </h2>
                    {pastEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {pastEvents.map(event => (
                                <EventCard key={event.id} event={event} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                            <p className="text-gray-500 text-lg">No past events to display.</p>
                            <p className="text-gray-400 text-sm mt-2">Past events will appear here once they're completed.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
