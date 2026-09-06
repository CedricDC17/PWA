// src/components/RecipeSheet.jsx
import { useCallback, useEffect, useState } from 'react'
import { updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db, storage } from '../firebase'
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { compressImage } from '../utils/image'
import {
  ChevronLeft, Pencil, Trash2, ImagePlus, RotateCcw, CookingPot, Check, AlertTriangle,
} from 'lucide-react'
import {
  parseIngredientsText,
  parseStepsText,
  ingredientsToText,
} from '../utils/parseRecipe'
import { TAG_GROUPS } from '../utils/tags'
import useWakeLock from '../hooks/useWakeLock'
import useDismissable from '../hooks/useDismissable'

const FAMILY_ID = 'sharedFamily'
const UPLOAD_TIMEOUT = 45000 // ms avant d'abandonner l'envoi d'une photo

export default function RecipeSheet({ recipe, onClose, onSave }) {
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadPct, setUploadPct] = useState(null)
  const [saveError, setSaveError] = useState('')

  // Brouillon d'édition
  const [title, setTitle] = useState('')
  const [ingredientsText, setIngredientsText] = useState('')
  const [stepsText, setStepsText] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState([])
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)

  // Mode cuisine : ce qui est déjà fait, le temps de la préparation
  const [doneIngredients, setDoneIngredients] = useState([])
  const [doneSteps, setDoneSteps] = useState([])

  useEffect(() => {
    if (!recipe) return
    setEditMode(false)
    setTitle(recipe.title || '')
    setIngredientsText(ingredientsToText(recipe.ingredients || []))
    setStepsText((recipe.steps || []).join('\n'))
    setNotes(recipe.notes || '')
    setTags(recipe.tags || [])
    setImageUrl(recipe.imageUrl || '')
    setImageFile(null)
    setDoneIngredients([])
    setDoneSteps([])
    setSaveError('')
    setUploadPct(null)
    // Dépendance sur l'identifiant seulement : après un enregistrement, le parent
    // renvoie un nouvel objet recette. Dépendre de l'objet relancerait cet effet
    // et effacerait aussitôt le mode édition et le message d'erreur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id])

  // Écran maintenu allumé pendant la lecture (pas pendant l'édition)
  useWakeLock(!editMode)

  const requestClose = useCallback(() => {
    if (editMode) {
      setEditMode(false)
      return
    }
    onClose()
  }, [editMode, onClose])

  useDismissable(true, requestClose)

  const toggleTag = tag =>
    setTags(list => (list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag]))

  const toggleDone = (list, setList, index) =>
    setList(l => (l.includes(index) ? l.filter(i => i !== index) : [...l, index]))

  const anyDone = doneIngredients.length > 0 || doneSteps.length > 0
  const resetProgress = () => {
    setDoneIngredients([])
    setDoneSteps([])
  }

  /**
   * Envoie la photo : compression, barre de progression, et abandon au bout de
   * UPLOAD_TIMEOUT. Sans cette limite, le SDK Firebase réessaie tout seul
   * pendant 2 minutes avant d'abandonner — d'où l'impression de boucle infinie
   * quand le Storage n'est pas correctement configuré.
   */
  async function uploadPhoto(file) {
    const compressed = await compressImage(file)
    const task = uploadBytesResumable(
      storageRef(storage, `recipes/${recipe.id}`),
      compressed,
      { contentType: compressed.type || 'image/jpeg' }
    )

    let timer
    let timedOut = false
    try {
      await new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          timedOut = true
          // cancel() déclenche le callback d'erreur ci-dessous
          task.cancel()
        }, UPLOAD_TIMEOUT)

        task.on(
          'state_changed',
          snap =>
            setUploadPct(
              snap.totalBytes
                ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
                : null
            ),
          err => reject(timedOut ? new Error('timeout') : err),
          resolve
        )
      })
    } finally {
      clearTimeout(timer)
      setUploadPct(null)
    }

    return getDownloadURL(task.snapshot.ref)
  }

  async function saveAll() {
    if (!recipe || saving) return
    setSaving(true)
    setSaveError('')

    // On part TOUJOURS de l'URL déjà enregistrée : imageUrl peut contenir une
    // adresse "blob:" temporaire (aperçu local), qui ne veut plus rien dire
    // une fois la page fermée et ne doit jamais atterrir en base.
    let url = recipe.imageUrl || ''
    let photoFailed = false

    try {
      if (imageFile) {
        url = await uploadPhoto(imageFile)
        setImageFile(null)
        setImageUrl(url)
      } else if (!imageUrl && recipe.imageUrl) {
        await deleteObject(storageRef(storage, `recipes/${recipe.id}`)).catch(() => {})
        url = ''
      } else if (imageUrl && !imageUrl.startsWith('blob:')) {
        url = imageUrl
      }
    } catch (err) {
      photoFailed = true
      url = recipe.imageUrl || '' // on conserve l'ancienne photo
      console.error('Envoi de la photo impossible :', err)
      setSaveError(
        err?.message === 'timeout'
          ? "La photo n'a pas pu être envoyée (délai dépassé). Vérifie ta connexion, ou que Firebase Storage est bien activé sur le projet. Le reste de la recette a été enregistré."
          : "La photo n'a pas pu être envoyée. Le reste de la recette a été enregistré."
      )
    }

    const updated = {
      title: title.trim(),
      ingredients: parseIngredientsText(ingredientsText),
      steps: parseStepsText(stepsText),
      notes,
      tags,
      imageUrl: url,
    }
    await updateDoc(doc(db, 'families', FAMILY_ID, 'recipes', recipe.id), updated)
    onSave({ ...recipe, ...updated })
    setSaving(false)
    // En cas d'échec photo, on reste en édition pour que le message soit vu
    if (!photoFailed) setEditMode(false)
  }

  async function deleteCurrent() {
    if (!confirm('Supprimer définitivement cette recette ?')) return
    await deleteDoc(doc(db, 'families', FAMILY_ID, 'recipes', recipe.id))
    if (recipe.imageUrl) {
      await deleteObject(storageRef(storage, `recipes/${recipe.id}`)).catch(() => {})
    }
    onClose()
  }

  function onFileChange(e) {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setImageUrl(URL.createObjectURL(file))
    }
  }

  const ingredients = recipe.ingredients || []
  const steps = recipe.steps || []

  return (
    <div className="recipe-sheet">
      {/* ---------------- Barre supérieure ---------------- */}
      <header className="sheet-bar">
        <button className="sheet-bar-back" onClick={requestClose}>
          <ChevronLeft size={22} />
          <span>{editMode ? 'Annuler' : 'Retour'}</span>
        </button>

        {editMode ? (
          <button className="sheet-bar-action primary" onClick={saveAll} disabled={saving}>
            {saving
              ? uploadPct !== null
                ? `Envoi ${uploadPct} %`
                : 'Enregistrement…'
              : 'Enregistrer'}
          </button>
        ) : (
          <button className="sheet-bar-action" onClick={() => setEditMode(true)}>
            <Pencil size={16} /> Modifier
          </button>
        )}
      </header>

      <div className="sheet-scroll">
        {saveError && (
          <p className="sheet-error" role="alert">
            <AlertTriangle size={18} /> {saveError}
          </p>
        )}

        {/* ---------------- Visuel ---------------- */}
        {imageUrl && <img src={imageUrl} alt="" className="recipe-hero" />}

        {editMode && (
          <div className="hero-actions">
            <label className="btn-ghost">
              <ImagePlus size={16} /> {imageUrl ? 'Changer la photo' : 'Ajouter une photo'}
              <input type="file" accept="image/*" onChange={onFileChange} hidden />
            </label>
            {imageUrl && (
              <button
                className="btn-ghost danger"
                onClick={() => { setImageUrl(''); setImageFile(null) }}
              >
                Retirer
              </button>
            )}
          </div>
        )}

        {/* ---------------- Titre ---------------- */}
        {editMode ? (
          <input
            className="sheet-title-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Titre de la recette"
          />
        ) : (
          <h1 className="sheet-title">{recipe.title}</h1>
        )}

        {/* ---------------- Tags ---------------- */}
        {editMode ? (
          <div className="block">
            <h2 className="block-title">Tags</h2>
            {TAG_GROUPS.map(group => (
              <div className="tag-group" key={group.group}>
                <span className="tag-group-label">{group.group}</span>
                <div className="tag-group-chips">
                  {group.tags.map(tag => (
                    <button
                      key={tag}
                      className={`tag-chip${tags.includes(tag) ? ' active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          (recipe.tags?.length > 0 || anyDone) && (
            <div className="sheet-meta">
              {recipe.tags?.map(t => (
                <span key={t} className="tag-chip small">{t}</span>
              ))}
              {anyDone && (
                <button className="btn-ghost small" onClick={resetProgress}>
                  <RotateCcw size={14} /> Réinitialiser
                </button>
              )}
            </div>
          )
        )}

        {/* ---------------- Ingrédients ---------------- */}
        {(editMode || ingredients.length > 0) && (
          <div className="block">
            <h2 className="block-title">
              Ingrédients
              {!editMode && ingredients.length > 0 && (
                <span className="block-count">
                  {doneIngredients.length}/{ingredients.length}
                </span>
              )}
            </h2>

            {editMode ? (
              <>
                <textarea
                  className="sheet-textarea"
                  value={ingredientsText}
                  onChange={e => setIngredientsText(e.target.value)}
                  placeholder={'Un ingrédient par ligne :\n200 g de farine\n3 oeufs\nsel'}
                />
                <p className="field-hint">
                  Un par ligne. Les quantités sont reconnues automatiquement, avant ou après le nom.
                </p>
              </>
            ) : (
              <ul className="check-list">
                {ingredients.map((ing, i) => (
                  <li
                    key={i}
                    className={doneIngredients.includes(i) ? 'done' : ''}
                    onClick={() => toggleDone(doneIngredients, setDoneIngredients, i)}
                  >
                    <span className="check-box">
                      {doneIngredients.includes(i) && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className="check-text">
                      {ing.quantity && <b>{ing.quantity}</b>} {ing.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ---------------- Préparation ---------------- */}
        {(editMode || steps.length > 0) && (
          <div className="block">
            <h2 className="block-title">
              Préparation
              {!editMode && steps.length > 0 && (
                <span className="block-count">{doneSteps.length}/{steps.length}</span>
              )}
            </h2>

            {editMode ? (
              <>
                <textarea
                  className="sheet-textarea"
                  value={stepsText}
                  onChange={e => setStepsText(e.target.value)}
                  placeholder={'Une étape par ligne :\nPréchauffer le four\nMélanger les ingrédients'}
                />
                <p className="field-hint">Une étape par ligne, la numérotation est ajoutée toute seule.</p>
              </>
            ) : (
              <ol className="step-list">
                {steps.map((st, i) => (
                  <li
                    key={i}
                    className={doneSteps.includes(i) ? 'done' : ''}
                    onClick={() => toggleDone(doneSteps, setDoneSteps, i)}
                  >
                    <span className="step-num">{i + 1}</span>
                    <span className="check-text">{st}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* ---------------- Notes ---------------- */}
        {(editMode || recipe.notes) && (
          <div className="block">
            <h2 className="block-title">Notes</h2>
            {editMode ? (
              <textarea
                className="sheet-textarea short"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Nombre de portions, variantes, astuces…"
              />
            ) : (
              <p className="sheet-notes">{recipe.notes}</p>
            )}
          </div>
        )}

        {/* Fiche vide : on invite à la compléter plutôt que d'afficher des blocs vides */}
        {!editMode && ingredients.length === 0 && steps.length === 0 && (
          <div className="sheet-empty">
            <CookingPot size={32} />
            <p>Cette fiche est vide.</p>
            <button className="btn-primary" onClick={() => setEditMode(true)}>
              Compléter la recette
            </button>
          </div>
        )}

        {/* Suppression : en bas, en mode édition seulement */}
        {editMode && (
          <button className="btn-danger-outline full" onClick={deleteCurrent}>
            <Trash2 size={16} /> Supprimer cette recette
          </button>
        )}
      </div>
    </div>
  )
}
