import Link from 'next/link';

export default function ClubProfile({ club }) {
  return (
    <div className="bg-card-bg p-6 rounded-xl shadow-md text-center hover:shadow-xl transition-shadow transform hover:-translate-y-1 flex flex-col">
      <img src={club.logo} alt={`${club.name} Logo`} className="w-24 h-24 mx-auto mb-4 rounded-full object-cover border-2 border-gray-200" />
      <h3 className="font-bold text-xl text-text-primary">{club.name}</h3>
      <p className="text-text-secondary text-sm my-3 h-24 overflow-hidden flex-grow">{club.description}</p>
      
      {/* This now navigates to the dynamic club page */}
      <Link 
        href={`/clubs/${club.slug}`}
        className="mt-auto bg-primary text-white font-semibold px-5 py-2 rounded-full hover:bg-blue-600 transition-colors text-sm"
      >
        Learn More
      </Link>
    </div>
  );
}

