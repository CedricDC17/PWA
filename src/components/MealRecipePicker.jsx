import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

export default function MealRecipePicker({ day, time, onSelect, onClose }) {
  const FAMILY_ID = 'sharedFamily'
  const [recipes, setRecipes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const colRef = collection(db, 'families', FAMILY_ID, 'recipes')
    const q = query(colRef, orderBy('title'))
    return onSnapshot(q, snap =>
      setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  const filtered = recipes.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div
      className="overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="overlay-content" onClick={e => e.stopPropagation()}>
        <button className="btn-close" onClick={onClose}>✖</button>
        <h2 className="overlay-title">{time} — {day}</h2>
        <input
          type="search"
          className="search-input"
          placeholder="Chercher une recette…"
          autoFocus
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        <div className="recipe-picker-list">
          {filtered.length === 0 && (
            <p className="recipe-picker-empty">
              Aucune recette trouvée. Ajoute-la d'abord dans l'onglet Recettes.
            </p>
          )}
          {filtered.map(r => (
            <div
              key={r.id}
              className="recipe-picker-item"
              onClick={() => onSelect(r)}
            >
              {r.imageUrl && <img src={r.imageUrl} alt="" />}
              <span>{r.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
