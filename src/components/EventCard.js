import { Calendar, MapPin, Clock } from 'lucide-react';

export default function EventCard({ event }) {
  const eventDate = new Date(event.date);
  const day = eventDate.toLocaleDateString('en-US', { day: '2-digit' });
  const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

  return (
    <div className="bg-card-bg rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 flex items-start space-x-4 p-5">
      <div className="flex-shrink-0 text-center bg-primary text-black rounded-lg p-3 w-20">
        <p className="text-3xl font-bold">{day}</p>
        <p className="text-sm font-semibold">{month}</p>
      </div>
      <div className="flex-grow">
        <span className="text-xs font-semibold text-secondary uppercase tracking-wider">{event.category}</span>
        <h3 className="font-bold text-lg text-text-primary mt-1 mb-2">{event.title}</h3>
        <div className="space-y-1 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <Clock size={14} />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} />
            <span>{event.location}</span> {/* ✅ FIXED */}
          </div>
        </div>
      </div>
    </div>
  );
}
