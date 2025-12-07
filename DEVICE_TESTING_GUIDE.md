# Device Registration Testing Guide

## Quick Start Testing

Your prediction system now includes device-based registration! Follow these steps to test it:

## Prerequisites
1. Make sure your dev server is running:
   ```bash
   npm run dev
   ```
2. Have at least one match created in `/admin/predictions`
3. Match status should be "upcoming" (not started yet)

---

## Test 1: First-Time Registration ✅

**Goal:** Verify a new user can register and make a prediction

1. Open **Chrome** (normal mode)
2. Navigate to `http://localhost:3001/prediction`
3. You should see the registration form with:
   - Full Name field
   - Enrollment Number field
   - Match information with team logos
   - Warning: "🔒 Each device can only register once per match"

4. Fill in the form:
   - Name: `John Doe`
   - Enrollment: `PPSU12345`

5. Click "Continue to Prediction"

6. Make a prediction:
   - Home Score: `2`
   - Away Score: `1`
   - Winner: Select home team

7. Click "Submit Prediction 🎯"

8. ✅ **Expected Result:** 
   - Success message appears
   - Your prediction is shown
   - Match details displayed

---

## Test 2: Same Enrollment Number (Different Device) ❌

**Goal:** Verify enrollment number uniqueness

1. Open **Firefox** (or another browser)
2. Navigate to `http://localhost:3001/prediction`
3. Try to register with:
   - Name: `Jane Doe`
   - Enrollment: `PPSU12345` (same as Test 1)

4. Click "Continue to Prediction"

5. ❌ **Expected Result:**
   - System detects enrollment number already used
   - Shows "Already Submitted" screen
   - Displays the original prediction from Test 1

---

## Test 3: Same Device (Different Enrollment) ❌

**Goal:** Verify device can't be reused for same match

1. Go back to **Chrome** (where you did Test 1)
2. Open Developer Tools (F12)
3. Go to Console tab
4. Clear the prediction data:
   ```javascript
   localStorage.removeItem('prediction_data_match_id_here');
   localStorage.removeItem('prediction_submitted_match_id_here');
   ```
   ⚠️ Note: Don't clear `ppsu_device_id`

5. Refresh the page
6. Try to register with:
   - Name: `Jane Smith`
   - Enrollment: `PPSU67890` (different)

7. ❌ **Expected Result:**
   - Page shows: "🚫 Device Already Registered"
   - Message: "This device has already been used to register for this match"
   - Can't proceed to prediction form

---

## Test 4: Completely New Device ✅

**Goal:** Verify new device can register

1. Open **Edge browser** (or any browser not used yet)
2. Navigate to `http://localhost:3001/prediction`
3. Register with:
   - Name: `Bob Smith`
   - Enrollment: `PPSU99999`

4. Make a prediction

5. ✅ **Expected Result:**
   - Registration works
   - Can make prediction
   - Submission successful

---

## Test 5: Incognito Mode (New Device ID) ✅

**Goal:** Verify incognito creates new device session

1. Open **Chrome Incognito** window (Ctrl+Shift+N)
2. Navigate to `http://localhost:3001/prediction`
3. Register with:
   - Name: `Alice Johnson`
   - Enrollment: `PPSU11111`

4. Make a prediction

5. ✅ **Expected Result:**
   - Works like a new device
   - New device ID generated
   - Prediction successful

⚠️ **Note:** Incognito mode creates a new device ID each time because localStorage is cleared when the window closes.

---

## Test 6: Returning User (Same Device) ✅

**Goal:** Verify returning users see their prediction

1. Close and reopen your original **Chrome** browser
2. Navigate to `http://localhost:3001/prediction`

3. ✅ **Expected Result:**
   - Automatically detects you've already submitted
   - Shows "Already Submitted" screen
   - Displays your original prediction

---

## Test 7: Multiple Matches (Same Device) ✅

**Goal:** Verify device registration is match-specific

1. In admin, create a **second match** (different teams or date)
2. Make sure first match is still "upcoming"
3. Open Chrome browser (used in Test 1)
4. Navigate to `http://localhost:3001/prediction`

5. ✅ **Expected Result:**
   - System shows the NEW match (most recent upcoming)
   - Can register again with different enrollment
   - Device registration is per-match

---

## Verification Checklist

After testing, verify in Firebase Console:

### Check Firestore `predictions` Collection

Each document should have:
```json
{
  "name": "John Doe",
  "enrollmentNumber": "PPSU12345",
  "deviceId": "abc123-1730000000-xyz789",  // ✅ Device ID present
  "matchId": "match_id_here",
  "prediction": {
    "homeScore": 2,
    "awayScore": 1,
    "winner": "home"
  },
  "timestamp": "...",
  "createdAt": "2024-10-26T..."
}
```

### Check Browser DevTools

**In Chrome Developer Tools:**
1. Press F12
2. Go to "Application" tab
3. Expand "Local Storage"
4. Click `http://localhost:3001`

**You should see:**
- `ppsu_device_id` → (e.g., "abc123-1730000000-xyz789")
- `device_registered_[matchId]` → "true"
- `prediction_data_[matchId]` → JSON object with prediction

---

## Debugging Commands

### Check Device ID
Open console on `/prediction` page:
```javascript
localStorage.getItem('ppsu_device_id');
// Should return: "abc123-1730000000-xyz789" (or similar)
```

### Check if Registered
```javascript
localStorage.getItem('device_registered_match_id_here');
// Should return: "true" if registered
```

### View Prediction Data
```javascript
JSON.parse(localStorage.getItem('prediction_data_match_id_here'));
// Should return: prediction object
```

### Clear Everything (Reset)
```javascript
// Clear all prediction data
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('device_registered_') || 
      key.startsWith('prediction_') ||
      key === 'ppsu_device_id') {
    localStorage.removeItem(key);
  }
});
```

---

## Common Issues & Solutions

### Issue: "Device Already Registered" but I haven't registered
**Cause:** Someone else used this computer/browser before
**Solution:** Each physical device can only register once per match

### Issue: Can't test device blocking
**Cause:** Using different browsers (each is a different device)
**Solution:** Use same browser, clear prediction data but keep device ID

### Issue: System not detecting previous submission
**Cause:** localStorage might be disabled
**Solution:** 
1. Check browser settings
2. Ensure cookies/storage is enabled
3. Check if in private browsing mode

### Issue: Getting errors in console
**Cause:** Device fingerprinting requires browser APIs
**Solution:** Most modern browsers support this. Check compatibility.

---

## Admin Monitoring

To view all device registrations:

1. Go to `/admin/predictions`
2. Click "Predictions" tab
3. Look at "Device ID" column
4. **Check for patterns:**
   - Same device ID with different enrollments = Potential fraud
   - Unique device IDs = Legitimate users

---

## Production Considerations

### Before Going Live:

1. ✅ Test on mobile devices (phones/tablets)
2. ✅ Test on different networks (WiFi, mobile data)
3. ✅ Verify device IDs are being stored in Firestore
4. ✅ Check localStorage works on target browsers
5. ✅ Test with actual student enrollment numbers

### Monitor for:
- Multiple enrollments from same device ID
- Unusual patterns (many submissions in short time)
- Failed submission attempts

---

## Success Criteria

✅ **System is working correctly if:**
1. New users can register and predict
2. Same enrollment can't register twice
3. Same device can't register twice for same match
4. Same device CAN register for different matches
5. Device IDs are stored in Firestore
6. Returning users see their original prediction
7. Blocked users see appropriate error messages

---

## Next Steps

After successful testing:

1. Create actual matches for upcoming games
2. Share prediction link: `https://yoursite.com/prediction`
3. Monitor submissions in admin dashboard
4. Export data before match starts
5. Update match status to "live" when game begins
6. Enter final scores after match ends
7. Announce winners!

---

**Ready to test?** Start with Test 1 and work through the scenarios! 🚀
