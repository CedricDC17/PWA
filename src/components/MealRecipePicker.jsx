// src/components/MealRecipePicker.jsx
import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import { PenLine } from 'lucide-react'
import { normalizeName } from '../utils/normalize'

const FAMILY_ID = 'sharedFamily'

/**
 * Choix du repas d'un créneau : une recette de la base, ou — si rien ne
 * correspond à ce qui est tapé — un « repas libre » (simple étiquette, sans
 * fiche ni étape ingrédients).
 */
export default function MealRecipePicker({ day, time, onSelect, onSelectFree, onClose }) {
  const [recipes, setRecipes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const colRef = collection(db, 'families', FAMILY_ID, 'recipes')
    return onSnapshot(query(colRef, orderBy('title')), snap =>
      setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  const term = searchTerm.trim()
  const filtered = useMemo(() => {
    const key = normalizeName(term)
    if (!key) return recipes
    return recipes.filter(r => normalizeName(r.title || '').includes(key))
  }, [recipes, term])

  // Proposé dès qu'on tape quelque chose qui n'est pas déjà un titre exact
  const canUseFree =
    term.length > 0 &&
    !recipes.some(r => normalizeName(r.title || '') === normalizeName(term))

  return (
    <div
      className="overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="overlay-content" onClick={e => e.stopPropagation()}>
        <button className="btn-close" onClick={onClose}>✖</button>
        <h2 className="overlay-title">{time} — {day}</h2>

        <input
          type="search"
          className="search-input"
          placeholder="Chercher une recette ou taper un repas…"
          autoFocus
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && canUseFree) onSelectFree(term)
          }}
        />

        {canUseFree && (
          <button className="free-meal-option" onClick={() => onSelectFree(term)}>
            <PenLine size={18} />
            <span>
              Utiliser <strong>« {term} »</strong> comme repas libre
            </span>
          </button>
        )}

        <div className="recipe-picker-list">
          {filtered.length === 0 && !canUseFree && (
            <p className="recipe-picker-empty">
              Aucune recette. Tape un nom pour l'ajouter comme repas libre.
            </p>
          )}
          {filtered.map(r => (
            <div key={r.id} className="recipe-picker-item" onClick={() => onSelect(r)}>
              {r.imageUrl && <img src={r.imageUrl} alt="" />}
              <span>{r.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
