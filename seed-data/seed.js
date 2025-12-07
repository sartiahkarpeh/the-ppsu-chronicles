/**
 * Seed script for AFCON 2025 Firestore data
 * Run with: node seed-data/seed.js
 * 
 * Prerequisites:
 * 1. Install dependencies: npm install firebase-admin
 * 2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 *    export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Main seed function
 */
async function seedDatabase() {
  console.log('🌱 Starting AFCON 2025 database seed...\n');

  try {
    // Seed teams
    await seedCollection('teams', 'teams.json');
    
    // Seed matches
    await seedCollection('matches', 'matches.json');
    
    // Seed highlights
    await seedCollection('highlights', 'highlights.json');
    
    // Add sample match events for live match
    await seedMatchEvents();
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Teams seeded from teams.json');
    console.log('   - Matches seeded from matches.json');
    console.log('   - Highlights seeded from highlights.json');
    console.log('   - Sample events added to live match');
    console.log('\n🚀 Your AFCON 2025 site is ready!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

/**
 * Seed a collection from JSON file
 */
async function seedCollection(collectionName, fileName) {
  console.log(`📝 Seeding ${collectionName}...`);
  
  const filePath = path.join(__dirname, fileName);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const batch = db.batch();
  let count = 0;
  
  for (const item of data) {
    const docId = item.id;
    delete item.id; // Remove id from document data
    
    const docRef = db.collection(collectionName).doc(docId);
    batch.set(docRef, {
      ...item,
      updatedAt: Date.now()
    });
    count++;
  }
  
  await batch.commit();
  console.log(`   ✓ Added ${count} documents to ${collectionName}`);
}

/**
 * Add sample match events for the live demo match
 */
async function seedMatchEvents() {
  console.log(`📝 Seeding match events...`);
  
  const events = [
    {
      minute: 12,
      type: 'goal',
      teamId: 't_senegal',
      playerName: 'S. Mane',
      description: 'Header from corner',
      createdBy: 'seed_script',
      createdAt: Date.now()
    },
    {
      minute: 23,
      type: 'yellow',
      teamId: 't_nigeria',
      playerName: 'V. Osimhen',
      description: 'Foul on the edge of the box',
      createdBy: 'seed_script',
      createdAt: Date.now()
    },
    {
      minute: 34,
      type: 'goal',
      teamId: 't_nigeria',
      playerName: 'V. Osimhen',
      description: 'Penalty kick',
      createdBy: 'seed_script',
      createdAt: Date.now()
    },
    {
      minute: 56,
      type: 'goal',
      teamId: 't_senegal',
      playerName: 'I. Sarr',
      description: 'Counter-attack finish',
      createdBy: 'seed_script',
      createdAt: Date.now()
    }
  ];
  
  const batch = db.batch();
  
  for (const event of events) {
    const docRef = db.collection('matches').doc('m_demo_live').collection('events').doc();
    batch.set(docRef, event);
  }
  
  await batch.commit();
  console.log(`   ✓ Added ${events.length} events to live match`);
}

// Run the seed script
seedDatabase();

