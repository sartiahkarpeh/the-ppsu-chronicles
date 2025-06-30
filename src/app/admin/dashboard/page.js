'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // User is signed in.
        setUser(currentUser);
        // Get user role from Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        } else {
          // Handle case where user document doesn't exist
           setRole('sub-admin'); // Default or error case
        }
      } else {
        // User is signed out.
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (loading) {
    return <p className="text-center p-10">Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome, {user?.email} ({role})</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Sub-admin and Super-admin can manage stories */}
          {(role === 'sub-admin' || role === 'super-admin') && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Manage Stories</h2>
              <p className="text-gray-600 mb-4">Create, edit, and delete articles.</p>
              <Link href="/admin/manage-stories" className="text-indigo-600 hover:underline">
                Go to Stories Manager
              </Link>
            </div>
          )}

          {/* Only Super-admins can manage other content types */}
          {role === 'super-admin' && (
            <>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Manage Events</h2>
                <p className="text-gray-600 mb-4">Add or update event information.</p>
                <Link href="#" className="text-indigo-600 hover:underline">Manage Events (Coming Soon)</Link>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Manage Clubs</h2>
                <p className="text-gray-600 mb-4">Update details for student clubs.</p>
                <Link href="#" className="text-indigo-600 hover:underline">Manage Clubs (Coming Soon)</Link>
              </div>
               <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Manage Users</h2>
                <p className="text-gray-600 mb-4">Add or remove sub-admins.</p>
                <Link href="#" className="text-indigo-600 hover:underline">Manage Users (Coming Soon)</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

