'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

/**
 * A card component to display summary information about a student club.
 * @param {object} props - The component props.
 * @param {object} props.club - The club data object.
 * @param {string} props.club.slug - The URL slug for the club's detail page.
 * @param {string} props.club.imageUrl - The URL for the club's logo or featured image.
 * @param {string} props.club.name - The name of the club.
 * @param {string} props.club.mission - The mission statement of the club.
 */
export default function ClubCard({ club }) {
  const [imgSrc, setImgSrc] = useState(
    club.imageUrl || 'https://placehold.co/600x400/e2e8f0/cccccc?text=Logo'
  );

  const truncateText = (text, length) => {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  return (
    <Link
      href={`/clubs/${club.slug}`}
      className="block bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out overflow-hidden group h-full flex flex-col"
    >
      <div className="relative h-48 w-full">
        <Image
          src={imgSrc}
          alt={`${club.name} logo`}
          fill
          className="transition-transform duration-500 group-hover:scale-110 object-cover"
          onError={() =>
            setImgSrc('https://placehold.co/600x400/e2e8f0/cccccc?text=Error')
          }
        />
      </div>
      <div className="p-6 flex-grow flex flex-col">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{club.name}</h3>
        <p className="text-gray-600 text-sm leading-relaxed flex-grow">
          {truncateText(club.mission, 100)}
        </p>
      </div>
    </Link>
  );
}
