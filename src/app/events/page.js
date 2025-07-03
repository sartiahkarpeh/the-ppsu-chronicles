import { db } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import EventCard from '../../components/EventCard';

// Fetches all published events
async function getEvents() {
    const eventsCollection = collection(db, 'events');
    // Query for published events, ordered by the event date
    const q = query(
        eventsCollection,
        where('status', '==', 'published'),
        orderBy('date', 'desc') // Show upcoming or most recent events first
    );

    try {
        const snapshot = await getDocs(q);
        const events = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Timestamps are not converted here as the date is likely a string.
                // If 'date' is a Firestore timestamp, it should be converted.
            };
        });
        return events;
    } catch (error) {
        console.error("Error fetching events:", error);
        return [];
    }
}

export default async function EventsPage() {
    const events = await getEvents();

    return (
        <div className="bg-gray-100">
            <div className="container mx-auto px-4 py-12">
                <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">Campus Events</h1>
                {events.length > 0 ? (
                    <div className="space-y-8">
                        {events.map(event => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500">There are no upcoming events scheduled at this time.</p>
                )}
            </div>
        </div>
    );
}
