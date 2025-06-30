// src/firebase/config.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// IMPORTANT: Replace this with your own Firebase configuration
// You can find this in your Firebase project settings
const firebaseConfig = {
  apiKey: "AIzaSyAYFXsaJa2GHN5PLSXxBAvlsLRSCdyQRsg",
  authDomain: "the-ppsu-chronciles.firebaseapp.com",
  projectId: "the-ppsu-chronciles",
  storageBucket: "the-ppsu-chronciles.firebasestorage.app",
  messagingSenderId: "366446192944",
  appId: "1:366446192944:web:527058441fdd311b6d00f5",
  measurementId: "G-GP8NYJK8YW"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

