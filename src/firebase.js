// src/firebase.js
import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'





const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log(
    "🔍 Dev Firebase Config:",
    JSON.stringify({
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    })
);


// 1. Initialise l’app Firebase
const app = initializeApp(firebaseConfig)

// 2. Exporte l’auth et la DB
export const auth = getAuth(app);

// Force l’anonymous sign‑in
signInAnonymously(auth).catch(err => {
    console.error("Impossible de s'authentifier anonymement :", err);
});

// Juste pour debug
onAuthStateChanged(auth, user => {
    console.log("Utilisateur Firebase connecté :", user?.uid);
});

// Pas de Firebase Storage : son activation exige un plan payant. Les photos de
// recettes sont enregistrées dans Firestore (voir src/utils/image.js).
export const db = getFirestore(app)

// 3. Active le cache offline
enableIndexedDbPersistence(db).catch(err => {
    console.warn("IndexedDB persistence failed:", err)
})
