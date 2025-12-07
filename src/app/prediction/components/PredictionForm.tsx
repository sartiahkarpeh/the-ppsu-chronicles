'use client';

import { useState } from 'react';

interface PredictionFormProps {
  userData: { name: string; enrollmentNumber: string; deviceId: string };
  match: any;
  onSubmit: (prediction: any) => void;
}

export default function PredictionForm({ userData, match, onSubmit }: PredictionFormProps) {
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [winner, setWinner] = useState<'home' | 'away' | 'draw' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const matchDateTime = new Date(match.matchDateTime);
  const isPredictionClosed = new Date() >= matchDateTime;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPredictionClosed) {
      alert('Predictions are now closed!');
      return;
    }

    if (!homeScore || !awayScore || !winner) {
      alert('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/prediction/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userData.name,
          enrollmentNumber: userData.enrollmentNumber,
          deviceId: userData.deviceId,
          matchId: match.id,
          prediction: {
            homeScore: parseInt(homeScore),
            awayScore: parseInt(awayScore),
            winner,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSubmit(data.prediction);
      } else {
        alert(data.error || 'Failed to submit prediction');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting prediction:', error);
      alert('Error submitting prediction. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isPredictionClosed) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
          <div className="text-5xl sm:text-6xl mb-4">🔒</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Predictions are Now Closed
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            The match has started. Check back soon for live scores!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Make Your Prediction
          </h2>
          <p className="text-sm sm:text-base text-gray-600">Welcome, {userData.name}!</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Enrollment: {userData.enrollmentNumber}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Match Preview */}
          <div className="bg-gradient-to-r from-blue-50 to-red-50 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="text-center flex-1 min-w-0">
                {match.homeTeam.logoUrl ? (
                  <img src={match.homeTeam.logoUrl} alt={match.homeTeam.name} className="h-12 w-12 sm:h-16 sm:w-16 object-contain mx-auto mb-2 flex-shrink-0" />
                ) : (
                  <div className="text-3xl sm:text-4xl mb-2">🏆</div>
                )}
                <h3 className="font-bold text-sm sm:text-lg text-gray-900 break-words px-1">{match.homeTeam.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{match.homeTeam.shortName}</p>
              </div>
              
              <div className="px-2 sm:px-4 flex-shrink-0">
                <div className="text-2xl sm:text-3xl font-bold text-gray-400">VS</div>
                <p className="text-xs text-gray-500 mt-1 sm:mt-2 whitespace-nowrap">{match.venue}</p>
              </div>
              
              <div className="text-center flex-1 min-w-0">
                {match.awayTeam.logoUrl ? (
                  <img src={match.awayTeam.logoUrl} alt={match.awayTeam.name} className="h-12 w-12 sm:h-16 sm:w-16 object-contain mx-auto mb-2 flex-shrink-0" />
                ) : (
                  <div className="text-3xl sm:text-4xl mb-2">🏆</div>
                )}
                <h3 className="font-bold text-sm sm:text-lg text-gray-900 break-words px-1">{match.awayTeam.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{match.awayTeam.shortName}</p>
              </div>
            </div>
            <div className="text-center mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600">
              {matchDateTime.toLocaleDateString()} at {matchDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Score Prediction */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              Predict the Final Score
            </h3>
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <div className="flex-1">
                <label htmlFor="homeScore" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 text-center">
                  {match.homeTeam.shortName}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  id="homeScore"
                  min="0"
                  max="20"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg text-center text-xl sm:text-2xl font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 touch-manipulation"
                  placeholder="0"
                  required
                />
              </div>

              <div className="text-2xl sm:text-3xl font-bold text-gray-400 pt-6">:</div>

              <div className="flex-1">
                <label htmlFor="awayScore" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 text-center">
                  {match.awayTeam.shortName}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  id="awayScore"
                  min="0"
                  max="20"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg text-center text-xl sm:text-2xl font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 touch-manipulation"
                  placeholder="0"
                  required
                />
              </div>
            </div>
          </div>

          {/* Winner Selection */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              Who Will Win?
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setWinner('home')}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-all touch-manipulation ${
                  winner === 'home'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                    : 'border-gray-300 hover:border-gray-400 active:border-gray-500'
                }`}
              >
                {match.homeTeam.logoUrl && (
                  <img src={match.homeTeam.logoUrl} alt={match.homeTeam.name} className="h-6 w-6 sm:h-8 sm:w-8 object-contain mx-auto mb-1" />
                )}
                <div className="font-semibold text-xs sm:text-sm break-words">{match.homeTeam.shortName}</div>
              </button>

              <button
                type="button"
                onClick={() => setWinner('draw')}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-all touch-manipulation ${
                  winner === 'draw'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                    : 'border-gray-300 hover:border-gray-400 active:border-gray-500'
                }`}
              >
                <div className="text-xl sm:text-2xl mb-1">🤝</div>
                <div className="font-semibold text-xs sm:text-sm">Draw</div>
              </button>

              <button
                type="button"
                onClick={() => setWinner('away')}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-all touch-manipulation ${
                  winner === 'away'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                    : 'border-gray-300 hover:border-gray-400 active:border-gray-500'
                }`}
              >
                {match.awayTeam.logoUrl && (
                  <img src={match.awayTeam.logoUrl} alt={match.awayTeam.name} className="h-6 w-6 sm:h-8 sm:w-8 object-contain mx-auto mb-1" />
                )}
                <div className="font-semibold text-xs sm:text-sm break-words">{match.awayTeam.shortName}</div>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-3 sm:py-4 px-6 rounded-lg font-semibold text-base sm:text-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 touch-manipulation"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Prediction 🎯'}
          </button>

          <div className="text-center text-xs sm:text-sm text-red-600 font-medium">
            ⚠️ You cannot edit your prediction after submission!
          </div>
        </form>
      </div>
    </div>
  );
}
