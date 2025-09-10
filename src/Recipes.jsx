// src/Recipes.jsx
import React, { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  addDoc
} from 'firebase/firestore'
import { db } from './firebase'
import { query, orderBy } from 'firebase/firestore'
import './Recipes.css'
import RecipeCard from './components/RecipeCard'
import RecipeOverlay from './components/RecipeOverlay'

export default function Recipes() {
  const FAMILY_ID = 'sharedFamily'
  const colRef = collection(db, 'families', FAMILY_ID, 'recipes')
  const q      = query(colRef, orderBy('title'))     // tri alphabétique par titre

  const [recipes, setRecipes]       = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected]     = useState(null)
  const [pasteMode, setPasteMode]   = useState(false)
  const [pasteText, setPasteText]   = useState('')

  // real‑time load
  useEffect(() => {
    const unsub = onSnapshot(q, snap =>
      setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    return unsub
  }, [])

  // Classe CSS pour ajuster le layout à la page "recettes"
  useEffect(() => {
    document.body.classList.add('recipes-page')
    return () => {
      document.body.classList.remove('recipes-page')
    }
  }, [])

  // search‐filtered list
  const filtered = recipes.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // open overlay
  function openOverlay(r) {
    setSelected(r)
  }

  // add new recipe
  async function addRecipe() {
    const title = prompt('Titre de la nouvelle recette ?')
    if (!title) return
    await addDoc(colRef, {
      title,
      ingredients: [],
      steps: [],
      notes: '',
      imageUrl: ''
    })
  }

  function parseRecipe(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l)
    const recipe = { title: '', ingredients: [], steps: [], notes: '', imageUrl: '' }
    if (!lines.length) return recipe

    const firstLine = lines.shift()
    const titleMatch = firstLine.match(/^(.*)\s*\(([^)]+)\)\s*$/)
    if (titleMatch) {
      recipe.title = titleMatch[1].trim()
      recipe.notes = titleMatch[2].trim()
    } else {
      recipe.title = firstLine.trim()
    }

    const ingIndex = lines.findIndex(l => /^ingr[eé]dients?:?$/i.test(l))
    const stepIndex = lines.findIndex(l => /^étapes?:?$/i.test(l) || /^etapes?:?$/i.test(l))

    if (ingIndex !== -1) {
      const ingredientsLine = lines[ingIndex + 1] || ''
      recipe.ingredients = ingredientsLine
        .split('·')
        .map(part => {
          const item = part.trim()
          if (!item) return null
          const m = item.match(/^(\d+(?:[.,]\d+)?(?:\s*\w+)?)(.*)$/)
          if (m) {
            return { quantity: m[1].trim(), name: m[2].trim() }
          }
          return { quantity: '', name: item }
        })
        .filter(Boolean)
    }

    if (stepIndex !== -1) {
      const stepLines = lines.slice(stepIndex + 1)
      recipe.steps = stepLines.filter(Boolean)
    }

    return recipe
  }

  function openPasteOverlay() {
    setPasteText('')
    setPasteMode(true)
  }

  async function importFromText() {
    const rec = parseRecipe(pasteText)
    if (!rec.title) { alert('Titre manquant'); return }
    const docRef = await addDoc(colRef, { ...rec, imageUrl: '' })
    setPasteMode(false)
    setPasteText('')
    setSelected({ id: docRef.id, ...rec, imageUrl: '' })
  }

  return (
    <div className="card-container">
      {/* header with search + add */}
      <div className="card-header">
        <h2>Recettes</h2>
        <input
          type="search"
          className="search-input"
          placeholder="Rechercher…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button className="btn-add" onClick={addRecipe}>➕</button>
        <button className="btn-add" onClick={openPasteOverlay}>📋</button>
      </div>

      {/* cards grid */}
      <div className="cards-grid">
        {filtered.length === 0 && <p>Aucune recette trouvée.</p>}
        {filtered.map(r => (
          <RecipeCard key={r.id} recipe={r} onSelect={openOverlay} />
        ))}
      </div>

      {/* overlay */}
      {selected && (
        <RecipeOverlay
          recipe={selected}
          onClose={() => setSelected(null)}
          onSave={setSelected}
        />
      )}

      {pasteMode && (
        <div
          className="overlay"
          onClick={e => {
            if (e.target === e.currentTarget) setPasteMode(false)
          }}
        >
          <div className="overlay-content" onClick={e => e.stopPropagation()}>
            <button className="btn-close" onClick={() => setPasteMode(false)}>✖</button>
            <h2 className="overlay-title">Importer une recette</h2>
            <textarea
              className="overlay-textarea"
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={`Nom de la recette (X portions)\nINGRÉDIENTS:\nIngrédient 1 · Ingrédient 2\nÉTAPES:\nÉtape 1\nÉtape 2`}
            />
            <div className="overlay-footer">
              <button className="btn-save" onClick={importFromText}>💾 Importer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
