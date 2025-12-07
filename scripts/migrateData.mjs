/**
 * ONE-TIME MIGRATION SCRIPT (ESM Version)
 * --------------------------
 * This script reads data from your local .js files and uploads it to Firestore.
 *
 * TO RUN THIS SCRIPT:
 * 1.  Ensure your data files in `src/data` use the original `export const` syntax.
 * 2.  Ensure you have the `serviceAccountKey.json` file in your project root.
 * 3.  Run `npm install firebase-admin` in your terminal if you haven't already.
 * 4.  Run this file from your project root using `node scripts/migrateData.mjs`.
 */

// Import Firebase Admin SDK and your local data files using modern ESM 'import' syntax
import admin from 'firebase-admin';
import { createRequire } from 'module';
import { posts } from '../src/data/posts.js';
import { clubs } from '../src/data/clubs.js';
import { events } from '../src/data/events.js';
import { spotlights } from '../src/data/spotlights.js';
import { upcomingEvents } from '../src/data/upcomingEvents.js';
import { media } from '../src/data/media.js';

// Create a 'require' function to load the JSON file, which is more compatible across Node versions.
const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');


// Initialize the Firebase Admin App
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Get a reference to the Firestore database
const db = admin.firestore();

/**
 * A generic function to upload an array of data to a specific Firestore collection.
 * @param {string} collectionName The name of the collection to upload to.
 * @param {Array<Object>} dataArray The array of data to upload.
 */
const uploadCollection = async (collectionName, dataArray) => {
  if (!dataArray || dataArray.length === 0) {
    console.log(`Skipping "${collectionName}" as it has no data.`);
    return;
  }

  console.log(`Starting upload to "${collectionName}"...`);
  const collectionRef = db.collection(collectionName);
  
  // Use a batch write for efficiency
  const batch = db.batch();

  dataArray.forEach((item) => {
    // Let Firestore auto-generate the document ID
    const docRef = collectionRef.doc(); 
    batch.set(docRef, item);
  });
  
  // Commit the batch
  await batch.commit();
  
  console.log(`✅ Successfully uploaded ${dataArray.length} documents to "${collectionName}".`);
};

// Main function to run all the uploads
const migrateData = async () => {
  try {
    console.log('Starting data migration with ESM script...');
    
    // An array of all migration tasks
    const allUploads = [
      uploadCollection('posts', posts),
      uploadCollection('clubs', clubs),
      uploadCollection('events', events),
      uploadCollection('spotlights', spotlights),
      uploadCollection('upcomingEvents', upcomingEvents),
      // CORRECTED: The 'media' import is an object, so we upload the arrays inside it.
      uploadCollection('media_videos', media.videos),
      uploadCollection('media_gallery', media.gallery)
    ];

    // Wait for all uploads to complete
    await Promise.all(allUploads);
    
    console.log('\n🎉 All data has been successfully migrated to Firestore!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

// Run the migration
migrateData();
