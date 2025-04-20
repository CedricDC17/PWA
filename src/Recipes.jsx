// src/Recipes.jsx
import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore'
import { db } from './firebase'
import './Recipes.css'

export default function Recipes() {
  const FAMILY_ID = 'sharedFamily'
  const colRef = collection(db, 'families', FAMILY_ID, 'recipes')

  const [recipes, setRecipes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftIngredients, setDraftIngredients] = useState([])
  const [draftSteps, setDraftSteps] = useState([])
  const [draftNotes, setDraftNotes] = useState('')

  // Chargement en temps réel
  useEffect(() => {
    const unsub = onSnapshot(colRef, snap =>
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

  const filtered = recipes.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function openOverlay(r) {
    setSelected(r)
    setEditMode(false)
    setDraftTitle(r.title)
    setDraftIngredients([...(r.ingredients || [])])
    setDraftSteps([...(r.steps || [])])
    setDraftNotes(r.notes || '')
  }

  async function saveAll() {
    const ref = doc(db, 'families', FAMILY_ID, 'recipes', selected.id)
    await updateDoc(ref, {
      title: draftTitle,
      ingredients: draftIngredients,
      steps: draftSteps,
      notes: draftNotes
    })
    setSelected(prev => ({
      ...prev,
      title: draftTitle,
      ingredients: draftIngredients,
      steps: draftSteps,
      notes: draftNotes
    }))
    setEditMode(false)
  }

  // Helpers ingrédients / étapes
  const setIngredient = (i, v) => {
    const arr = [...draftIngredients]; arr[i] = v; setDraftIngredients(arr)
  }
  const removeIngredient = i => setDraftIngredients(arr => arr.filter((_, j) => i !== j))
  const addIngredient = () => setDraftIngredients(arr => [...arr, ''])

  const setStep = (i, v) => {
    const arr = [...draftSteps]; arr[i] = v; setDraftSteps(arr)
  }
  const removeStep = i => setDraftSteps(arr => arr.filter((_, j) => i !== j))
  const addStep = () => setDraftSteps(arr => [...arr, ''])

  return (
    <div className="card-container">
      <div className="card-header">
        <h2>Recettes</h2>

        {/* Recherche */}
        <input
          type="search"
          className="search-input"
          placeholder="Rechercher…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        {/* Nouveau */}
        <button
          className="btn-add"
          onClick={async () => {
            const title = prompt('Titre de la nouvelle recette ?')
            if (title) {
              await addDoc(colRef, { title, ingredients: [], steps: [], notes: '' })
            }
          }}
        >
          ➕
        </button>
      </div>

      <div className="cards-grid">
        {filtered.map(r => (
          <div key={r.id} className="card" onClick={() => openOverlay(r)}>
            <h3 className="card-title">{r.title}</h3>
          </div>
        ))}
        {filtered.length === 0 && <p>Aucune recette trouvée.</p>}
      </div>

      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="overlay-content" onClick={e => e.stopPropagation()}>
            <button className="btn-close" onClick={() => setSelected(null)}>
              ✖
            </button>

            {/* TITRE */}
            {editMode ? (
              <input
                className="overlay-input-title"
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
              />
            ) : (
              <h2 className="overlay-title">{selected.title}</h2>
            )}

            {/* INGRÉDIENTS */}
            <section className="section">
              <h3>Ingrédients</h3>
              {editMode ? (
                <>
                  {draftIngredients.map((ing, i) => (
                    <div key={i} className="list-edit-row">
                      <input
                        value={ing}
                        onChange={e => setIngredient(i, e.target.value)}
                        placeholder="Ingrédient…"
                      />
                      <button onClick={() => removeIngredient(i)}>🗑️</button>
                    </div>
                  ))}
                  <button className="btn-small" onClick={addIngredient}>
                    ➕ Ajouter un ingrédient
                  </button>
                </>
              ) : selected.ingredients?.length > 0 ? (
                <ul>
                  {selected.ingredients.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
              ) : (
                <p>— aucun ingrédient —</p>
              )}
            </section>

            {/* ÉTAPES */}
            <section className="section">
              <h3>Préparation</h3>
              {editMode ? (
                <>
                  {draftSteps.map((step, i) => (
                    <div key={i} className="list-edit-row">
                      <input
                        value={step}
                        onChange={e => setStep(i, e.target.value)}
                        placeholder={`Étape ${i + 1}…`}
                      />
                      <button onClick={() => removeStep(i)}>🗑️</button>
                    </div>
                  ))}
                  <button className="btn-small" onClick={addStep}>
                    ➕ Ajouter une étape
                  </button>
                </>
              ) : selected.steps?.length > 0 ? (
                <ol>
                  {selected.steps.map((st, i) => (
                    <li key={i}>{st}</li>
                  ))}
                </ol>
              ) : (
                <p>— pas d'étapes —</p>
              )}
            </section>

            {/* NOTES */}
            <section className="section">
              <h3>Notes</h3>
              {editMode ? (
                <textarea
                  className="overlay-textarea"
                  value={draftNotes}
                  onChange={e => setDraftNotes(e.target.value)}
                  placeholder="Notes…"
                />
              ) : (
                <p>{selected.notes || '— aucune note —'}</p>
              )}
            </section>

            {/* BOUTONS */}
            <div className="overlay-footer">
              {editMode ? (
                <button className="btn-save" onClick={saveAll}>
                  💾 Sauvegarder
                </button>
              ) : (
                <button className="btn-modify" onClick={() => setEditMode(true)}>
                  ✏️ Modifier
                </button>
              )}
              {!editMode && (
                <button
                  className="btn-delete"
                  onClick={async () => {
                    if (confirm('Supprimer cette recette ?')) {
                      await deleteDoc(
                        doc(db, 'families', FAMILY_ID, 'recipes', selected.id)
                      )
                      setSelected(null)
                    }
                  }}
                >
                  🗑️ Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
