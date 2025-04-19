// src/firebase.js
import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "...", authDomain: "...", projectId: "...",
  storageBucket: "...", messagingSenderId: "...", appId: "..."
}

// 1. Initialise l’app Firebase
const app = initializeApp(firebaseConfig)

// 2. Exporte l’auth et la DB
export const auth = getAuth(app)
export const db   = getFirestore(app)

// 3. Active le cache offline
enableIndexedDbPersistence(db).catch(err => {
  console.warn("IndexedDB persistence failed:", err)
})
