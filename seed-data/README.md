# AFCON 2025 - Seed Data

This directory contains sample data to populate your Firestore database for testing and development.

## Files

- `teams.json` - Sample teams with flags and colors
- `matches.json` - Sample fixtures including scheduled, live, and finished matches
- `highlights.json` - Sample YouTube highlight videos
- `seed.js` - Node.js script to import all data into Firestore

## Usage

### 1. Install Dependencies

```bash
npm install firebase-admin
```

### 2. Set Up Service Account

Make sure you have `serviceAccountKey.json` in the project root. If not:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `serviceAccountKey.json` in project root

### 3. Run Seed Script

```bash
# From project root
node seed-data/seed.js
```

### 4. Verify in Firebase Console

Go to Firestore Database in Firebase Console and verify:
- `teams` collection has 8 teams
- `matches` collection has 6 matches
- `highlights` collection has 2 highlights
- `matches/m_demo_live/events` subcollection has events

## Sample Data Details

### Teams (8)
- Senegal, Egypt, Nigeria, Cameroon, Ghana, Morocco, Algeria, Ivory Coast

### Matches (6)
- 4 scheduled matches (Group A & B)
- 1 live match (Senegal vs Nigeria)
- 1 finished match (Morocco vs Ghana)

### Match Events
- The live match has 4 sample events (goals, cards)

## Customization

Edit the JSON files to customize:
- Team names and colors
- Match fixtures and times
- YouTube video IDs for highlights

## Notes

- All timestamps use UTC timezone
- Team IDs use format: `t_<country>`
- Match IDs use format: `m_<number>` or `m_demo_<status>`
- YouTube IDs in sample data are placeholders - replace with real video IDs

