import { notFound } from 'next/navigation';
import { spotlights } from '@/data/spotlights';

export function generateStaticParams() {
  return spotlights.map(student => ({
    slug: student.link.split('/').pop(),
  }));
}

export default function StudentSpotlightPage({ params }) {
  const { slug } = params;
  const student = spotlights.find(s => s.link.endsWith(slug));

  if (!student) return notFound();

  return (
    <div className="max-w-3xl mx-auto py-16 px-4">
      <h1 className="text-4xl font-bold mb-4 text-primary">{student.name}</h1>
      <p className="text-lg text-text-secondary italic mb-4">{student.course}</p>
      <img
        src={student.image}
        alt={student.name}
        className="w-64 h-64 rounded-full object-cover border-4 border-secondary mb-6 mx-auto"
      />
      <p className="text-lg leading-relaxed text-text-secondary whitespace-pre-line text-center">
        {student.quote}
      </p>
    </div>
  );
}

