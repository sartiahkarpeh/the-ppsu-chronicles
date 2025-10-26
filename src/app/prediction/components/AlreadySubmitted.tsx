'use client';

interface AlreadySubmittedProps {
  prediction: any;
  match: any;
}

export default function AlreadySubmitted({ prediction, match }: AlreadySubmittedProps) {
  const matchDateTime = new Date(match.matchDateTime);
  const isPredictionClosed = new Date() >= matchDateTime;

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-5xl sm:text-6xl mb-4">✅</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            You Have Already Submitted Your Prediction
          </h2>
          <p className="text-sm sm:text-base text-gray-600">Thank you for participating!</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 break-words px-2">
            {match.homeTeam.name} vs {match.awayTeam.name}
          </p>
        </div>

        {prediction && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 sm:p-6 mb-5 sm:mb-6">
            <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-4 text-center">Your Prediction</h3>
            
            <div className="flex items-center justify-center gap-4 sm:gap-6 mb-4">
              <div className="text-center flex-1">
                {match.homeTeam.logoUrl && (
                  <img src={match.homeTeam.logoUrl} alt={match.homeTeam.name} className="h-10 w-10 sm:h-12 sm:w-12 object-contain mx-auto mb-2 flex-shrink-0" />
                )}
                <div className="font-bold text-xl sm:text-2xl text-gray-900">{prediction.prediction?.homeScore || 0}</div>
                <div className="text-xs sm:text-sm text-gray-600 break-words">{match.homeTeam.shortName}</div>
              </div>
              
              <div className="text-xl sm:text-2xl font-bold text-gray-400 flex-shrink-0">:</div>
              
              <div className="text-center flex-1">
                {match.awayTeam.logoUrl && (
                  <img src={match.awayTeam.logoUrl} alt={match.awayTeam.name} className="h-10 w-10 sm:h-12 sm:w-12 object-contain mx-auto mb-2 flex-shrink-0" />
                )}
                <div className="font-bold text-xl sm:text-2xl text-gray-900">{prediction.prediction?.awayScore || 0}</div>
                <div className="text-xs sm:text-sm text-gray-600 break-words">{match.awayTeam.shortName}</div>
              </div>
            </div>

            <div className="text-center py-3 bg-white rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">Winner Prediction:</p>
              <p className="font-bold text-indigo-600 text-base sm:text-lg capitalize break-words px-2">
                {prediction.prediction?.winner === 'home' && match.homeTeam.name}
                {prediction.prediction?.winner === 'away' && match.awayTeam.name}
                {prediction.prediction?.winner === 'draw' && '🤝 Draw'}
              </p>
            </div>

            <div className="mt-4 text-center text-xs text-gray-500 break-words">
              Submitted: {prediction.timestamp ? new Date(prediction.timestamp).toLocaleString() : prediction.createdAt ? new Date(prediction.createdAt).toLocaleString() : 'N/A'}
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-5 sm:mb-6">
          <p className="text-xs sm:text-sm text-yellow-800 text-center">
            🔒 Predictions cannot be edited after submission
          </p>
        </div>

        {isPredictionClosed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-green-800 text-center font-medium">
              ⚽ Match has started! Check the live score below.
            </p>
          </div>
        )}

        {!isPredictionClosed && (
          <div className="text-center text-gray-600">
            <p className="text-xs sm:text-sm">
              Good luck! 🍀 Check back after the match starts to see live scores.
            </p>
            <p className="text-xs text-gray-500 mt-2 break-words px-2">
              Match starts: {matchDateTime.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
