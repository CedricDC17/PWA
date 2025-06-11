// src/FamilyContext.jsx
import { createContext, useEffect, useState } from 'react'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  setDoc
} from 'firebase/firestore'
import { auth, db } from './firebase'

const DEFAULT_FAMILY_ID = 'sharedFamily'

export const FamilyCtx = createContext({
  user: null,
  familyId: null,
  logout: () => {}
})

export function FamilyProvider({ children }) {
  const [user, setUser] = useState(null)
  const [familyId, setFamilyId] = useState(() => localStorage.getItem('familyId') || '')
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')

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

  const login = id => {
    const value = id.trim()
    if (!value) return
    localStorage.setItem('familyId', value)
    setFamilyId(value)
  }

  const createFamily = async id => {
    const value = id.trim()
    if (!value) return
    const subCols = ['shoppingItems', 'mealPlans', 'recipes']
    for (const sub of subCols) {
      const snap = await getDocs(collection(db, 'families', DEFAULT_FAMILY_ID, sub))
      await Promise.all(
        snap.docs.map(docSnap =>
          setDoc(doc(db, 'families', value, sub, docSnap.id), docSnap.data())
        )
      )
    }
    localStorage.setItem('familyId', value)
    setFamilyId(value)
  }

  const logout = () => {
    localStorage.removeItem('familyId')
    setFamilyId('')
  }

  if (!familyId) {
    return (
      <div className="login-screen">
        <form onSubmit={e => { e.preventDefault(); login(draft) }}>
          <h2>Connexion famille</h2>
          <input
            type="text"
            placeholder="Identifiant famille"
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <button type="submit">Entrer</button>
          <button
            type="button"
            onClick={() => {
              const id = prompt('Nouvel identifiant famille ?')
              if (id) createFamily(id)
            }}
          >
            Créer une famille
          </button>
        </form>
      </div>
    )
  }

  return (
    <FamilyCtx.Provider value={{ user, familyId, logout }}>
      {children}
    </FamilyCtx.Provider>
  )
}
