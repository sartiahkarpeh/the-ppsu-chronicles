'use client';

import { useState, useEffect } from 'react';
import { getDeviceId, isDeviceRegistered } from '../utils/deviceFingerprint';

interface UserIdentificationProps {
  onSubmit: (name: string, enrollmentNumber: string, deviceId: string) => void;
  match: any;
}

export default function UserIdentification({ onSubmit, match }: UserIdentificationProps) {
  const [name, setName] = useState('');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [errors, setErrors] = useState<{ name?: string; enrollmentNumber?: string }>({});
  const [deviceId, setDeviceId] = useState<string>('');
  const [isDeviceBlocked, setIsDeviceBlocked] = useState(false);

  useEffect(() => {
    // Generate/retrieve device ID when component mounts
    const id = getDeviceId();
    setDeviceId(id);

    // Check if this device is already registered for this match
    if (match?.id && isDeviceRegistered(match.id)) {
      setIsDeviceBlocked(true);
    }
  }, [match]);

  const validateForm = () => {
    const newErrors: { name?: string; enrollmentNumber?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!enrollmentNumber.trim()) {
      newErrors.enrollmentNumber = 'Enrollment number is required';
    } else if (enrollmentNumber.trim().length < 5) {
      newErrors.enrollmentNumber = 'Please enter a valid enrollment number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(name.trim(), enrollmentNumber.trim().toUpperCase(), deviceId);
    }
  };

  // If device is already registered for this match, show blocked message
  if (isDeviceBlocked) {
    return (
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center">
            <div className="text-5xl sm:text-6xl mb-4">🚫</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              Device Already Registered
            </h2>
            <p className="text-gray-600 mb-2 text-sm sm:text-base">
              This device has already been used to register for this match.
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              Each device can only be used once per match to ensure fair play.
            </p>
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Why this restriction?</strong>
              </p>
              <p className="text-xs text-amber-700 mt-1">
                To maintain the integrity of the prediction challenge, we allow only one registration per device per match.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            ⚽ Match Prediction Challenge
          </h1>
          <p className="text-gray-600 text-base sm:text-lg font-semibold break-words">
            {match?.homeTeam?.name} vs {match?.awayTeam?.name}
          </p>
          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-4">
            {match?.homeTeam?.logoUrl && (
              <img src={match.homeTeam.logoUrl} alt={match.homeTeam.name} className="h-10 w-10 sm:h-12 sm:w-12 object-contain flex-shrink-0" />
            )}
            <span className="text-xl sm:text-2xl font-bold text-gray-400">VS</span>
            {match?.awayTeam?.logoUrl && (
              <img src={match.awayTeam.logoUrl} alt={match.awayTeam.name} className="h-10 w-10 sm:h-12 sm:w-12 object-contain flex-shrink-0" />
            )}
          </div>
          <div className="mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg">
            <p className="text-xs sm:text-sm text-blue-800">
              Make your prediction and stand a chance to win exciting prizes!
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Match: {new Date(match?.matchDateTime).toLocaleDateString()} at {new Date(match?.matchDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 sm:px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-base ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your full name"
              autoComplete="name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="enrollmentNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Enrollment Number
            </label>
            <input
              type="text"
              id="enrollmentNumber"
              value={enrollmentNumber}
              onChange={(e) => setEnrollmentNumber(e.target.value)}
              className={`w-full px-3 sm:px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-base ${
                errors.enrollmentNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your enrollment number"
              autoComplete="off"
            />
            {errors.enrollmentNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.enrollmentNumber}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 sm:py-4 px-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 touch-manipulation"
          >
            Continue to Prediction
          </button>
        </form>

        <div className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-gray-500 space-y-1">
          <p>⚠️ You can only submit one prediction per enrollment number</p>
          <p className="text-xs">🔒 Each device can only register once per match</p>
        </div>
      </div>
    </div>
  );
}
