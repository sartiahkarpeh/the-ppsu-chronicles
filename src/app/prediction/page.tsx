'use client';

import { useState, useEffect } from 'react';
import UserIdentification from './components/UserIdentification';
import PredictionForm from './components/PredictionForm';
import AlreadySubmitted from './components/AlreadySubmitted';
import LiveScore from './components/LiveScore';
import { db } from '@/firebase/config';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { isDeviceRegistered, markDeviceRegistered } from './utils/deviceFingerprint';

export default function PredictionPage() {
  const [step, setStep] = useState<'loading' | 'identify' | 'predict' | 'submitted' | 'closed' | 'no-match'>('loading');
  const [userData, setUserData] = useState<{ name: string; enrollmentNumber: string; deviceId: string } | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [currentMatch, setCurrentMatch] = useState<any>(null);

  useEffect(() => {
    fetchActiveMatch();
  }, []);

  const fetchActiveMatch = async () => {
    try {
      // Fetch the next upcoming match or live match
      const matchesRef = collection(db, 'prediction_matches');
      const now = new Date().toISOString();
      
      // Try to find an upcoming or live match
      const q = query(
        matchesRef,
        where('status', 'in', ['upcoming', 'live']),
        orderBy('matchDateTime', 'asc'),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setStep('no-match');
        return;
      }

      const matchData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      setCurrentMatch(matchData);
      
      checkSubmissionStatus(matchData);
    } catch (error) {
      console.error('Error fetching active match:', error);
      setStep('no-match');
    }
  };

  const checkSubmissionStatus = async (match: any) => {
    // Check if device is already registered for this match
    if (isDeviceRegistered(match.id)) {
      const savedPrediction = localStorage.getItem(`prediction_data_${match.id}`);
      if (savedPrediction) {
        setPrediction(JSON.parse(savedPrediction));
      }
      setStep('submitted');
      return;
    }

    // Check if match has started
    const matchDateTime = new Date(match.matchDateTime);
    const now = new Date();
    
    if (now >= matchDateTime) {
      setStep('closed');
      return;
    }

    setStep('identify');
  };

  const handleUserIdentified = async (name: string, enrollmentNumber: string, deviceId: string) => {
    if (!currentMatch) return;

    // Check if user has already submitted via enrollment number OR device ID
    try {
      const response = await fetch('/api/prediction/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enrollmentNumber, matchId: currentMatch.id, deviceId }),
      });

      const data = await response.json();

      if (data.exists) {
        // Mark device as registered and save prediction data
        markDeviceRegistered(currentMatch.id);
        setPrediction(data.prediction);
        localStorage.setItem(`prediction_data_${currentMatch.id}`, JSON.stringify(data.prediction));
        setStep('submitted');
      } else {
        setUserData({ name, enrollmentNumber, deviceId });
        setStep('predict');
      }
    } catch (error) {
      console.error('Error checking submission:', error);
      alert('Error checking your submission status. Please try again.');
    }
  };

  const handlePredictionSubmitted = (submittedPrediction: any) => {
    markDeviceRegistered(currentMatch.id);
    setPrediction(submittedPrediction);
    localStorage.setItem(`prediction_data_${currentMatch.id}`, JSON.stringify(submittedPrediction));
    setStep('submitted');
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (step === 'no-match') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          <div className="text-5xl sm:text-6xl mb-4">⚽</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            No Active Matches
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            There are no matches available for predictions at the moment. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  if (step === 'closed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 sm:py-12 px-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <LiveScore match={currentMatch} />
        </div>
      </div>
    );
  }

  if (step === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 sm:py-12 px-0 overflow-y-auto">
        <AlreadySubmitted prediction={prediction} match={currentMatch} />
      </div>
    );
  }

  if (step === 'identify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 sm:py-12 px-0 overflow-y-auto">
        <UserIdentification onSubmit={handleUserIdentified} match={currentMatch} />
      </div>
    );
  }

  if (step === 'predict' && userData && currentMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 sm:py-12 px-0 overflow-y-auto">
        <PredictionForm 
          userData={userData} 
          match={currentMatch}
          onSubmit={handlePredictionSubmitted}
        />
      </div>
    );
  }

  return null;
}
