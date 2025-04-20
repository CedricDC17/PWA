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
    const [selected, setSelected] = useState(null)
    const [editMode, setEditMode] = useState(false)
    const [draftTitle, setDraftTitle] = useState('')
    const [draftIngredients, setDraftIngredients] = useState([])
    const [draftSteps, setDraftSteps] = useState([])
    const [draftNotes, setDraftNotes] = useState('')

    // — load recipes in real‑time
    useEffect(() => {
        const unsub = onSnapshot(colRef, snap =>
            setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        )
        return unsub
    }, [])

    // — when recipes page mounts/unmounts
    useEffect(() => {
        document.body.classList.add('recipes-page')
        return () => {
            document.body.classList.remove('recipes-page')
        }
    }, [])

    // — open overlay and initialize drafts
    const openOverlay = r => {
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
    }

    // — add new recipe
    const addRecipe = async () => {
        const title = prompt('Titre de la nouvelle recette ?')
        if (!title) return
        await addDoc(colRef, {
            title,
            ingredients: [],
            steps: [],
            notes: ''
        })
    }

    // — save all edits
    const saveAll = async () => {
        if (!selected) return
        const ref = doc(db, 'families', FAMILY_ID, 'recipes', selected.id)
        await updateDoc(ref, {
            title: draftTitle,
            ingredients: draftIngredients,
            steps: draftSteps,
            notes: draftNotes
        })
        // reflect locally
        setSelected({
            ...selected,
            title: draftTitle,
            ingredients: draftIngredients,
            steps: draftSteps,
            notes: draftNotes
        })
        setEditMode(false)
    }

    // — delete current recipe
    const deleteCurrent = async () => {
        if (!selected) return
        if (confirm('Supprimer cette recette ?')) {
            await deleteDoc(
                doc(db, 'families', FAMILY_ID, 'recipes', selected.id)
            )
            setSelected(null)
        }
    }

    // — ingredient helpers
    const setIngName = (i, v) => {
        const arr = [...draftIngredients]
        arr[i].name = v
        setDraftIngredients(arr)
    }
    const setIngQty = (i, v) => {
        const arr = [...draftIngredients]
        arr[i].quantity = v
        setDraftIngredients(arr)
    }
    const addIngredient = () =>
        setDraftIngredients(ing => [...ing, { quantity: '', name: '' }])
    const removeIngredient = i =>
        setDraftIngredients(ing => ing.filter((_, idx) => idx !== i))

    // — step helpers
    const setStep = (i, v) => {
        const arr = [...draftSteps]
        arr[i] = v
        setDraftSteps(arr)
    }
    const addStep = () => setDraftSteps(st => [...st, ''])
    const removeStep = i =>
        setDraftSteps(st => st.filter((_, idx) => idx !== i))

    return (
        <div className="card-container">
            {/* header */}
            <div className="card-header">
                <h2>Recettes</h2>
                <button className="btn-add" onClick={addRecipe}>
                    ➕
                </button>
            </div>

            {/* grid of cards */}
            <div className="cards-grid">
                {recipes.length === 0 && <p>Aucune recette pour l'instant.</p>}
                {recipes.map(r => (
                    <div
                        key={r.id}
                        className="card"
                        onClick={() => openOverlay(r)}
                    >
                        <h3 className="card-title">{r.title}</h3>
                    </div>
                ))}
            </div>

            {/* full‑screen overlay */}
            {selected && (
                <div className="overlay" onClick={() => setSelected(null)}>
                    <div
                        className="overlay-content"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            className="btn-close"
                            onClick={() => setSelected(null)}
                        >
                            ✖
                        </button>

                        {/* Title */}
                        {editMode ? (
                            <input
                                className="overlay-input-title"
                                value={draftTitle}
                                onChange={e => setDraftTitle(e.target.value)}
                            />
                        ) : (
                            <h2 className="overlay-title">{selected.title}</h2>
                        )}

                        {/* Ingredients */}
                        <section className="section">
                            <h3>Ingrédients</h3>
                            {editMode ? (
                                <>
                                    {draftIngredients.map((ing, i) => (
                                        <div key={i} className="list-edit-row">
                                            <input
                                                type="text"
                                                placeholder="Qté…"
                                                value={ing.quantity}
                                                onChange={e =>
                                                    setIngQty(i, e.target.value)
                                                }
                                                style={{ width: '4rem' }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Nom…"
                                                value={ing.name}
                                                onChange={e => setIngName(i, e.target.value)}
                                            />
                                            <button onClick={() => removeIngredient(i)}>
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        className="btn-small"
                                        onClick={addIngredient}
                                    >
                                        ➕ Ajouter un ingrédient
                                    </button>
                                </>
                            ) : selected.ingredients?.length ? (
                                <ul>
                                    {selected.ingredients.map((ing, i) => (
                                        <li key={i}>
                                            {ing.quantity} {ing.name}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>— aucun ingrédient —</p>
                            )}
                        </section>

                        {/* Steps */}
                        <section className="section">
                            <h3>Préparation</h3>
                            {editMode ? (
                                <>
                                    {draftSteps.map((st, i) => (
                                        <div key={i} className="list-edit-row">
                                            <input
                                                type="text"
                                                placeholder={`Étape ${i + 1}…`}
                                                value={st}
                                                onChange={e => setStep(i, e.target.value)}
                                            />
                                            <button onClick={() => removeStep(i)}>
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                    <button className="btn-small" onClick={addStep}>
                                        ➕ Ajouter une étape
                                    </button>
                                </>
                            ) : selected.steps?.length ? (
                                <ol>
                                    {selected.steps.map((st, i) => (
                                        <li key={i}>{st}</li>
                                    ))}
                                </ol>
                            ) : (
                                <p>— pas d'étapes —</p>
                            )}
                        </section>

                        {/* Notes */}
                        <section className="section">
                            <h3>Notes</h3>
                            {editMode ? (
                                <textarea
                                    className="overlay-textarea"
                                    value={draftNotes}
                                    onChange={e => setDraftNotes(e.target.value)}
                                />
                            ) : (
                                <p>{selected.notes || '— aucune note —'}</p>
                            )}
                        </section>

                        {/* Footer actions */}
                        <div className="overlay-footer">
                            {editMode ? (
                                <button className="btn-save" onClick={saveAll}>
                                    💾 Sauvegarder
                                </button>
                            ) : (
                                <button
                                    className="btn-modify"
                                    onClick={() => setEditMode(true)}
                                >
                                    ✏️ Modifier
                                </button>
                            )}
                            {!editMode && (
                                <button
                                    className="btn-delete"
                                    onClick={deleteCurrent}
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
