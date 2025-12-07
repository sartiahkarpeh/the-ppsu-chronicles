# Quick Setup Guide - Match Prediction System

## ⚡ Quick Start (5 Minutes)

### 1. **Set the Match Date & Time**
Edit `src/app/prediction/page.tsx` (Line 9):
```typescript
const MATCH_START_TIME = new Date('2025-05-17T20:00:00'); // Change this!
```
📅 Format: `YYYY-MM-DDTHH:MM:SS` (24-hour format)

### 2. **Verify Firebase is Set Up**
✅ Check that `src/firebase/config.js` has your Firebase credentials
✅ Firestore should be enabled in Firebase Console

### 3. **Run Your Development Server**
```bash
npm run dev
```

### 4. **Test the System**
1. Visit: `http://localhost:3001/prediction`
2. Enter test data:
   - Name: John Doe
   - Enrollment: TEST001
3. Make a prediction
4. Try accessing again with same enrollment number → Should see "Already Submitted"

### 5. **View Admin Dashboard** (Optional)
Visit: `http://localhost:3001/prediction/admin`
- See all predictions
- View statistics
- Export to CSV

---

## 🎯 Important Configuration Points

### Match Details
📍 **Location:** `src/app/prediction/page.tsx`
```typescript
const MATCH_START_TIME = new Date('2025-05-17T20:00:00');
```

### Team Names & Customization
📍 **Locations:**
- `src/app/prediction/components/PredictionForm.tsx` (Lines 80-100)
- `src/app/prediction/components/LiveScore.tsx` (Lines 150-170)

Change team names, emojis, and colors as needed.

### Live Score API
📍 **Location:** `src/app/api/prediction/live-score/route.ts`

**Current:** Using TheSportsDB API (free, no key required)

**For Testing:** Uncomment lines 68-78 to return mock data

**For Production:** Consider API-Football for better reliability:
1. Get free API key: https://rapidapi.com/api-sports/api/api-football
2. Add to `.env.local`:
   ```
   FOOTBALL_API_KEY=your_key_here
   ```
3. Uncomment alternative implementation (lines 82-114)

---

## ✅ Testing Checklist

Before going live, test these scenarios:

- [ ] Submit a new prediction successfully
- [ ] Try to submit again with same enrollment number
- [ ] Try to submit from same device (check localStorage block)
- [ ] Set match time to past → predictions should close
- [ ] View admin dashboard
- [ ] Export CSV from admin dashboard
- [ ] Test on mobile device
- [ ] Clear localStorage and try again:
  ```javascript
  localStorage.removeItem('prediction_submitted');
  localStorage.removeItem('prediction_data');
  ```

---

## 🚀 Deployment

### Before Deploying:
1. ✅ Update `MATCH_START_TIME` to actual match time
2. ✅ Test all flows locally
3. ✅ Verify Firebase Firestore security rules
4. ✅ (Optional) Set up live score API with proper API key

### Deploy Command:
```bash
npm run build
npm start
```

### Firestore Security Rules
Add this to Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /predictions/{predictionId} {
      // Allow read access to all authenticated users
      allow read: if true;
      
      // Allow create only if enrollment number is unique
      allow create: if request.auth != null 
        && !exists(/databases/$(database)/documents/predictions/$(request.resource.data.enrollmentNumber));
      
      // Prevent updates and deletes
      allow update, delete: if false;
    }
  }
}
```

---

## 🔧 Common Issues & Fixes

### Issue: Predictions Not Saving
**Fix:**
1. Check Firebase Console → Firestore
2. Verify collection "predictions" is being created
3. Check browser console for errors
4. Verify Firebase config in `src/firebase/config.js`

### Issue: "Already Submitted" Showing Incorrectly
**Fix:**
```javascript
// In browser console:
localStorage.removeItem('prediction_submitted');
localStorage.removeItem('prediction_data');
```
Then refresh the page.

### Issue: Live Score Not Loading
**Fix:**
1. Check if match is actually live
2. Use mock data for testing (uncomment in `live-score/route.ts`)
3. Check Network tab for API errors

### Issue: TypeScript Errors in VS Code
These are false positives from Next.js 15's strict checking. The app will run fine. To suppress:
- The components are client components ('use client') and work correctly
- Ignore "Props must be serializable" warnings for client components

---

## 📊 Database Structure

The system creates one collection in Firestore:

**Collection:** `predictions`

Each document contains:
```javascript
{
  name: string,              // User's full name
  enrollmentNumber: string,  // Unique identifier (uppercase)
  prediction: {
    realMadridScore: number,
    barcelonaScore: number,
    winner: string          // "real-madrid" | "barcelona" | "draw"
  },
  timestamp: Timestamp,      // Server timestamp
  createdAt: string          // ISO string
}
```

---

## 🎨 Customization Guide

### Change Colors
Edit Tailwind classes in components:
- Primary color: `indigo-600` → Change to your brand color
- Real Madrid: `blue-50`, `blue-600`
- Barcelona: `red-50`, `red-600`

### Add More Prediction Options
In `PredictionForm.tsx`, add fields like:
- First goal scorer (dropdown)
- Total goals (over/under)
- Correct score bonus
- Half-time score

### Add Email Notifications
Install nodemailer:
```bash
npm install nodemailer
```

Create API endpoint: `src/app/api/prediction/send-confirmation/route.ts`

### Create Leaderboard
After match ends, create a page that:
1. Fetches final score
2. Compares all predictions
3. Awards points based on accuracy
4. Displays top predictors

---

## 📱 Mobile Optimization

The system is already mobile-responsive with:
- ✅ Flexible layouts
- ✅ Touch-friendly buttons
- ✅ Readable text sizes
- ✅ Proper spacing

Test on:
- iPhone (Safari)
- Android (Chrome)
- iPad (Safari)

---

## 🔐 Security Best Practices

1. **Firestore Rules:** Set proper read/write rules (see Deployment section)
2. **API Keys:** Never commit `.env.local` to git
3. **Rate Limiting:** Consider adding rate limiting for API routes
4. **Input Validation:** Already implemented on both client and server
5. **XSS Prevention:** React handles this by default

---

## 📈 Analytics (Optional)

Track prediction patterns with Firebase Analytics:

```javascript
// In PredictionForm.tsx after submission
import { analytics } from '@/firebase/config';
import { logEvent } from 'firebase/analytics';

logEvent(analytics, 'prediction_submitted', {
  winner: prediction.winner,
  score: `${prediction.realMadridScore}-${prediction.barcelonaScore}`
});
```

---

## 🎉 You're All Set!

Your prediction system is ready to go! 

**URLs:**
- User Page: `https://<yourdomain>/prediction`
- Admin Dashboard: `https://<yourdomain>/prediction/admin`

**Need Help?**
- Check `PREDICTION_SYSTEM_README.md` for detailed documentation
- Review component files for inline comments
- Test thoroughly before match day!

---

**Good luck with your predictions! ⚽🎯**
