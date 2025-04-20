// src/FamilyContext.jsx
import { createContext, useEffect, useState } from 'react'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'  // votre getAuth(app)

export const FamilyCtx = createContext(null)

export function FamilyProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Lancer la connexion anonyme à chaque chargement
    signInAnonymously(auth)
      .catch(console.error)
      .finally(() => {
        // Même si l’appel échoue, on poursuit pour capter onAuthStateChanged
        setLoading(false)
      })

    // Puis on attend le callback de l’auth
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  if (loading) {
    return <div>🔄 Chargement…</div>
  }

  return (
    <FamilyCtx.Provider value={user}>
      {children}
    </FamilyCtx.Provider>
  )
}
