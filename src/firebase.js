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
}
console.log("🔑 Firebase Config:", {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
})

console.log("🔑 Firebase Config:", firebaseConfig);

// 1. Initialise l’app Firebase
const app = initializeApp(firebaseConfig)

// 2. Exporte l’auth et la DB
export const auth = getAuth(app)
export const db = getFirestore(app)

// 3. Active le cache offline
enableIndexedDbPersistence(db).catch(err => {
    console.warn("IndexedDB persistence failed:", err)
})
