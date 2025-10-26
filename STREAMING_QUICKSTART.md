# 🚀 Quick Start Guide - Live Video Streaming

## 📋 What You Just Got

A complete live streaming system with:

- 📹 Admin camera controls
- 🎯 Real-time score overlays
- 📱 Mobile-optimized streaming
- 🔴 Professional LIVE badges
- 📊 Viewer count tracking
- 🎨 Beautiful broadcast overlays

---

## ⚡ Quick Test (5 Minutes)

### Step 1: Start Development Server

```bash
npm run dev
```

### Step 2: Go to Admin Panel

```
http://localhost:3000/live/admin
```

### Step 3: Create a Live Match

1. Click "➕ Add Football Live"
2. Fill in match details:
   - Team A: "Barcelona" (add logo URL)
   - Team B: "Real Madrid" (add logo URL)
   - Score: "2 - 1"
   - Time: "45'"
   - League: "La Liga"
   - Location: "Camp Nou"
   - Status: **LIVE**
3. Click "Save Match"

### Step 4: Start Streaming

1. Scroll to "📹 Admin Live Stream"
2. Select your match from dropdown
3. Click "📹 Start Preview"
4. Allow camera/mic permissions
5. See yourself in the preview
6. Click "🔴 Go Live"

### Step 5: View as Audience

Open in new tab:

```
http://localhost:3000/live
```

or

```
http://localhost:3000/live/stream
```

You'll see:

- Your live video
- Match score overlay on top
- Team logos and names
- Time and league info
- LIVE badge
- Viewer count

---

## 📱 Test on Mobile

### Admin (Phone Camera)

1. Open on your phone: `http://[your-ip]:3000/live/admin`
2. Use phone's back camera to stream
3. Phone becomes the broadcast camera

### Viewer (Phone Watch)

1. Open on any device: `http://[your-ip]:3000/live`
2. See full-screen vertical video
3. Overlays adjust for mobile

---

## 🎬 Production Setup (Livepeer)

### 1. Sign Up for Livepeer

```
https://livepeer.studio
```

- Create free account
- Get API key from dashboard

### 2. Add Environment Variable

Create `.env.local`:

```bash
NEXT_PUBLIC_LIVEPEER_API_KEY=your_api_key_here
```

### 3. Install Livepeer Package

```bash
npm install @livepeer/react
```

### 4. Update Code (Already Commented)

Check these files:

- `AdminLiveStream.tsx` - Line ~120 (goLive function)
- `LiveVideoPlayer.tsx` - Line ~150 (video element)

Uncomment the Livepeer integration code!

### 5. Deploy

```bash
npm run build
vercel deploy
```

---

## 🔧 Customization

### Change Overlay Colors

**File:** `LiveVideoPlayer.tsx`

```tsx
// Line ~150: Score overlay background
className = "bg-gradient-to-r from-blue-900/95 via-blue-800/95 to-blue-900/95";
// Change to: from-red-900/95 via-red-800/95 to-red-900/95
```

### Change Team Logo Size

**File:** `LiveVideoPlayer.tsx`

```tsx
// Line ~160: Team logo
<div className="relative w-8 h-8 sm:w-10 sm:h-10">
// Change to: w-12 h-12 sm:w-16 sm:h-16
```

### Add More Overlay Info

**File:** `LiveVideoPlayer.tsx`

Add after score overlay:

```tsx
{
  /* Stadium Temperature */
}
<div className="absolute top-24 right-4 z-20">
  <div className="bg-black bg-opacity-70 px-3 py-2 rounded-lg">
    <span className="text-white text-sm">🌡️ 28°C</span>
  </div>
</div>;
```

---

## 🐛 Troubleshooting

### "Camera Not Working"

**Fix:**

1. Check browser is HTTPS or localhost
2. Allow permissions when prompted
3. Close other apps using camera (Zoom, Teams)

### "No Live Stream Available"

**Fix:**

1. Create a match with status "LIVE"
2. Click "Go Live" in admin panel
3. Wait 2-3 seconds for sync

### "Overlays Not Showing"

**Fix:**

1. Make sure match is selected in admin
2. Check `matchId` matches in Firebase
3. Verify match status is "LIVE"

### "Build Errors"

**Fix:**

```bash
rm -rf .next node_modules
npm install
npm run build
```

---

## 📊 Firebase Setup

### Required Collections

**1. `games` collection** (already exists)

```javascript
{
  sport: "Football",
  teamA: { name: "...", imageUrl: "..." },
  teamB: { name: "...", imageUrl: "..." },
  score: "2 - 1",
  time: "45'",
  status: "LIVE",
  league: "Premier League",
  location: "Stadium Name"
}
```

**2. `livestreams` collection** (auto-created)

```javascript
{
  isActive: true,
  matchId: "match_id_here",
  startedAt: Timestamp,
  endedAt: null,
  viewerCount: 0
}
```

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Livestreams
    match /livestreams/{streamId} {
      allow read: if true;  // Anyone can watch
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Games
    match /games/{gameId} {
      allow read: if true;  // Anyone can see scores
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## 🎯 Usage Flow

### Admin Flow

```
1. Create live match → 2. Select match → 3. Start preview → 4. Go live → 5. Update scores → 6. End stream
```

### Viewer Flow

```
1. Visit /live → 2. See video stream → 3. Watch with overlays → 4. Scores update live
```

---

## 📈 What's Working Now

✅ **Camera Access** - Uses phone/laptop camera  
✅ **Preview Mode** - Test before going live  
✅ **Firebase Sync** - Real-time stream status  
✅ **Match Selection** - Link stream to match  
✅ **Video Overlays** - Score, teams, time, status  
✅ **Mobile Support** - Vertical video on phones  
✅ **Auto Updates** - Scores sync automatically  
✅ **LIVE Badge** - Animated pulsing indicator  
✅ **Viewer Count** - Simulated (ready for real tracking)

---

## 🚀 What's Next (Your Choice)

### Option A: Use Demo Mode (Now)

- Works with local camera
- Firebase stores stream state
- Perfect for testing/development
- Viewers see your camera feed locally

### Option B: Integrate Livepeer (Production)

- Real CDN delivery
- Global reach
- HLS/RTMP streaming
- Scalable to 1000s of viewers
- ~2 hours setup time

### Option C: Use OBS + RTMP (Alternative)

- Stream via OBS Studio
- Push to custom RTMP server
- Full broadcaster control
- More complex setup

---

## 💡 Pro Tips

1. **Test Camera First**

   - Always use "Start Preview" before going live
   - Check lighting and framing
   - Test audio levels

2. **Mobile Streaming**

   - Use tripod or stable mount
   - Keep phone charged (streaming drains battery)
   - Use good WiFi (not cellular)

3. **Score Updates**

   - Update scores in real-time using match editor
   - Overlays update automatically
   - No need to restart stream

4. **Multiple Matches**
   - Create multiple live matches
   - Switch stream between matches
   - Viewers see all matches on /live page

---

## 📞 Need Help?

Check:

- `LIVE_STREAMING_README.md` - Full documentation
- Console errors (F12 in browser)
- Firebase console for data
- Network tab for stream issues

---

## ✅ Success Checklist

- [ ] Development server running
- [ ] Live match created
- [ ] Camera preview works
- [ ] "Go Live" creates Firebase record
- [ ] Stream visible on /live page
- [ ] Overlays display correctly
- [ ] Score updates reflect on overlay
- [ ] Mobile responsive works
- [ ] "End Stream" works properly

**All checked?** You're ready to go live! 🎉

---

**Build Status:** ✅ Compiled successfully (24s)  
**Pages Generated:** 42 pages  
**New Routes:** `/live/stream`  
**Ready for:** Development & Testing
