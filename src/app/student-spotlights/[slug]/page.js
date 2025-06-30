'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

const StudentSpotlightPage = () => {
  const { slug } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'spotlights'));
        const students = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          slug: doc.data().link.split('/').pop(), // get slug from link
        }));

        const found = students.find(s => s.slug === slug);
        if (found) {
          setStudent(found);
        } else {
          setStudent(null);
        }
      } catch (error) {
        console.error("Error fetching spotlight:", error);
        setStudent(null);
      }

      setLoading(false);
    };

    fetchStudent();
  }, [slug]);

  if (loading) return <p className="text-center py-10">Loading spotlight...</p>;
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
};

export default StudentSpotlightPage;

