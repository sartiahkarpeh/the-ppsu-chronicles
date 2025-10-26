# Live Scream - Real-Time Sports Management System

## 🎯 Overview

A complete real-time live sports management system for managing Football and Basketball matches with Firebase Firestore and Storage integration.

## 📁 Directory Structure

```
/src/app/live/
├── page.tsx                     # Public live scores page
├── types.ts                     # TypeScript type definitions
├── index.ts                     # Export barrel file
├── admin/
│   └── page.tsx                # Admin dashboard for managing matches
├── components/
│   ├── LiveCard.tsx            # Display component for individual matches
│   └── LiveEditor.tsx          # Form component for adding/editing matches
└── hooks/
    └── useLiveUpdates.ts       # Custom hook for real-time Firestore updates
```

## ✨ Features

### Admin Panel Integration

- **Access via Admin Dashboard**: Navigate to your admin panel at `/admin/dashboard`
- **"Live Scream" menu item**: Click to go to `/live/admin` to manage live matches
- **Dashboard card**: Quick access card on the main dashboard

### Public Live Page (`/live`)

- Real-time updates using Firestore snapshots
- Grouped by sport (Football ⚽ and Basketball 🏀)
- Blinking "LIVE" indicator for ongoing matches
- Team logos displayed side-by-side
- Current scores, time, and match status
- Last updated timestamps
- Responsive grid layout (mobile, tablet, desktop)
- Empty state messaging when no matches are live

### Admin Dashboard (`/live/admin`)

- **Two main action buttons**:
  - ➕ Add Football Live
  - ➕ Add Basketball Live
- **Match management**:
  - Edit existing matches
  - End matches (sets status to FULLTIME)
  - Delete matches permanently
- **Real-time sync**: All changes appear instantly on the public page
- Toast notifications for success/error messages
- Mobile-responsive design

### Live Editor Modal

- **Dynamic form** that adapts to Football or Basketball
- **Input fields**:
  - Team A & B names (required)
  - Team A & B logos with image upload (required)
  - Score (e.g., "2 - 1" or "95 - 87")
  - Time/Quarter (e.g., "45'" or "Q3 2:30")
  - Match status dropdown (LIVE, HALFTIME, FULLTIME, UPCOMING)
  - League/Tournament name (required)
  - Location/Stadium (required)
  - Optional description/commentary
- **Image handling**:
  - Preview images before upload
  - Upload to Firebase Storage at `/teamImages/{matchId}/{team}.jpg`
  - Store download URLs in Firestore
- **Auto-clear**: Form resets and closes after successful save
- **Validation**: Required fields enforced

### Live Card Component

- Clean, modern card design with Tailwind CSS
- Sport-specific color borders (green for football, orange for basketball)
- Blinking red "LIVE" indicator with CSS animations
- Team images with fallback (first letter of team name)
- Score display in large, bold text
- Time/status information
- Status badges (color-coded)
- Last updated timestamp (relative time format)
- Optional description/commentary
- Admin controls (Edit/End Match buttons) when in admin mode

## 🔥 Firebase Integration

### Firestore Collection: `liveGames`

```javascript
{
  id: string (auto-generated),
  sport: "Football" | "Basketball",
  teamA: {
    name: string,
    imageUrl: string
  },
  teamB: {
    name: string,
    imageUrl: string
  },
  score: string,
  time: string,
  status: "LIVE" | "HALFTIME" | "FULLTIME" | "UPCOMING",
  league: string,
  location: string,
  description?: string,
  lastUpdated: Timestamp
}
```

### Storage Structure

```
/teamImages/
  ├── {matchId}/
  │   ├── A.jpg (Team A logo)
  │   └── B.jpg (Team B logo)
```

### Real-Time Updates

- Uses `onSnapshot` listener for instant updates
- No polling or manual refresh required
- All connected clients update simultaneously
- Automatic reconnection on network issues

## 🎨 Design Features

### Styling

- **Tailwind CSS** for all styles
- Responsive breakpoints (mobile-first)
- Smooth transitions and hover effects
- Glass-morphism effects on cards
- Gradient backgrounds
- Shadow elevations

### Colors

- **Football**: Green accent (#10B981)
- **Basketball**: Orange accent (#F97316)
- **Live indicator**: Red (#EF4444) with pulse animation
- **Status badges**: Context-specific colors

### Animations

- Blinking LIVE indicator (CSS keyframes)
- Smooth card hover effects
- Loading spinners
- Toast slide-in animations

## 🚀 Usage

### For Admins

1. **Access Admin Panel**:

   - Go to `/admin/dashboard`
   - Login with admin credentials

2. **Navigate to Live Scream**:

   - Click "Live Scream" in the sidebar
   - Or click the Live Scream card on dashboard

3. **Add a Match**:

   - Click "➕ Add Football Live" or "➕ Add Basketball Live"
   - Fill in all required fields
   - Upload team logos
   - Click "Save"

4. **Edit a Match**:

   - Click "Edit" button on any match card
   - Update fields as needed
   - Click "Update Match"

5. **End a Match**:

   - Click "End Match" button
   - Status changes to "FULLTIME"

6. **Delete a Match**:
   - Click the trash icon (top-left of card)
   - Confirm deletion
   - Match and images removed permanently

### For Public Users

1. **View Live Scores**:

   - Visit `/live` (no login required)
   - See all ongoing Football and Basketball matches
   - Updates happen automatically in real-time

2. **Check Match Details**:
   - See team logos, names, and scores
   - View match time and status
   - Read optional commentary/descriptions

## 🛠 Technical Details

### TypeScript Types

All components are fully typed with TypeScript for type safety and autocomplete.

### Error Handling

- Try-catch blocks for all Firebase operations
- User-friendly error messages
- Console logging for debugging
- Graceful fallbacks for missing images

### Performance

- Optimized images with Next.js Image component
- Efficient Firestore queries with indexing
- Minimal re-renders with React hooks
- Lazy loading for components

### Security

- Admin routes should be protected (implement auth guards)
- Firestore security rules recommended:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /liveGames/{gameId} {
      allow read: if true;
      allow write: if request.auth != null; // Admins only
    }
  }
}
```

### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /teamImages/{matchId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null; // Admins only
    }
  }
}
```

## 📱 Responsive Design

- **Mobile** (< 768px): Single column grid, hamburger menu
- **Tablet** (768px - 1024px): Two column grid
- **Desktop** (> 1024px): Three column grid

## 🐛 Known Issues & Solutions

### Issue: Module import errors

**Solution**: All imports now use absolute paths with `@/app/live/...` syntax

### Issue: TypeScript "any" type errors

**Solution**: All components properly typed with interfaces

### Issue: "use client" directive warnings

**Solution**: Added to all client components (hooks, interactive components)

## 🔜 Future Enhancements

- [ ] Add live chat/commentary feed
- [ ] Implement match statistics (shots, fouls, etc.)
- [ ] Add match history archive
- [ ] Email notifications for match updates
- [ ] Multi-language support
- [ ] Dark mode toggle
- [ ] Advanced filtering and search
- [ ] Match scheduling/calendar view
- [ ] Video highlights integration
- [ ] Social media sharing

## 📝 Notes

- All changes to matches appear instantly on the public page
- Images are optimized automatically by Firebase Storage
- The system supports unlimited concurrent matches
- Real-time updates work across all devices simultaneously
- No page refresh required for updates

## 🆘 Support

For issues or questions:

1. Check browser console for errors
2. Verify Firebase configuration in `/src/firebase/config.js`
3. Ensure Firestore and Storage are enabled in Firebase Console
4. Check security rules allow read/write access

---

**Built with**: Next.js 15, TypeScript, Firebase, Tailwind CSS
**Last Updated**: January 2025
