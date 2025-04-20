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

  const [recipes, setRecipes]       = useState([])
  const [selected, setSelected]     = useState(null)
  const [editMode, setEditMode]     = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftIngredients, setDraftIngredients] = useState([])
  const [draftSteps, setDraftSteps] = useState([])
  const [draftNotes, setDraftNotes] = useState('')

  useEffect(() => {
    const unsub = onSnapshot(colRef, snap =>
      setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    return unsub
  }, [])

  const openOverlay = r => {
    setSelected(r)
    setEditMode(false)
    setDraftTitle(r.title)
    setDraftIngredients([... (r.ingredients || [])])
    setDraftSteps([ ... (r.steps || [])])
    setDraftNotes(r.notes || '')
  }

  const saveAll = async () => {
    const docRef = doc(db, 'families', FAMILY_ID, 'recipes', selected.id)
    await updateDoc(docRef, {
      title:       draftTitle,
      ingredients: draftIngredients,
      steps:       draftSteps,
      notes:       draftNotes
    })
    // recharger l’objet sélectionné pour refléter evt. changement
    setSelected(prev => ({
      ...prev,
      title:       draftTitle,
      ingredients: draftIngredients,
      steps:       draftSteps,
      notes:       draftNotes
    }))
    setEditMode(false)
  }

  // helpers pour modifier les listes
  const setIngredient = (idx, value) => {
    const arr = [...draftIngredients]
    arr[idx] = value
    setDraftIngredients(arr)
  }
  const removeIngredient = idx => {
    setDraftIngredients(ing => ing.filter((_, i) => i !== idx))
  }
  const addIngredient = () => {
    setDraftIngredients(ing => [...ing, ''])
  }

  const setStep = (idx, value) => {
    const arr = [...draftSteps]
    arr[idx] = value
    setDraftSteps(arr)
  }
  const removeStep = idx => {
    setDraftSteps(st => st.filter((_, i) => i !== idx))
  }
  const addStep = () => {
    setDraftSteps(st => [...st, ''])
  }

  return (
    <div className="card-container">
      <div className="card-header">
        <h2>Recettes</h2>
        <button onClick={async () => {
          const title = prompt('Titre de la nouvelle recette ?')
          if (title) {
            await addDoc(colRef, { title, ingredients: [], steps: [], notes: '' })
          }
        }} className="btn-add">➕ Nouvelle recette</button>
      </div>

      <div className="cards-grid">
        {recipes.map(r => (
          <div key={r.id} className="card" onClick={() => openOverlay(r)}>
            <h3 className="card-title">{r.title}</h3>
            <div className="card-content">
              {r.description || '— pas de description —'}
            </div>
          </div>
        ))}
        {recipes.length === 0 && <p>Aucune recette pour l'instant.</p>}
      </div>

      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="overlay-content" onClick={e => e.stopPropagation()}>
            <button className="btn-close" onClick={() => setSelected(null)}>✖</button>

            {/* TITRE */}
            {editMode
              ? <input
                  className="overlay-input-title"
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                />
              : <h2 className="overlay-title">{selected.title}</h2>
            }

            {/* INGREDIENTS */}
            <section className="section">
              <h3>Ingrédients</h3>
              {editMode
                ? (
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
                )
                : (selected.ingredients?.length > 0
                    ? <ul>
                        {selected.ingredients.map((ing,i) => <li key={i}>{ing}</li>)}
                      </ul>
                    : <p>— aucun ingrédient —</p>
                  )
              }
            </section>

            {/* ETAPES */}
            <section className="section">
              <h3>Préparation</h3>
              {editMode
                ? (
                  <>
                    {draftSteps.map((step, i) => (
                      <div key={i} className="list-edit-row">
                        <input
                          value={step}
                          onChange={e => setStep(i, e.target.value)}
                          placeholder={`Étape ${i+1}…`}
                        />
                        <button onClick={() => removeStep(i)}>🗑️</button>
                      </div>
                    ))}
                    <button className="btn-small" onClick={addStep}>
                      ➕ Ajouter une étape
                    </button>
                  </>
                )
                : (selected.steps?.length > 0
                    ? <ol>
                        {selected.steps.map((st,i) => <li key={i}>{st}</li>)}
                      </ol>
                    : <p>— pas d'étapes —</p>
                  )
              }
            </section>

            {/* NOTES */}
            <section className="section">
              <h3>Notes</h3>
              {editMode
                ? <textarea
                    className="overlay-textarea"
                    value={draftNotes}
                    onChange={e => setDraftNotes(e.target.value)}
                    placeholder="Notes…"
                  />
                : <p>{selected.notes || '— aucune note —'}</p>
              }
            </section>

            {/* PIED D’OVERLAY */}
            <div className="overlay-footer">
              {editMode
                ? <button className="btn-save" onClick={saveAll}>
                    💾 Sauvegarder
                  </button>
                : <button className="btn-modify" onClick={() => setEditMode(true)}>
                    ✏️ Modifier
                  </button>
              }
              {!editMode && (
                <button
                  className="btn-delete"
                  onClick={async () => {
                    if (confirm("Supprimer cette recette ?")) {
                      await deleteDoc(doc(db, 'families', FAMILY_ID, 'recipes', selected.id))
                      setSelected(null)
                    }
                  }}
                >🗑️ Supprimer</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
