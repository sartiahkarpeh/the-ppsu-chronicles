# Match Prediction System - Documentation

## Overview
A complete prediction system for Real Madrid vs Barcelona match with user entry, validation, prediction submission, and live score tracking.

## URL
Access the prediction page at: `https://<yourdomain>/prediction`

## Features Implemented

### ✅ 1. User Entry & Identification
- **Fields Required:**
  - Full Name
  - Enrollment Number
- **Validations:**
  - Both fields cannot be empty
  - Enrollment number must be at least 5 characters
  - Automatic conversion to uppercase for consistency

### ✅ 2. Unique User & Device Restriction
- **Enrollment Number Uniqueness:** Each enrollment number can only submit ONE prediction
- **Device Restriction:** Uses localStorage to prevent multiple submissions from the same device
- **Server-Side Validation:** Double-checks in Firebase Firestore to prevent duplicate submissions
- **Already Submitted Screen:** Shows submission confirmation if user tries to access again

### ✅ 3. Prediction Form
- **Match:** Real Madrid vs Barcelona
- **Prediction Options:**
  - Final Score (0-20 goals for each team)
  - Winner Selection (Real Madrid / Barcelona / Draw)
- **UI Features:**
  - Clean, centered layout
  - Team emblems and colors
  - Large, easy-to-use score inputs
  - Clear winner selection buttons
- **Restrictions:**
  - Cannot edit after submission
  - Cannot submit empty predictions
  - Permanent storage in Firebase

### ✅ 4. Prediction Lockout
- **Match Start Time:** Configurable in `page.tsx` (currently set to May 17, 2025, 8:00 PM)
- **Behavior:**
  - Before match: Users can submit predictions
  - After match starts: Form is disabled
  - Message displayed: "Predictions are now closed"

### ✅ 5. Live Match Results
- **Integration:** TheSportsDB API (free tier)
- **Features:**
  - Auto-refresh every 60 seconds
  - Manual refresh button
  - Live score display with team logos
  - Match status (In Progress, Full Time, etc.)
  - Match time/progress indicator
- **Fallback:** Graceful error handling when API is unavailable

### ✅ 6. Modern UI/UX
- **Design System:**
  - Gradient backgrounds (blue to indigo)
  - Rounded corners and shadows
  - Responsive layout
  - Smooth transitions and animations
  - Live indicator with pulsing animation
  - Emoji icons for visual appeal
- **Color Scheme:**
  - Primary: Indigo (buttons, accents)
  - Real Madrid: White/Gold theme
  - Barcelona: Blue/Red theme

## File Structure

```
src/app/prediction/
├── page.tsx                           # Main prediction page with state management
├── components/
│   ├── UserIdentification.tsx         # Name + enrollment number form
│   ├── PredictionForm.tsx             # Score prediction interface
│   ├── AlreadySubmitted.tsx           # Confirmation screen for submitted users
│   └── LiveScore.tsx                  # Live match score display

src/app/api/prediction/
├── check/
│   └── route.ts                       # API: Check if user already submitted
├── submit/
│   └── route.ts                       # API: Submit new prediction
└── live-score/
    └── route.ts                       # API: Fetch live match data
```

## Database Schema (Firebase Firestore)

**Collection:** `predictions`

```javascript
{
  id: "auto-generated-id",
  name: "John Doe",
  enrollmentNumber: "PPSU12345",
  prediction: {
    realMadridScore: 3,
    barcelonaScore: 2,
    winner: "real-madrid" // or "barcelona" or "draw"
  },
  timestamp: Firestore.serverTimestamp(),
  createdAt: "2025-10-26T10:30:00.000Z"
}
```

## Setup Instructions

### 1. Firebase Configuration
Ensure Firebase is properly configured in `src/firebase/config.js`:
- Firestore database is enabled
- Collection "predictions" will be auto-created on first submission

### 2. Match Time Configuration
Edit `src/app/prediction/page.tsx`:
```typescript
const MATCH_START_TIME = new Date('2025-05-17T20:00:00');
```
Change to your actual match date and time.

### 3. API Configuration (Optional)
The system uses TheSportsDB API by default (no API key required).

For better reliability, you can integrate API-Football:
1. Get API key from [RapidAPI - API-Football](https://rapidapi.com/api-sports/api/api-football)
2. Add to `.env.local`:
   ```
   FOOTBALL_API_KEY=your_api_key_here
   ```
3. Uncomment the alternative implementation in `src/app/api/prediction/live-score/route.ts`

### 4. Testing
To test with mock live data, uncomment the mock response in `live-score/route.ts`:
```typescript
return NextResponse.json({
  match: {
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    homeScore: 2,
    awayScore: 1,
    status: 'In Progress',
    time: '67\'',
  },
});
```

## Security Features

### Client-Side Protection
- localStorage flag: `prediction_submitted`
- Immediate UI feedback
- Form validation before submission

### Server-Side Protection
- Enrollment number uniqueness check in Firestore
- Query before insert
- 409 Conflict status for duplicate attempts
- Input sanitization (trim, uppercase conversion)

### Data Integrity
- Firebase Firestore transactions
- Server timestamps for accurate record-keeping
- Type validation for scores and winner

## User Flow

1. **Landing** → User visits `/prediction`
2. **Check Status** → System checks localStorage and database
3. **Identification** → If new user, show name + enrollment form
4. **Validation** → Check if enrollment number already used
5. **Prediction** → Show prediction form if eligible
6. **Submit** → Save to database and localStorage
7. **Confirmation** → Show "Already Submitted" screen
8. **Live Score** → After match starts, display live scores

## Error Handling

- Network errors: User-friendly messages
- API failures: Graceful degradation
- Duplicate submissions: Clear error message
- Form validation: Inline error display
- Database errors: Logged to console, generic message to user

## Customization Options

### Change Match
Edit in `PredictionForm.tsx` and `LiveScore.tsx`:
- Team names
- Team emojis/logos
- Color schemes

### Add More Fields
In `PredictionForm.tsx`, add additional inputs like:
- First goal scorer
- Total goals over/under
- Half-time score

### Winner Announcement
Create a new component to fetch all predictions and compare with final score:
```typescript
// src/app/prediction/winners/page.tsx
// Fetch all predictions where prediction matches final score
```

### Admin Dashboard
Create `/prediction/admin` to:
- View all submissions
- Export predictions to CSV
- View statistics
- Manually enter final score
- Calculate and display winners

## API Endpoints

### POST `/api/prediction/check`
Check if enrollment number has submitted.

**Request:**
```json
{
  "enrollmentNumber": "PPSU12345"
}
```

**Response:**
```json
{
  "exists": true,
  "prediction": { /* prediction data */ }
}
```

### POST `/api/prediction/submit`
Submit a new prediction.

**Request:**
```json
{
  "name": "John Doe",
  "enrollmentNumber": "PPSU12345",
  "prediction": {
    "realMadridScore": 3,
    "barcelonaScore": 2,
    "winner": "real-madrid"
  }
}
```

**Response:**
```json
{
  "success": true,
  "prediction": { /* saved prediction data */ }
}
```

### GET `/api/prediction/live-score`
Fetch live match score.

**Response:**
```json
{
  "match": {
    "homeTeam": "Real Madrid",
    "awayTeam": "Barcelona",
    "homeScore": 2,
    "awayScore": 1,
    "status": "In Progress",
    "time": "67'"
  }
}
```

## Performance Considerations

- **Caching:** Live score API uses `cache: 'no-store'` for fresh data
- **Rate Limiting:** Auto-refresh limited to 60-second intervals
- **Database Queries:** Indexed by enrollmentNumber for fast lookups
- **Client State:** localStorage reduces unnecessary API calls

## Future Enhancements

1. **Email Notifications:** Send confirmation emails after submission
2. **Social Sharing:** Share predictions on social media
3. **Leaderboard:** Show top predictors based on accuracy
4. **Multiple Matches:** Extend to support multiple matches
5. **Points System:** Award points for exact scores, correct winners, etc.
6. **User Profiles:** Track prediction history across multiple matches
7. **Real-time Updates:** WebSocket for live score push notifications
8. **Analytics Dashboard:** Prediction trends, popular choices, etc.

## Troubleshooting

### Predictions not saving
- Check Firebase console for Firestore rules
- Verify Firebase config in `src/firebase/config.js`
- Check browser console for errors

### Live score not showing
- Verify API endpoint is accessible
- Check if match is in the API's database
- Use mock data for testing (see Testing section)

### "Already submitted" showing incorrectly
- Clear localStorage: `localStorage.removeItem('prediction_submitted')`
- Check Firestore for duplicate entries
- Verify enrollment number format

### Form not submitting
- Check network tab for API errors
- Verify all required fields are filled
- Check match start time hasn't passed

## Support

For issues or questions:
1. Check browser console for errors
2. Verify Firebase connection
3. Test with mock data
4. Review API responses in Network tab

---

**Built with:** Next.js 15, React 19, TypeScript, Firebase Firestore, Tailwind CSS

**Last Updated:** October 26, 2025
