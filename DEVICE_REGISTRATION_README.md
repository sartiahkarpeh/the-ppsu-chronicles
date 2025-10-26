# Device Registration System for Match Predictions

## Overview

The prediction system now includes **device-based registration** to prevent multiple registrations from the same device. This ensures fairness and integrity in the prediction challenge.

## How It Works

### 1. Device Fingerprinting
When a user accesses the prediction page, the system automatically:
- Generates a unique device fingerprint based on:
  - User agent (browser type)
  - Language settings
  - Platform (OS)
  - Screen dimensions
  - Color depth
  - Timezone offset
  - Hardware capabilities
  - Touch support
- Creates a persistent device ID stored in localStorage
- Combines fingerprint with timestamp and random component for uniqueness

### 2. Registration Flow

```
User visits /prediction
    ↓
System generates/retrieves device ID
    ↓
User enters name & enrollment number
    ↓
System checks:
  - Has this enrollment number been used? → Block
  - Has this device ID been used? → Block
  - Both are new? → Allow prediction
    ↓
User submits prediction
    ↓
System stores:
  - Name
  - Enrollment number
  - Device ID
  - Prediction data
  - Match ID
    ↓
Device is marked as registered for this match
```

### 3. Validation Rules

**A user CANNOT submit a prediction if:**
1. ❌ Their enrollment number has already been used for this match
2. ❌ Their device has already been used to register for this match
3. ❌ The match has already started

**A user CAN submit a prediction if:**
1. ✅ Their enrollment number is unique for this match
2. ✅ Their device hasn't been used for this match
3. ✅ The match hasn't started yet

### 4. Multi-Match Support

The device registration is **match-specific**, meaning:
- A device can be used to register for Match A
- The same device can be used to register for Match B (different match)
- But the same device CANNOT register twice for Match A

## Technical Implementation

### Files Modified

1. **`/src/app/prediction/utils/deviceFingerprint.ts`**
   - New utility file for device ID generation
   - Functions:
     - `getDeviceId()` - Get or create persistent device ID
     - `generateDeviceFingerprint()` - Create fingerprint from device characteristics
     - `isDeviceRegistered(matchId)` - Check if device is registered for a match
     - `markDeviceRegistered(matchId)` - Mark device as registered
     - `clearDeviceRegistration(matchId?)` - Clear registration (for testing)

2. **`/src/app/prediction/components/UserIdentification.tsx`**
   - Added device ID generation on component mount
   - Added device blocking UI
   - Pass device ID to parent component

3. **`/src/app/prediction/page.tsx`**
   - Import device fingerprinting utilities
   - Check device registration status
   - Store device ID in userData state
   - Mark device as registered after successful submission

4. **`/src/app/api/prediction/check/route.ts`**
   - Accept `deviceId` in request
   - Check for existing predictions by enrollment number OR device ID
   - Return appropriate error messages

5. **`/src/app/api/prediction/submit/route.ts`**
   - Accept `deviceId` in request
   - Store device ID in Firestore
   - Validate device hasn't been used
   - Return specific error messages for device/enrollment conflicts

### Database Schema Update

**Firestore Collection: `predictions`**

```javascript
{
  name: "John Doe",
  enrollmentNumber: "PPSU12345",
  deviceId: "abc123-1730000000-xyz789", // NEW FIELD
  matchId: "match_id_here",
  prediction: {
    homeScore: 2,
    awayScore: 1,
    winner: "home"
  },
  timestamp: ServerTimestamp,
  createdAt: "2024-10-26T12:00:00.000Z"
}
```

### localStorage Keys

- `ppsu_device_id` - Persistent device identifier
- `device_registered_[matchId]` - Boolean flag for match-specific registration
- `prediction_data_[matchId]` - Cached prediction data

## User Experience

### New Registration Screen
```
┌─────────────────────────────────────┐
│   ⚽ Match Prediction Challenge     │
│   Real Madrid vs Barcelona           │
│                                      │
│   [Real Madrid Logo] VS [Barcelona]  │
│                                      │
│   Make your prediction and stand a   │
│   chance to win exciting prizes!     │
│                                      │
│   Full Name: [___________________]   │
│   Enrollment: [_________________]    │
│                                      │
│   [Continue to Prediction]           │
│                                      │
│   ⚠️ One prediction per enrollment   │
│   🔒 One registration per device     │
└─────────────────────────────────────┘
```

### Device Blocked Screen
```
┌─────────────────────────────────────┐
│              🚫                      │
│   Device Already Registered          │
│                                      │
│   This device has already been used  │
│   to register for this match.        │
│                                      │
│   Each device can only be used once  │
│   per match to ensure fair play.     │
│                                      │
│   Why this restriction?              │
│   To maintain the integrity of the   │
│   prediction challenge, we allow     │
│   only one registration per device.  │
└─────────────────────────────────────┘
```

## Admin View

The admin dashboard at `/admin/predictions` now shows device IDs in the predictions table:

| Name | Enrollment | Device ID | Prediction | Time |
|------|-----------|-----------|------------|------|
| John Doe | PPSU12345 | abc123-... | 2-1 (Home) | 10:30 AM |

This helps identify:
- Multiple accounts from same device (potential fraud)
- Unique users vs duplicate attempts

## Testing the System

### Test Scenario 1: Normal Flow
1. Open `/prediction` in browser
2. Enter name: "John Doe"
3. Enter enrollment: "PPSU12345"
4. Submit prediction → ✅ Success
5. Try to submit again → ❌ Blocked (enrollment already used)

### Test Scenario 2: Device Blocking
1. Open `/prediction` in browser (Device A)
2. Complete registration → ✅ Success
3. Clear browser data (simulate new user on same device)
4. Try to register again → ❌ Blocked (device already used)

### Test Scenario 3: Multiple Devices
1. Submit prediction from Computer → ✅ Success
2. Submit prediction from Phone with different enrollment → ✅ Success
3. Each device gets its own device ID

### Test Scenario 4: Multiple Matches
1. Submit prediction for Match A from Device A → ✅ Success
2. Submit prediction for Match B from Device A → ✅ Success
3. Device registration is match-specific

### Clearing Test Data (Developer Only)

```javascript
// Open browser console on /prediction page

// Clear registration for specific match
clearDeviceRegistration('match_id_here');

// Clear all prediction data
clearDeviceRegistration();

// Manually delete device ID
localStorage.removeItem('ppsu_device_id');
```

## Security Considerations

### What This Prevents
✅ Multiple registrations from same device
✅ Users creating multiple accounts on one device
✅ Automated bot submissions (to some extent)
✅ Enrollment number reuse

### What This Doesn't Prevent
❌ Users using multiple physical devices
❌ Incognito mode submissions (new device ID each time)
❌ Users clearing localStorage between submissions

### Recommendations for Additional Security
If stricter controls are needed:

1. **Add IP Address Tracking**
   ```javascript
   // In API route, log IP address
   const ip = request.headers.get('x-forwarded-for') || 'unknown';
   ```

2. **Implement Rate Limiting**
   - Limit check requests per IP
   - Prevent rapid submission attempts

3. **Email Verification**
   - Require institutional email
   - Send confirmation code

4. **Admin Review**
   - Flag suspicious patterns
   - Manual approval for outliers

5. **Server-Side Fingerprinting**
   - Use headers, IP, and other server data
   - More reliable than client-side only

## Troubleshooting

### Issue: User says they can't register
**Check:**
1. Have they already registered with this enrollment number?
2. Has someone else used this device?
3. Is localStorage enabled in their browser?
4. Has the match already started?

**Solution:**
- Check Firestore for existing predictions with their enrollment number
- Verify device ID in the prediction document
- If legitimate issue, manually delete the prediction document

### Issue: User cleared browser data and wants to see their prediction
**Solution:**
- They can still enter their enrollment number
- System will detect existing prediction and show it
- Device will be marked as registered again

### Issue: Testing shows device not being blocked
**Check:**
1. Is localStorage working? (Check browser settings)
2. Is the device ID being generated? (Check console logs)
3. Is the API route receiving the device ID?

## Feature Flags

To disable device registration (not recommended):

1. Remove device ID checks in API routes
2. Remove device blocking UI from UserIdentification
3. Continue using enrollment number as primary identifier

## Conclusion

The device registration system adds an important layer of security and fairness to the prediction platform. It prevents the most common abuse vector (same device, multiple accounts) while maintaining a smooth user experience.

For most use cases, this provides sufficient protection. If additional security is needed, implement the recommendations above based on your specific requirements.

---

**Need Help?**
- Check the console for device ID generation logs
- Review Firestore for prediction documents
- Test in incognito mode to simulate new devices
- Contact the development team for advanced issues
