# AFCON 2025 - Production-Ready Tournament Platform

A complete, real-time sports tournament platform built for **The PPSU Chronicles** featuring live scores, fixtures, standings, highlights, and admin management for AFCON 2025.

## 🌟 Features

### Public Features (`/afcon25`)
- **Live Score Ticker** - Real-time updates for ongoing matches
- **Fixtures & Results** - Complete match schedule with filtering
- **Group Standings** - Auto-calculated league tables
- **Match Pages** - Detailed match view with live events timeline
- **Video Highlights** - YouTube integration with lazy loading
- **Teams Directory** - All participating teams with crests and colors
- **Mobile-First Design** - Fully responsive with Tailwind CSS
- **Dark Mode Support** - Automatic theme switching

### Admin Features (`/admin/afcon25`)
- **Match Management** - Create, edit, and delete fixtures
- **Live Scoreboard** - Update scores and add events in real-time
- **Team Management** - Manage team data, colors, and crests
- **Highlights Upload** - Add YouTube highlights with auto-thumbnails
- **Role-Based Access** - Secure admin/editor roles via Firebase Auth
- **Audit Logging** - Track all admin actions

### Backend Features
- **Firestore Realtime Listeners** - Instant updates across all clients
- **Cloud Functions** - Webhooks, scheduled syncs, auto-calculations
- **Security Rules** - Public read, admin-only write
- **Firebase Storage** - Asset management (optional)
- **Webhook Integration** - Accept live updates from sports APIs

---

## 📋 Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Firebase Setup](#firebase-setup)
5. [Local Development](#local-development)
6. [Deployment](#deployment)
7. [Data Seeding](#data-seeding)
8. [Admin Access](#admin-access)
9. [Cloud Functions](#cloud-functions)
10. [API Integration](#api-integration)
11. [Project Structure](#project-structure)
12. [Customization](#customization)

---

## 🏗️ Architecture

```
┌─────────────────┐
│   React/Next.js │ ─── Tailwind CSS, TypeScript
│   Public Routes │ ─── /afcon25/*
│   Admin Routes  │ ─── /admin/afcon25/*
└────────┬────────┘
         │
         ├─── Firebase Auth (Admin Roles)
         │
         ├─── Firestore (Realtime Listeners)
         │    ├── teams/
         │    ├── matches/ → events/
         │    ├── standings/
         │    ├── highlights/
         │    └── adminLogs/
         │
         ├─── Firebase Storage (Media Assets)
         │
         └─── Cloud Functions
              ├── webhookUpdate (HTTP)
              ├── scheduledFixtureSync (Cron)
              └── onMatchFinalized (Trigger)
```

---

## ✅ Prerequisites

- **Node.js** 18+ and npm
- **Firebase Project** with Blaze plan (for Cloud Functions)
- **Git**
- **Code Editor** (VS Code recommended)

---

## 📦 Installation

### 1. Clone and Install

```bash
# Navigate to your project
cd the-ppsu-chronicles

# Install dependencies
npm install

# Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools
```

### 2. Check Existing Files

The following files should already exist in your project:
- `src/app/afcon25/*` - Public pages
- `src/app/admin/afcon25/*` - Admin pages
- `src/components/afcon/*` - Reusable components
- `src/lib/afcon/*` - Firestore helpers
- `src/types/afcon.ts` - TypeScript types
- `functions/src/index.ts` - Cloud Functions
- `firestore-afcon.rules` - Security rules
- `seed-data/*` - Sample data

---

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project or use existing one
3. Enable **Firestore Database**
4. Enable **Authentication** → Email/Password
5. Upgrade to **Blaze Plan** (pay-as-you-go) for Cloud Functions

### 2. Initialize Firebase in Project

```bash
# Login to Firebase
firebase login

# Initialize (select existing project)
firebase init

# Select:
# ✓ Firestore
# ✓ Functions
# ✓ Hosting (optional)

# When prompted:
# - Firestore rules: firestore-afcon.rules
# - Functions: TypeScript
# - Use existing functions folder
```

### 3. Get Firebase Config

1. Go to Project Settings → General
2. Scroll to "Your apps" → Web app
3. Copy config object
4. Update `src/firebase/config.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 4. Download Service Account Key

1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `serviceAccountKey.json` in project root
4. **Add to .gitignore** (very important!)

```bash
echo "serviceAccountKey.json" >> .gitignore
```

### 5. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

---

## 💻 Local Development

### 1. Run Next.js Dev Server

```bash
npm run dev
```

Visit:
- Public site: `http://localhost:3000/afcon25`
- Admin: `http://localhost:3000/admin/afcon25`

### 2. Run Firebase Emulators (Optional)

```bash
# Start Firestore and Functions emulators
firebase emulators:start

# In another terminal, run Next.js
npm run dev
```

Update `src/firebase/config.js` to use emulators:

```javascript
if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

---

## 🚀 Deployment

### 1. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 2. Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 3. Deploy Next.js (Choose One)

#### Option A: Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

#### Option B: Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

---

## 🌱 Data Seeding

### 1. Seed Sample Data

```bash
# Install dependencies
npm install firebase-admin

# Run seed script
node seed-data/seed.js
```

This creates:
- 8 teams
- 6 matches (scheduled, live, finished)
- 2 highlights
- Sample match events

### 2. Verify Data

Go to Firebase Console → Firestore Database and check:
- `teams` collection
- `matches` collection
- `highlights` collection

---

## 🔐 Admin Access

### 1. Create Admin User

```bash
# Create user in Firebase Console
# Authentication → Users → Add user
# Email: admin@example.com
# Password: (choose strong password)
```

### 2. Set Admin Role (Custom Claims)

Create `scripts/setAdminRole.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminRole(email, role) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { role });
  console.log(`✅ Set role '${role}' for ${email}`);
}

// Usage
setAdminRole('admin@example.com', 'admin');
```

Run it:

```bash
node scripts/setAdminRole.js
```

### 3. Login to Admin

1. Visit `/login`
2. Sign in with admin credentials
3. Navigate to `/admin/afcon25`

---

## ⚡ Cloud Functions

### Available Functions

#### 1. **webhookUpdate** (HTTP)
Receives live score updates from third-party APIs.

```bash
# Endpoint after deployment
https://REGION-PROJECT_ID.cloudfunctions.net/webhookUpdate

# Example payload
curl -X POST https://YOUR_FUNCTION_URL/webhookUpdate \
  -H "Content-Type: application/json" \
  -d '{
    "match_id": "external_123",
    "home_score": 2,
    "away_score": 1,
    "minute": 67,
    "status": "IN_PLAY",
    "events": [...]
  }'
```

#### 2. **scheduledFixtureSync** (Cron)
Runs daily at 2 AM UTC to fetch upcoming fixtures.

Configure API key:
```bash
firebase functions:config:set sports.api_key="YOUR_API_KEY"
```

#### 3. **onMatchFinalized** (Firestore Trigger)
Auto-calculates standings when match status → 'finished'.

### Local Testing

```bash
# Start Functions emulator
firebase emulators:start --only functions

# Test webhook locally
curl -X POST http://localhost:5001/PROJECT_ID/REGION/webhookUpdate \
  -H "Content-Type: application/json" \
  -d '{ "match_id": "test_1", ... }'
```

---

## 🔌 API Integration

### Integrate with Sports API

1. **Choose Provider**: API-Football, SportMonks, etc.
2. **Get API Key**
3. **Update Cloud Functions**:

Edit `functions/src/index.ts`:

```typescript
// Update scheduledFixtureSync to use your API
const response = await axios.get('YOUR_API_ENDPOINT', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});

// Map API response to Firestore schema
const normalized = mapProviderData(response.data);
```

4. **Configure Webhook**:
   - Set webhook URL to your `webhookUpdate` function
   - Add signature validation in function

---

## 📁 Project Structure

```
the-ppsu-chronicles/
├── src/
│   ├── app/
│   │   ├── afcon25/              # Public routes
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── fixtures/         # Fixtures list
│   │   │   ├── standings/        # Group tables
│   │   │   ├── highlights/       # Video highlights
│   │   │   ├── teams/            # Teams directory
│   │   │   └── match/[id]/       # Match detail
│   │   └── admin/afcon25/        # Admin routes
│   │       ├── page.tsx          # Dashboard
│   │       ├── matches/          # Match CRUD
│   │       ├── scoreboard/       # Live updates
│   │       ├── teams/            # Team CRUD
│   │       └── highlights/       # Highlights CRUD
│   ├── components/afcon/
│   │   ├── MatchCard.tsx
│   │   ├── LiveTicker.tsx
│   │   ├── VideoEmbed.tsx
│   │   ├── EventTimeline.tsx
│   │   └── StandingsTable.tsx
│   ├── lib/afcon/
│   │   ├── firestore.ts          # Firestore helpers
│   │   └── utils.ts              # Utility functions
│   ├── types/
│   │   └── afcon.ts              # TypeScript types
│   ├── hooks/
│   │   └── useAuth.ts            # Auth hook
│   └── firebase/
│       └── config.js             # Firebase config
├── functions/
│   ├── src/
│   │   └── index.ts              # Cloud Functions
│   ├── package.json
│   └── tsconfig.json
├── seed-data/
│   ├── teams.json
│   ├── matches.json
│   ├── highlights.json
│   ├── seed.js
│   └── README.md
├── firestore-afcon.rules         # Security rules
└── AFCON25_README.md             # This file
```

---

## 🎨 Customization

### 1. Branding & Colors

Edit `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        afcon: {
          primary: '#009933',   // Green
          secondary: '#FCD116', // Gold
          accent: '#CE1126',    // Red
        }
      }
    }
  }
}
```

### 2. Add More Teams

Edit `seed-data/teams.json` and run:

```bash
node seed-data/seed.js
```

### 3. Microcopy & Text

Update text in component files:
- `src/app/afcon25/page.tsx` - Landing page text
- `src/components/afcon/*` - Component labels
- `firestore-afcon.rules` - Change collection names if needed

### 4. Add Firebase Storage

For file uploads (team logos, etc.):

1. Enable Storage in Firebase Console
2. Add storage rules
3. Use `uploadBytes` from `firebase/storage`

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Public pages load without errors
- [ ] Live ticker shows live matches
- [ ] Match detail page updates in real-time
- [ ] Standings calculate correctly
- [ ] Video embeds load (test YouTube ID)
- [ ] Admin login with custom claims
- [ ] Create/edit/delete matches
- [ ] Live scoreboard updates in real-time
- [ ] Highlights upload with auto-thumbnail
- [ ] Mobile responsive design
- [ ] Dark mode works

### Test Realtime Updates

1. Open `/afcon25` in two browser windows
2. In admin, update a live match score
3. Verify both public windows update instantly

---

## 🐛 Troubleshooting

### Issue: Firestore Permission Denied

**Solution**: Deploy security rules
```bash
firebase deploy --only firestore:rules
```

### Issue: Admin can't access dashboard

**Solution**: Check custom claims
```javascript
// Verify claims
firebase auth:export users.json
// Check role field in exported JSON
```

### Issue: Cloud Functions not deploying

**Solution**: Check Node version
```bash
node --version  # Should be 18+
cd functions && npm install
```

### Issue: Real-time updates not working

**Solution**: Check Firestore listeners
```javascript
// Verify onSnapshot is called
console.log('Subscribing to matches');
```

---

## 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions Guide](https://firebase.google.com/docs/functions)

---

## 📝 License & Credits

Built for **The PPSU Chronicles** by Sartiah Karpeh.

This is a production-ready template. Customize freely for your tournament needs.

---

## 🆘 Support

For issues or questions:
1. Check Firebase Console logs
2. Check browser console for errors
3. Review `functions/logs` for Cloud Function errors
4. Verify Firestore rules allow your operations

---

## 🎯 Next Steps

1. ✅ Complete Firebase setup
2. ✅ Seed sample data
3. ✅ Create admin user with role
4. ✅ Test all features locally
5. ✅ Deploy to production
6. ✅ Set up webhook from sports API
7. ✅ Configure scheduled sync
8. ✅ Test real-time updates
9. ✅ Customize branding
10. ✅ Launch! 🚀

---

**Enjoy building your AFCON 2025 platform! ⚽🏆**

