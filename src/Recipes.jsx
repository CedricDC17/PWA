// src/Recipes.jsx
import React, { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore'
import { db, storage } from './firebase'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import './Recipes.css'
import { query, orderBy } from 'firebase/firestore'

export default function Recipes() {
  const FAMILY_ID = 'sharedFamily'
  const colRef = collection(db, 'families', FAMILY_ID, 'recipes')
  const q      = query(colRef, orderBy('title'))     // tri alphabétique par titre

  const [recipes, setRecipes]         = useState([])
  const [searchTerm, setSearchTerm]   = useState('')
  const [selected, setSelected]       = useState(null)
  const [editMode, setEditMode]       = useState(false)
  const [draftTitle, setDraftTitle]   = useState('')
  const [draftIngredients, setDraftIngredients] = useState([])
  const [draftSteps, setDraftSteps]   = useState([])
  const [draftNotes, setDraftNotes]   = useState('')
  const [draftImageUrl, setDraftImageUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [pasteMode, setPasteMode]     = useState(false)
  const [pasteText, setPasteText]     = useState('')

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

  // open overlay + init drafts
  function openOverlay(r) {
    setSelected(r)
    setEditMode(false)
    setDraftTitle(r.title || '')
    setDraftIngredients(
      (r.ingredients || []).map(i => ({
        name: i.name || '',
        quantity: i.quantity || ''
      }))
    )
    setDraftSteps(r.steps || [])
    setDraftNotes(r.notes || '')
    setDraftImageUrl(r.imageUrl || '')
    setImageFile(null)
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

  // save all edits
  async function saveAll() {
    if (!selected) return
    const ref = doc(db, 'families', FAMILY_ID, 'recipes', selected.id)
    let url = draftImageUrl
    try {
      if (imageFile) {
        const imgRef = storageRef(storage, `recipes/${selected.id}`)
        await uploadBytes(imgRef, imageFile)
        url = await getDownloadURL(imgRef)
        setImageFile(null)
        setDraftImageUrl(url)
      } else if (!draftImageUrl && selected.imageUrl) {
        const imgRef = storageRef(storage, `recipes/${selected.id}`)
        await deleteObject(imgRef).catch(() => {})
      }
    } catch (err) {
      console.error('Image upload failed:', err)
    }
    await updateDoc(ref, {
      title: draftTitle,
      ingredients: draftIngredients,
      steps: draftSteps,
      notes: draftNotes,
      imageUrl: url
    })
    // reflect locally
    setSelected({
      ...selected,
      title: draftTitle,
      ingredients: draftIngredients,
      steps: draftSteps,
      notes: draftNotes,
      imageUrl: url
    })
    setEditMode(false)
  }

  // delete current
  async function deleteCurrent() {
    if (!selected) return
    if (confirm('Supprimer cette recette ?')) {
      await deleteDoc(doc(db, 'families', FAMILY_ID, 'recipes', selected.id))
      if (selected.imageUrl) {
        await deleteObject(storageRef(storage, `recipes/${selected.id}`)).catch(() => {})
      }
      setSelected(null)
    }
  }

  function removeImage() {
    setDraftImageUrl('')
    setImageFile(null)
  }

  // ingredient helpers
  const setIngName = (i, v) => {
    const arr = [...draftIngredients]; arr[i].name = v; setDraftIngredients(arr)
  }
  const setIngQty = (i, v) => {
    const arr = [...draftIngredients]; arr[i].quantity = v; setDraftIngredients(arr)
  }
  const addIngredient = () =>
    setDraftIngredients(arr => [...arr, { name:'', quantity:'' }])
  const removeIngredient = i =>
    setDraftIngredients(arr => arr.filter((_, idx) => idx !== i))

  // step helpers
  const setStep    = (i, v) => {
    const arr = [...draftSteps]; arr[i] = v; setDraftSteps(arr)
  }
  const addStep    = () => setDraftSteps(arr => [...arr, ''])
  const removeStep = i =>
    setDraftSteps(arr => arr.filter((_, idx) => idx !== i))

  function onFileChange(e) {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setDraftImageUrl(URL.createObjectURL(file))
    }
  }

  function parseRecipe(text) {
    const lines = text.split(/\r?\n/).map(l => l.trimEnd())
    const recipe = { title: '', ingredients: [], steps: [], notes: '', imageUrl: '' }
    if (!lines.length) return recipe

    recipe.title = lines.shift().trim()
    let section = 'ingredients'
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        const lc = line.toLowerCase().replace(/[:\s]+$/, "")
        if (/^ingr[eé]dients?/.test(lc)) { section = 'ingredients'; continue }

      if (/^(préparation|preparation|étapes?|etapes?|steps?)/.test(lc)) { section = 'steps'; continue }
      if (/^notes?/.test(lc)) { section = 'notes'; continue }

      if (section === 'ingredients') {
        if (/^\d+[.)]/.test(lc)) {
          section = 'steps'
          recipe.steps.push(line.replace(/^\d+[.)]\s*/, ''))
          continue
        }
        const cleaned = line.replace(/^[-*]\s*/, '')
        const parts = cleaned.split(/\s+/)
        if (/^\d/.test(parts[0])) {
          const qty = parts.shift()
          recipe.ingredients.push({ quantity: qty, name: parts.join(' ') })
        } else {
          recipe.ingredients.push({ quantity: '', name: cleaned })
        }
      } else if (section === 'steps') {
        const marker = line.match(/^\s*(?:[-*]|\d+[.)])\s*/)
        const cleaned = line.replace(/^[-\d.)\s]+/, '')
        if (marker || recipe.steps.length === 0) {
          recipe.steps.push(cleaned)
        } else {
          recipe.steps[recipe.steps.length - 1] += `\n${cleaned}`
        }
      } else if (section === 'notes') {
        recipe.notes += (recipe.notes ? '\n' : '') + line
      }
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
          <div key={r.id} className="card" onClick={() => openOverlay(r)}>
            {r.imageUrl && (
              <img src={r.imageUrl} alt="" className="card-thumb" />
            )}
            <h3 className="card-title">{r.title}</h3>
          </div>
        ))}
      </div>

      {/* overlay */}
      {selected && (
        <div
          className="overlay"
          onClick={e => {
            // only close if backdrop clicked
            if (e.target === e.currentTarget) setSelected(null)
          }}
        >
          <div className="overlay-content" onClick={e => e.stopPropagation()}>
            <button className="btn-close" onClick={() => setSelected(null)}>✖</button>

            {/* Title */}
            {editMode
              ? <input
                  className="overlay-input-title"
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                />
              : <h2 className="overlay-title">{selected.title}</h2>
            }

            {(editMode ? draftImageUrl : selected.imageUrl) && (
              <img
                src={editMode ? draftImageUrl : selected.imageUrl}
                alt=""
                className="overlay-image"
              />
            )}
            {editMode && (
              <div>
                <input type="file" accept="image/*" onChange={onFileChange} />
                {draftImageUrl && (
                  <button className="btn-remove-img" onClick={removeImage}>
                    Supprimer l'image
                  </button>
                )}
              </div>
            )}

            {/* Ingredients */}
            <section className="section">
              <h3>Ingrédients</h3>
              {editMode
                ? <>
                    {draftIngredients.map((ing,i)=>(
                      <div key={i} className="list-edit-row">
                        <input
                          type="text"
                          placeholder="Qté…"
                          value={ing.quantity}
                          onChange={e=>setIngQty(i, e.target.value)}
                          style={{ width: '4rem' }}
                        />
                        <input
                          type="text"
                          placeholder="Nom…"
                          value={ing.name}
                          onChange={e=>setIngName(i, e.target.value)}
                        />
                        <button onClick={()=>removeIngredient(i)}>🗑️</button>
                      </div>
                    ))}
                    <button className="btn-small" onClick={addIngredient}>
                      ➕ Ajouter un ingrédient
                    </button>
                  </>
                : selected.ingredients?.length
                  ? <ul>
                      {selected.ingredients.map((ing,i)=>(
                        <li key={i}>{ing.quantity} {ing.name}</li>
                      ))}
                    </ul>
                  : <p>— aucun ingrédient —</p>
              }
            </section>

            {/* Steps */}
            <section className="section">
              <h3>Préparation</h3>
              {editMode
                ? <>
                    {draftSteps.map((st,i)=>(
                      <div key={i} className="list-edit-row">
                        <input
                          type="text"
                          placeholder={`Étape ${i+1}…`}
                          value={st}
                          onChange={e=>setStep(i, e.target.value)}
                        />
                        <button onClick={()=>removeStep(i)}>🗑️</button>
                      </div>
                    ))}
                    <button className="btn-small" onClick={addStep}>
                      ➕ Ajouter une étape
                    </button>
                  </>
                : selected.steps?.length
                  ? <ol>
                      {selected.steps.map((st,i)=><li key={i}>{st}</li>)}
                    </ol>
                  : <p>— pas d'étapes —</p>
              }
            </section>

            {/* Notes */}
            <section className="section">
              <h3>Notes</h3>
              {editMode
                ? <textarea
                    className="overlay-textarea"
                    value={draftNotes}
                    onChange={e=>setDraftNotes(e.target.value)}
                  />
                : <p>{selected.notes || '— aucune note —'}</p>
              }
            </section>

            {/* Footer actions */}
            <div className="overlay-footer">
              {editMode
                ? <button className="btn-save" onClick={saveAll}>💾 Sauvegarder</button>
                : <button className="btn-modify" onClick={()=>setEditMode(true)}>✏️ Modifier</button>
              }
              {!editMode && (
                <button className="btn-delete" onClick={deleteCurrent}>
                  🗑️ Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
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
              placeholder={`Titre\nIngrédients:\n- 2 œufs\nPréparation:\n- Étape…\nNotes:`}
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
