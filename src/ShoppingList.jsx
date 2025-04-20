// src/ShoppingList.jsx
import { useEffect, useState, useRef } from 'react'
import {
  collection, query, orderBy,
  onSnapshot, addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { db, auth } from './firebase'    // IMPORT de auth

export default function ShoppingList() {
  const INPUT_ID = 'sharedFamily'
  const [items, setItems] = useState([])
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState(1)
  const nameInputRef = useRef(null)

  useEffect(() => {
    // 1) on monte l’auth anonyme
    signInAnonymously(auth).catch(err =>
      console.error("Auth anonyme impossible :", err)
    )

    let unsubscribeSnapshot = null
    // 2) dès que l’utilisateur est authentifié, on subscribe Firestore
    const unsubAuth = onAuthStateChanged(auth, user => {
      if (!user) return
      const col = collection(db, 'families', INPUT_ID, 'shoppingItems')
      const q = query(col, orderBy('createdAt'))
      unsubscribeSnapshot = onSnapshot(
        q,
        snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => console.error("Erreur snapshot :", err)
      )
    })

    // 3) cleanup
    return () => {
      unsubAuth()
      unsubscribeSnapshot?.()
    }
  }, [])

  const addItem = async () => {
    const name = newName.trim()
    if (!name) return
    const col = collection(db, 'families', INPUT_ID, 'shoppingItems')
    await addDoc(col, {
      name,
      quantity: newQty,
      checked: false,
      createdAt: Date.now()
    })
    setNewName('')
    setNewQty(1)
    nameInputRef.current?.focus()
  }

  const handleSubmit = e => {
    e.preventDefault()
    addItem()
  }

  const toggle = item =>
    updateDoc(
      doc(db, 'families', INPUT_ID, 'shoppingItems', item.id),
      { checked: !item.checked }
    )

  const clearSelected = async () => {
    const colPath = (id) => doc(db, 'families', INPUT_ID, 'shoppingItems', id)
    const toDelete = items.filter(i => i.checked)
    await Promise.all(toDelete.map(i => deleteDoc(colPath(i.id))))
  }

  const clearAll = async () => {
    const colPath = (id) => doc(db, 'families', INPUT_ID, 'shoppingItems', id)
    await Promise.all(items.map(i => deleteDoc(colPath(i.id))))
  }

  return (
    <>
      <ul className="shopping-items">
        {items.map(i => (
          <li key={i.id}>
            <label>
              <input
                type="checkbox"
                checked={i.checked}
                onChange={() => toggle(i)}
              />
              <span className={i.checked ? 'checked' : ''}>
                {i.name} × {i.quantity}
              </span>
            </label>
            <button onClick={() => deleteDoc(doc(col, i.id))}>
              🗑️
            </button>
          </li>
        ))}
      </ul>

      {/* On transforme en form pour capter Enter sur mobile */}
      <form onSubmit={handleSubmit} className="shopping-form">
        <input
          ref={nameInputRef}
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Ajouter un article…"
        />
        <select
          value={newQty}
          onChange={e => setNewQty(+e.target.value)}
        >
          {[...Array(20)].map((_, i) =>
            <option key={i} value={i + 1}>{i + 1}</option>
          )}
        </select>
        <button type="submit">➕</button>
      </form>

      <div className="shopping-actions">
        <button onClick={clearSelected}>
          Effacer sélectionnés
        </button>
        <button onClick={clearAll}>
          Effacer la liste
        </button>
      </div>
    </>
  )
}
