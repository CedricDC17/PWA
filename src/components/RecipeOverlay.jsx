// src/components/RecipeOverlay.jsx
import { useEffect, useState } from 'react'
import { updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db, storage } from '../firebase'
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { Pencil, Trash2, Save, ImagePlus } from 'lucide-react'
import {
  parseIngredientsText,
  parseStepsText,
  ingredientsToText,
} from '../utils/parseRecipe'
import { TAG_GROUPS } from '../utils/tags'

const FAMILY_ID = 'sharedFamily'

export default function RecipeOverlay({ recipe, onClose, onSave }) {
  const [editMode, setEditMode] = useState(false)
  const [title, setTitle] = useState('')
  const [ingredientsText, setIngredientsText] = useState('')
  const [stepsText, setStepsText] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState([])
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [saving, setSaving] = useState(false)

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
  }, [recipe])

  const toggleTag = tag =>
    setTags(list => (list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag]))

  async function saveAll() {
    if (!recipe || saving) return
    setSaving(true)
    let url = imageUrl
    try {
      if (imageFile) {
        const imgRef = storageRef(storage, `recipes/${recipe.id}`)
        await uploadBytes(imgRef, imageFile)
        url = await getDownloadURL(imgRef)
        setImageFile(null)
        setImageUrl(url)
      } else if (!imageUrl && recipe.imageUrl) {
        await deleteObject(storageRef(storage, `recipes/${recipe.id}`)).catch(() => {})
      }
    } catch (err) {
      console.error('Envoi de l’image impossible :', err)
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
    setEditMode(false)
    setSaving(false)
  }

  async function deleteCurrent() {
    if (!confirm('Supprimer cette recette ?')) return
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

  return (
    <div
      className="overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="overlay-content" onClick={e => e.stopPropagation()}>
        <button className="btn-close" onClick={onClose}>✖</button>

        {editMode ? (
          <input
            className="overlay-input-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Titre de la recette"
          />
        ) : (
          <h2 className="overlay-title">{recipe.title}</h2>
        )}

        {imageUrl && <img src={imageUrl} alt="" className="overlay-image" />}

        {editMode && (
          <div className="image-actions">
            <label className="btn-small">
              <ImagePlus size={16} /> {imageUrl ? 'Changer la photo' : 'Ajouter une photo'}
              <input type="file" accept="image/*" onChange={onFileChange} hidden />
            </label>
            {imageUrl && (
              <button
                className="btn-remove-img"
                onClick={() => { setImageUrl(''); setImageFile(null) }}
              >
                Retirer la photo
              </button>
            )}
          </div>
        )}

        {/* ---------- Tags ---------- */}
        {editMode ? (
          <section className="section">
            <h3>Tags</h3>
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
          </section>
        ) : (
          (recipe.tags || []).length > 0 && (
            <div className="tag-filters view-only">
              {recipe.tags.map(t => (
                <span key={t} className="tag-chip small">{t}</span>
              ))}
            </div>
          )
        )}

        {/* ---------- Ingrédients ---------- */}
        <section className="section">
          <h3>Ingrédients</h3>
          {editMode ? (
            <>
              <textarea
                className="overlay-textarea tall"
                value={ingredientsText}
                onChange={e => setIngredientsText(e.target.value)}
                placeholder={'Un ingrédient par ligne :\n200 g de farine\n3 oeufs\nsel'}
              />
              <p className="field-hint">
                Un par ligne. Les quantités sont reconnues automatiquement, avant ou
                après le nom.
              </p>
            </>
          ) : recipe.ingredients?.length ? (
            <ul>
              {recipe.ingredients.map((ing, i) => (
                <li key={i}>
                  {ing.quantity && <span className="ing-qty">{ing.quantity}</span>} {ing.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Aucun ingrédient</p>
          )}
        </section>

        {/* ---------- Préparation ---------- */}
        <section className="section section-prep">
          <h3>Préparation</h3>
          {editMode ? (
            <>
              <textarea
                className="overlay-textarea tall"
                value={stepsText}
                onChange={e => setStepsText(e.target.value)}
                placeholder={'Une étape par ligne :\nPréchauffer le four\nMélanger les ingrédients'}
              />
              <p className="field-hint">Une étape par ligne. La numérotation est ajoutée toute seule.</p>
            </>
          ) : recipe.steps?.length ? (
            <ol>
              {recipe.steps.map((st, i) => <li key={i}>{st}</li>)}
            </ol>
          ) : (
            <p className="empty">Pas d'étapes</p>
          )}
        </section>

        {/* ---------- Notes ---------- */}
        <section className="section">
          <h3>Notes</h3>
          {editMode ? (
            <textarea
              className="overlay-textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Nombre de portions, variantes, astuces…"
            />
          ) : (
            <p>{recipe.notes || <span className="empty">Aucune note</span>}</p>
          )}
        </section>

        <div className="overlay-footer">
          {editMode ? (
            <button className="btn-save" onClick={saveAll} disabled={saving}>
              <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          ) : (
            <>
              <button className="btn-delete" onClick={deleteCurrent}>
                <Trash2 size={16} /> Supprimer
              </button>
              <button className="btn-save" onClick={() => setEditMode(true)}>
                <Pencil size={16} /> Modifier
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
