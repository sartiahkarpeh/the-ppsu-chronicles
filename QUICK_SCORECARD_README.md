# Quick Scorecard Feature - Update Documentation

## 🆕 New Features Added

### 1. **Quick Scorecard Interface**
A modern, real-time scorecard for quick score updates without needing to edit and save manually.

#### Features:
- **Sport-specific design**: Green theme for Football ⚽, Orange theme for Basketball 🏀
- **Team logos and names** displayed prominently
- **Large score display** with easy-to-read numbers
- **Quick score buttons**:
  - Football: +1 Goal, -1
  - Basketball: +1, +2, +3, -1 points
- **Live timer** that counts automatically:
  - Football: Counts up (0' to 90'+)
  - Basketball: Counts down (12:00 to 0:00)
- **Timer controls**: Start/Pause and Reset buttons
- **Auto-save**: Automatically saves every 5 seconds when timer is running
- **Manual save**: Save button for instant updates
- **Quarter/Half controls**:
  - Basketball: Switch between Q1-Q4
  - Football: Switch between 1st and 2nd half

### 2. **Live Timer on Public Page**
The live timer now displays and counts in real-time on the public `/live` page for all LIVE matches.

#### How it works:
- **Football matches**: Time counts up from the last saved time (e.g., 45', 46', 47'...)
- **Basketball matches**: Time counts down from the last saved time (e.g., 12:00, 11:59, 11:58...)
- **Updates automatically** every second on the viewer's screen
- **Syncs with admin updates** when admin saves new times via scorecard

### 3. **Scorecard Button on Admin Panel**
For any match with status "LIVE", a "📊 Scorecard" button appears on the card.

## 🎯 Usage Guide

### For Football Matches

1. **Create a match** and set status to "LIVE"
2. **Click "📊 Scorecard"** button on the match card
3. **Start the timer** to begin live countdown
4. **Add goals** by clicking "+1 Goal" for each team
5. **Timer auto-saves** score and time every 5 seconds
6. **Switch halves** using "1st Half" / "2nd Half" buttons
7. **Public viewers** see the time counting up in real-time

### For Basketball Matches

1. **Create a match** and set status to "LIVE"
2. **Click "📊 Scorecard"** button on the match card
3. **Set the quarter** (Q1, Q2, Q3, Q4)
4. **Start the timer** to begin countdown (default 12:00)
5. **Add points**: 
   - Free throw: +1
   - Field goal: +2
   - Three-pointer: +3
   - Correction: -1
6. **Timer auto-saves** every 5 seconds
7. **Change quarters** using "Previous Quarter" / "Next Quarter" buttons
8. **Public viewers** see the time counting down in real-time

## 📊 Scorecard Interface Layout

```
┌─────────────────────────────────────────────┐
│  ⚽/🏀 Sport Scorecard          League Info  │
├─────────────────────────────────────────────┤
│                                              │
│  🔵 Team A    ⏱️  45:23  🔴 Team B         │
│   [Logo]         85 - 92      [Logo]        │
│                                              │
│  +1 +2 +3 -1  ▶️ ⏸️ 🔄  +1 +2 +3 -1        │
│                                              │
│      Q1  Q2  Q3  Q4  (Basketball)           │
│   1st Half | 2nd Half  (Football)           │
│                                              │
│  🔴 Auto-saving...        💾 Save Now       │
└─────────────────────────────────────────────┘
```

## 🎨 Design Details

### Football Scorecard
- **Color theme**: Green accents (#10B981)
- **Timer format**: Minutes and seconds (45'23)
- **Score buttons**: +1 Goal (large green), -1 (red)
- **Half controls**: Toggle between 1st/2nd half
- **Timer behavior**: Counts UP from 0 to 90+ minutes

### Basketball Scorecard
- **Color theme**: Orange accents (#F97316)
- **Timer format**: MM:SS (12:00, 5:45, etc.)
- **Score buttons**: +1, +2, +3 (orange), -1 (red)
- **Quarter controls**: Navigate Q1 through Q4
- **Timer behavior**: Counts DOWN from 12:00 to 0:00

## 🔥 Technical Implementation

### Auto-Save Mechanism
```typescript
// Auto-saves every 5 seconds when timer is running
useEffect(() => {
  if (isTimerRunning) {
    const autoSaveInterval = setInterval(handleQuickSave, 5000);
    return () => clearInterval(autoSaveInterval);
  }
}, [isTimerRunning, scores, time, quarter]);
```

### Live Timer on Public Page
```typescript
// Updates every second for LIVE matches
useEffect(() => {
  if (game.status === "LIVE") {
    const interval = setInterval(() => {
      // Football: increment time
      // Basketball: decrement time
      updateLiveTime();
    }, 1000);
    return () => clearInterval(interval);
  }
}, [game.status, game.time]);
```

### Firebase Updates
```typescript
await updateDoc(doc(db, "liveGames", gameId), {
  score: "85 - 92",
  time: "Q3 5:45",
  lastUpdated: serverTimestamp()
});
```

## ✨ Benefits

1. **Speed**: Update scores instantly without full edit modal
2. **Accuracy**: Live timer prevents manual time entry errors
3. **Real-time**: Public viewers see time ticking in real-time
4. **Professional**: Looks like professional sports broadcasting
5. **Easy**: Simple +1, +2, +3 buttons for quick updates
6. **Safe**: Auto-save prevents data loss
7. **Flexible**: Start/pause/reset controls for breaks

## 🎮 User Experience

### Admin Experience
- Click scorecard button → Immediate full-screen interface
- Large, touch-friendly buttons for mobile use
- Clear visual feedback for all actions
- No need to type - just click buttons
- Auto-save indicator shows when data is being saved
- Close anytime - changes are saved

### Public Viewer Experience
- See live timer counting in real-time
- Score updates appear instantly
- Visual "LIVE" indicator with pulse animation
- Time displayed in red color for LIVE matches
- Smooth, no-lag updates

## 📱 Mobile Responsive

- **Large touch targets** for score buttons
- **Full-screen modal** on mobile devices
- **Optimized layout** for all screen sizes
- **Easy tap controls** for timer and quarters

## 🔜 Future Enhancements

Potential additions:
- [ ] Foul/penalty tracking
- [ ] Player substitution tracking
- [ ] Shot clock for basketball
- [ ] Injury time for football
- [ ] Statistics panel (shots, possession, etc.)
- [ ] Match commentary feed
- [ ] Undo last action button
- [ ] Match timeline/events log
- [ ] Audio notifications for goals
- [ ] Video replay integration

## 🎯 Best Practices

1. **Always start the timer** when match begins
2. **Use auto-save** by keeping timer running
3. **Pause during breaks** (halftime, timeouts)
4. **Switch quarters/halves** at appropriate times
5. **Double-check scores** before adding
6. **Use manual save** if needed for instant update
7. **Close scorecard** when match ends, then use "End Match" button

## 🐛 Troubleshooting

**Timer not counting?**
- Make sure you clicked "Start" button
- Check match status is "LIVE"
- Refresh page if timer seems stuck

**Scores not updating on public page?**
- Wait for auto-save (5 seconds)
- Click "Save Now" button manually
- Check internet connection

**Scorecard button not showing?**
- Match status must be "LIVE"
- Only appears on admin panel
- Not visible on public page

---

**Created**: January 2025
**Component**: QuickScorecard.tsx
**Dependencies**: Firebase Firestore, React hooks
