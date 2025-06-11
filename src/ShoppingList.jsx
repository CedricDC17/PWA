import { useEffect, useState, useRef } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { db, auth } from './firebase'
import './ShoppingList.css'

export default function ShoppingList() {
  const FAMILY_ID = 'sharedFamily'
  const [items, setItems] = useState([])
  const [newItemName, setNewItemName] = useState('')
  const [editingFrequent, setEditingFrequent] = useState(false)
  const inputRef = useRef(null)

  // Anonymous auth + listen to Firestore
  useEffect(() => {
    signInAnonymously(auth).catch(console.error)
    let unsubSnapshot
    const unsubAuth = onAuthStateChanged(auth, user => {
      if (!user) return
      const col = collection(db, 'families', FAMILY_ID, 'shoppingItems')
      const q = query(col, orderBy('createdAt'))
      unsubSnapshot = onSnapshot(
        q,
        snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        console.error
      )
    })
    return () => {
      unsubAuth()
      unsubSnapshot?.()
    }
  }, [])

  // Categorize items
  const purchased = items
    .filter(i => i.checked)
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  const notPurchased = items
    .filter(i => !i.checked)
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  const favorites = notPurchased.filter(i => i.favored)
  const frequents = notPurchased.filter(i => !i.favored)

  // Add item (no quantity)
  const addItem = async () => {
    const name = newItemName.trim()
    if (!name) return
    await addDoc(
      collection(db, 'families', FAMILY_ID, 'shoppingItems'),
      {
        name,
        checked: false,
        favored: false,
        createdAt: Date.now()
      }
    )
    setNewItemName('')
    inputRef.current?.focus()
  }
  const onSubmit = e => {
    e.preventDefault()
    addItem()
  }

  // Toggle bought
  const toggleChecked = item =>
    updateDoc(
      doc(db, 'families', FAMILY_ID, 'shoppingItems', item.id),
      { checked: !item.checked }
    )

  // Remove from favorites
  const removeFavorite = item =>
    updateDoc(
      doc(db, 'families', FAMILY_ID, 'shoppingItems', item.id),
      { favored: false }
    )

  // Toggle favorite
  const toggleFavored = item =>
    updateDoc(
      doc(db, 'families', FAMILY_ID, 'shoppingItems', item.id),
      { favored: !item.favored }
    )

  // Delete item
  const removeItem = item =>
    deleteDoc(doc(db, 'families', FAMILY_ID, 'shoppingItems', item.id))

  return (
    <div className="shopping-container">
      <h2>Liste de courses</h2>

      {/* 1) Purchased Items */}
      <ul className="shopping-list">
        {purchased.map(item => (
          <li
            key={item.id}
            className="shopping-card"
            onClick={() => toggleChecked(item)}
          >
            <span>{item.name}</span>
            <input type="checkbox" checked readOnly />
          </li>
        ))}
      </ul>

      {/* 2) Add-Item Form */}
      <form className="shopping-form" onSubmit={onSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          placeholder="Nom de l’article"
        />
        <button type="submit">Ajouter</button>
      </form>

      {/* 3) Favorites Section */}
      <section className="favorite-section">
        <h3>Produits favoris</h3>
        {favorites.length === 0 && <p className="empty">Aucun favori</p>}
        <div className="favorite-list">
          {favorites.map(item => (
            <div key={item.id} className="freq-card">
              <span onClick={() => !editingFrequent && toggleChecked(item)}>
                {item.name}
              </span>
              {editingFrequent && (
                <button
                  className="btn-remove-fav"
                  onClick={e => {
                    e.stopPropagation()
                    removeFavorite(item)
                  }}
                  title="Retirer des favoris"
                >
                  ✖
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 4) Frequent Section */}
      <section className="frequent-section">
        <div className="frequent-header">
          <h3>Anciens produits</h3>
          <button onClick={() => setEditingFrequent(f => !f)}>
            {editingFrequent ? 'Terminé' : 'Modifier'}
          </button>
        </div>
        {frequents.length === 0 && <p className="empty">Aucun produit</p>}
        <div className="frequent-list">
          {frequents.map(item => (
            <div key={item.id} className="freq-card">
              <span
                className="freq-name"
                onClick={() => !editingFrequent && toggleChecked(item)}
              >
                {item.name}
              </span>
              {editingFrequent && (
                <div className="freq-actions">
                  <button
                    className={item.favored ? 'favored' : ''}
                    onClick={e => {
                      e.stopPropagation()
                      toggleFavored(item)
                    }}
                  >
                    ♥
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      removeItem(item)
                    }}
                  >
                    ✖
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
