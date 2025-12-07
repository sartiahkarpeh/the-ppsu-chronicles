// src/firebase/config.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Firebase configuration
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
let app: FirebaseApp;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
