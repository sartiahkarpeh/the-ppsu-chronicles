# ⚽ Live Score Integration Guide

## 🎯 Overview

The prediction system now supports **real-time live score** integration from API-Football. When a match is live, the system automatically fetches and displays:
- Current score
- Match status (1st Half, 2nd Half, Half Time, etc.)
- Minutes elapsed
- Match events (goals, cards, substitutions)

---

## 🔧 Setup Instructions

### Step 1: Get API-Football API Key

1. **Visit API-Football:**
   - Go to: https://www.api-football.com/
   - Or via RapidAPI: https://rapidapi.com/api-sports/api/api-football

2. **Sign Up for Free:**
   - Free tier includes:
     - 100 requests per day
     - Access to live scores
     - Match statistics
     - Team information

3. **Get Your API Key:**
   - After signup, get your API key from the dashboard
   - Copy the key (looks like: `abc123def456ghi789...`)

### Step 2: Configure Environment Variable

1. **Create/Edit `.env.local` file** in project root:
   ```bash
   FOOTBALL_API_KEY=your_api_key_here
   ```

2. **Restart the development server:**
   ```bash
   npm run dev
   ```

---

## 📋 How to Use

### For Admin: Adding a Match with Live Score

1. **Go to Admin Dashboard:**
   - Navigate to `/admin/predictions`
   - Click on "Matches" tab

2. **Create/Edit a Match:**
   - Click "Add New Match" or edit existing match
   - Fill in all match details (teams, date, venue, etc.)

3. **Add API Fixture ID:**
   - Find the match on API-Football website
   - Copy the Fixture ID (e.g., `867946`)
   - Paste it in the "API Fixture ID" field
   - **Note:** This is optional. Leave blank to manually update scores.

4. **Set Match Status:**
   - **Upcoming:** Match hasn't started (predictions allowed)
   - **Live:** Match is ongoing (shows live scores, no predictions)
   - **Completed:** Match finished (shows final score)

5. **Save the Match**

### Finding API Fixture IDs

#### Option 1: API-Football Website
1. Go to https://www.api-football.com/
2. Search for the match
3. The fixture ID is in the URL or match details

#### Option 2: Using API Directly
```bash
# Search for matches by date
curl -X GET "https://v3.football.api-sports.io/fixtures?date=2024-10-27" \
  -H "x-rapidapi-host: v3.football.api-sports.io" \
  -H "x-rapidapi-key: YOUR_API_KEY"
```

#### Option 3: Search by League
```bash
# Premier League (ID: 39), La Liga (ID: 140), Champions League (ID: 2)
curl -X GET "https://v3.football.api-sports.io/fixtures?league=39&season=2024" \
  -H "x-rapidapi-host: v3.football.api-sports.io" \
  -H "x-rapidapi-key: YOUR_API_KEY"
```

---

## 🎮 User Experience

### Before Match Starts (Status: Upcoming)
```
┌─────────────────────────────────┐
│  ⚽ Match Prediction Challenge  │
│                                 │
│  Enter Name & Enrollment        │
│  Make Your Prediction           │
│  Submit Prediction              │
└─────────────────────────────────┘
```

### After Match Starts (Status: Live)
```
┌─────────────────────────────────┐
│  🔴 LIVE - 67'                  │
│  Real Madrid 2 - 1 Barcelona    │
│                                 │
│  Match Events:                  │
│  67' ⚽ Benzema (Real Madrid)   │
│  45' ⚽ Lewandowski (Barcelona) │
│  23' ⚽ Vinicius (Real Madrid)  │
│                                 │
│  🔄 Auto-refresh every 30s      │
└─────────────────────────────────┘
```

### Match Finished (Status: Completed)
```
┌─────────────────────────────────┐
│  Final Score                    │
│  Real Madrid 2 - 1 Barcelona    │
│                                 │
│  🏆 Winners Announced!          │
└─────────────────────────────────┘
```

---

## 🔄 How Live Score Updates Work

### Automatic Updates
1. **Every 30 seconds** when match status is "live"
2. Fetches latest data from API-Football
3. Updates scores in real-time
4. Displays match events (goals, cards)
5. Shows elapsed time

### Manual Refresh
- Users can click "🔄 Refresh Score" button
- Instant update from API
- Loading indicator shows update status

### Fallback System
If API is unavailable or no API Fixture ID:
- Falls back to Firestore manual scores
- Admin can manually enter scores
- Still displays match information
- Shows "Manual Score" indicator

---

## 📊 Data Synchronization

### Live Score Data Flow
```
API-Football
    ↓
Backend API Route (/api/livescore)
    ↓
LiveScore Component (Frontend)
    ↓
Firestore (Optional sync for persistence)
    ↓
Display to Users
```

### What Gets Synced
- ✅ Home team score
- ✅ Away team score
- ✅ Match status (LIVE, FT, HT, etc.)
- ✅ Elapsed minutes
- ✅ Team names and logos
- ✅ Match events (goals, cards, subs)
- ✅ Venue information

---

## 🛠️ Technical Details

### API Endpoints

#### Backend Proxy: `/api/livescore`
```typescript
POST /api/livescore
Body: { fixtureId: "867946" }

Response: {
  success: true,
  data: {
    status: "LIVE",
    statusLong: "Match Live",
    elapsed: 67,
    homeTeam: { name: "Real Madrid", logo: "..." },
    awayTeam: { name: "Barcelona", logo: "..." },
    homeScore: 2,
    awayScore: 1,
    events: [...],
    timestamp: 1234567890,
    venue: "Santiago Bernabéu"
  }
}
```

### Match Status Codes
```
NS  - Not Started
1H  - First Half
HT  - Half Time
2H  - Second Half
ET  - Extra Time
P   - Penalty Shootout
FT  - Full Time
AET - After Extra Time
PEN - Penalty Shootout Finished
```

### Firestore Schema Update
```javascript
prediction_matches: {
  // Existing fields...
  apiFixtureId: "867946",        // NEW: API-Football fixture ID
  homeScore: 2,                   // Auto-updated from API
  awayScore: 1,                   // Auto-updated from API
  lastUpdated: "2024-10-27T...",  // Last sync timestamp
}
```

---

## 💡 Best Practices

### For Admins

1. **Set API Fixture ID Early:**
   - Add it when creating the match
   - Verify the fixture ID is correct
   - Test with upcoming matches

2. **Monitor Match Status:**
   - Change status to "live" when match starts
   - System will auto-fetch scores
   - Change to "completed" after match ends

3. **Have a Backup Plan:**
   - If API fails, manually enter scores
   - Update status in admin panel
   - Scores persist in Firestore

4. **API Rate Limits:**
   - Free tier: 100 requests/day
   - Auto-refresh uses ~2 requests/minute during live matches
   - Plan accordingly for match day

### For Developers

1. **Error Handling:**
   - API failures fall back to manual scores
   - No disruption to user experience
   - Logs errors for debugging

2. **Performance:**
   - 30-second refresh interval (adjustable)
   - Efficient API calls
   - Caches data in state

3. **Testing:**
   - Test with real fixture IDs
   - Verify fallback mechanism
   - Check mobile responsiveness

---

## 🧪 Testing Guide

### Test Scenario 1: Live Match with API
1. Find a live match on API-Football
2. Get its fixture ID
3. Create match in admin with fixture ID
4. Set status to "live"
5. Visit `/prediction`
6. ✅ Should show live scores updating

### Test Scenario 2: Match Without API
1. Create match without API fixture ID
2. Set status to "live"
3. Manually enter scores in admin
4. Visit `/prediction`
5. ✅ Should show manual scores

### Test Scenario 3: API Failure
1. Set invalid API key
2. Create match with fixture ID
3. Set status to "live"
4. Visit `/prediction`
5. ✅ Should fall back to manual scores gracefully

---

## 🔍 Troubleshooting

### Issue: Live scores not updating

**Check:**
1. Is `FOOTBALL_API_KEY` set in `.env.local`?
2. Is the API fixture ID correct?
3. Is match status set to "live"?
4. Check browser console for errors
5. Verify API rate limit not exceeded

**Solution:**
```bash
# Restart dev server after adding API key
npm run dev

# Check API key is loaded
console.log(process.env.FOOTBALL_API_KEY) // In API route
```

### Issue: "API not configured" error

**Cause:** Environment variable not set

**Solution:**
1. Create `.env.local` file in project root
2. Add: `FOOTBALL_API_KEY=your_key_here`
3. Restart server

### Issue: Shows "fallback" in response

**Cause:** API request failed or no data found

**Solutions:**
- Verify fixture ID is correct
- Check match is actually live on API-Football
- Verify API key is valid
- Check API rate limits

### Issue: Events not showing

**Cause:** Match might not have events yet or API doesn't provide

**Solution:**
- Wait for match events to occur
- Verify event data in API response
- Some leagues may have limited data

---

## 📈 API Rate Limit Management

### Free Tier Limits
- **100 requests/day**
- **Resets daily**

### Optimization Strategies

1. **Refresh Interval:**
   ```typescript
   // Current: 30 seconds (120 requests/hour)
   // For free tier: 60 seconds (60 requests/hour)
   setInterval(fetchMatchData, 60000); // 1 minute
   ```

2. **Conditional Fetching:**
   ```typescript
   // Only fetch if match is live
   if (match.status === 'live') {
     fetchLiveScore();
   }
   ```

3. **Upgrade Options:**
   - **Pro Plan:** 3,000 requests/day
   - **Ultra Plan:** 30,000 requests/day
   - **Mega Plan:** Unlimited

---

## 🎯 Advanced Features (Future Enhancements)

### Potential Additions
- 📊 Match statistics (possession, shots, corners)
- 👥 Player lineups
- 📸 Match highlights
- 🔔 Goal notifications via push
- 📱 Mobile app integration
- 🎥 Live match commentary
- 📈 Prediction accuracy tracking

---

## 📞 Support

### API-Football Resources
- **Documentation:** https://www.api-football.com/documentation-v3
- **Status Page:** https://status.api-football.com/
- **Support:** support@api-football.com

### Common API Endpoints
```
Fixtures: /fixtures
Standings: /standings
Teams: /teams
Players: /players
Statistics: /fixtures/statistics
Events: /fixtures/events
```

---

## ✅ Quick Checklist

### Before Going Live:
- [ ] API key configured in `.env.local`
- [ ] Test with real match fixture ID
- [ ] Verify live score display works
- [ ] Test fallback to manual scores
- [ ] Check mobile responsiveness
- [ ] Monitor API rate limits
- [ ] Train admin on status management
- [ ] Have backup plan for API failures

---

## 🎉 Conclusion

Your prediction system now supports:
- ✅ **Real-time live scores** from API-Football
- ✅ **Automatic updates** every 30 seconds
- ✅ **Match events** display (goals, cards)
- ✅ **Fallback system** for reliability
- ✅ **Mobile-optimized** live score view
- ✅ **Admin-friendly** fixture ID management

**Users will see live, real-time match scores when they visit `/prediction` after the match has started!** ⚽🔴

---

**Version:** 3.0 - Live Score Integration  
**Date:** October 26, 2024  
**Status:** ✅ Production Ready
