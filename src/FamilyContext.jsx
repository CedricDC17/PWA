import { createContext, useState, useEffect } from 'react'
import { auth } from './firebase'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'

export const FamilyCtx = createContext()

export function FamilyProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // 1. Connexion anonyme
    signInAnonymously(auth)
    // 2. Mise à jour du user
    const unsub = onAuthStateChanged(auth, u => setUser(u))
    return unsub
  }, [])

  // 3. Tant que user n’existe pas, on affiche “Connexion…”
  if (!user) return <div>Connexion…</div>

  // 4. Sinon on fournit le user (UID) aux enfants
  return (
    <FamilyCtx.Provider value={user}>
      {children}
    </FamilyCtx.Provider>
  )
}
