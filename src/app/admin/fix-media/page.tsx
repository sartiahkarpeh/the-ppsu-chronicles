// pages/admin/fix-media.js (or /app/admin/fix-media/page.tsx if you're using the App Router)
'use client';

import { useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase/config'; // Adjust the import if different

export default function FixMediaPage() {
  useEffect(() => {
    const fixMediaDocs = async () => {
      const snapshot = await getDocs(collection(db, 'media_videos'));
      for (const docSnap of snapshot.docs) {
        await updateDoc(doc(db, 'media_videos', docSnap.id), {
          type: 'video',
        });
        console.log(`Updated ${docSnap.id} with type: video`);
      }
      alert('✅ All media documents updated!');
    };

    fixMediaDocs();
  }, []);

  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold">Running Media Fix Script...</h1>
    </div>
  );
}


