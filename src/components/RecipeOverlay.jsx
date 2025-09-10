import React, { useEffect, useState } from 'react'
import {
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore'
import { db, storage } from '../firebase'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

export default function RecipeOverlay({ recipe, onClose, onSave }) {
  const FAMILY_ID = 'sharedFamily'

  const [editMode, setEditMode] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftIngredients, setDraftIngredients] = useState([])
  const [draftSteps, setDraftSteps] = useState([])
  const [draftNotes, setDraftNotes] = useState('')
  const [draftImageUrl, setDraftImageUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)

  useEffect(() => {
    if (recipe) {
      setEditMode(false)
      setDraftTitle(recipe.title || '')
      setDraftIngredients(
        (recipe.ingredients || []).map(i => ({
          name: i.name || '',
          quantity: i.quantity || ''
        }))
      )
      setDraftSteps(recipe.steps || [])
      setDraftNotes(recipe.notes || '')
      setDraftImageUrl(recipe.imageUrl || '')
      setImageFile(null)
    }
  }, [recipe])

  async function saveAll() {
    if (!recipe) return
    const ref = doc(db, 'families', FAMILY_ID, 'recipes', recipe.id)
    let url = draftImageUrl
    try {
      if (imageFile) {
        const imgRef = storageRef(storage, `recipes/${recipe.id}`)
        await uploadBytes(imgRef, imageFile)
        url = await getDownloadURL(imgRef)
        setImageFile(null)
        setDraftImageUrl(url)
      } else if (!draftImageUrl && recipe.imageUrl) {
        const imgRef = storageRef(storage, `recipes/${recipe.id}`)
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
    onSave({
      ...recipe,
      title: draftTitle,
      ingredients: draftIngredients,
      steps: draftSteps,
      notes: draftNotes,
      imageUrl: url
    })
    setEditMode(false)
  }

  async function deleteCurrent() {
    if (!recipe) return
    if (confirm('Supprimer cette recette ?')) {
      await deleteDoc(doc(db, 'families', FAMILY_ID, 'recipes', recipe.id))
      if (recipe.imageUrl) {
        await deleteObject(storageRef(storage, `recipes/${recipe.id}`)).catch(() => {})
      }
      onClose()
    }
  }

  function removeImage() {
    setDraftImageUrl('')
    setImageFile(null)
  }

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

  return (
    <div
      className="overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="overlay-content" onClick={e => e.stopPropagation()}>
        <button className="btn-close" onClick={onClose}>✖</button>

        {editMode
          ? <input
              className="overlay-input-title"
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
            />
          : <h2 className="overlay-title">{recipe.title}</h2>
        }

        {(editMode ? draftImageUrl : recipe.imageUrl) && (
          <img
            src={editMode ? draftImageUrl : recipe.imageUrl}
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
            : recipe.ingredients?.length
              ? <ul>
                  {recipe.ingredients.map((ing,i)=>(
                    <li key={i}>{ing.quantity} {ing.name}</li>
                  ))}
                </ul>
              : <p>— aucun ingrédient —</p>
          }
        </section>

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
            : recipe.steps?.length
              ? <ol>
                  {recipe.steps.map((st,i)=><li key={i}>{st}</li>)}
                </ol>
              : <p>— pas d'étapes —</p>
          }
        </section>

        <section className="section">
          <h3>Notes</h3>
          {editMode
            ? <textarea
                className="overlay-textarea"
                value={draftNotes}
                onChange={e=>setDraftNotes(e.target.value)}
              />
            : <p>{recipe.notes || '— aucune note —'}</p>
          }
        </section>

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
  )
}
