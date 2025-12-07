# AFCON 2025 - Quick Start Guide

Get your AFCON 2025 site running in **15 minutes**! ⚽

## ⚡ Quick Setup (5 Steps)

### 1️⃣ Install Dependencies

```bash
npm install
npm install -g firebase-tools
```

### 2️⃣ Configure Firebase

```bash
# Login to Firebase
firebase login

# Update src/firebase/config.js with your Firebase project credentials
# Get them from: Firebase Console → Project Settings → Your apps → Web
```

### 3️⃣ Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

### 4️⃣ Seed Sample Data

```bash
node seed-data/seed.js
```

### 5️⃣ Create Admin User

```bash
# In Firebase Console, create a user under Authentication
# Then run:
node scripts/setAdminRole.js admin@example.com admin
```

## 🚀 Run Locally

```bash
npm run dev
```

**Visit:**
- Public: http://localhost:3000/afcon25
- Admin: http://localhost:3000/admin/afcon25

## 📦 What You Get

✅ 8 sample teams with flags  
✅ 6 matches (scheduled, live, finished)  
✅ 2 YouTube highlights  
✅ Real-time live ticker  
✅ Auto-calculated standings  
✅ Full admin dashboard  
✅ Mobile-responsive design  
✅ Dark mode support  

## 🎯 Next Steps

1. **Customize teams** - Edit `seed-data/teams.json`
2. **Add real matches** - Use admin dashboard at `/admin/afcon25/matches`
3. **Deploy Functions** - `firebase deploy --only functions`
4. **Go live** - Deploy to Vercel or Firebase Hosting

## 📖 Full Documentation

See `AFCON25_README.md` for complete setup, Cloud Functions, API integration, and advanced features.

## 🆘 Need Help?

**Common Issues:**

**"Permission denied"** → Deploy Firestore rules: `firebase deploy --only firestore:rules`

**"Admin can't access dashboard"** → Set custom claims: `node scripts/setAdminRole.js <email> admin`

**"Real-time not working"** → Check Firebase config in `src/firebase/config.js`

**"Functions error"** → Verify Node.js 18+: `node --version`

## 🎉 You're Ready!

Your AFCON 2025 platform is set up. Start adding matches and enjoy real-time updates!

**Happy building! ⚽🏆**

