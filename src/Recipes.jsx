// src/Recipes.jsx
import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore'
import { db } from './firebase'
import './Recipes.css'
import { Plus, Search, X, SlidersHorizontal } from 'lucide-react'
import RecipeCard from './components/RecipeCard'
import RecipeSheet from './components/RecipeSheet'
import { parseRecipeText, cleanRecipe } from './utils/parseRecipe'
import { ALL_TAGS } from './utils/tags'
import { normalizeName } from './utils/normalize'

const FAMILY_ID = 'sharedFamily'

export default function Recipes() {
  const colRef = collection(db, 'families', FAMILY_ID, 'recipes')

  const [recipes, setRecipes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    const q = query(colRef, orderBy('title'))
    return onSnapshot(q, snap =>
      // cleanRecipe : les fiches déjà en base peuvent contenir des lignes vides
      setRecipes(snap.docs.map(d => cleanRecipe({ id: d.id, ...d.data() })))
    )
  }, [])

  useEffect(() => {
    document.body.classList.add('recipes-page')
    return () => document.body.classList.remove('recipes-page')
  }, [])

  // Seuls les tags réellement portés par au moins une recette sont proposés :
  // filtrer sur un tag que personne n'utilise ne sert à rien.
  const usedTags = useMemo(
    () => ALL_TAGS.filter(t => recipes.some(r => (r.tags || []).includes(t))),
    [recipes]
  )

  const filtered = useMemo(() => {
    const key = normalizeName(searchTerm)
    return recipes.filter(r => {
      if (activeTags.length && !activeTags.every(t => (r.tags || []).includes(t))) return false
      if (!key) return true
      if (normalizeName(r.title || '').includes(key)) return true
      return (r.ingredients || []).some(i => normalizeName(i.name || '').includes(key))
    })
  }, [recipes, searchTerm, activeTags])

  const toggleTag = tag =>
    setActiveTags(list => (list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag]))

  const preview = useMemo(() => (draft.trim() ? parseRecipeText(draft) : null), [draft])

  const createRecipe = async () => {
    if (!preview?.title) return
    const ref = await addDoc(colRef, {
      title: preview.title,
      ingredients: preview.ingredients,
      steps: preview.steps,
      notes: preview.notes,
      tags: [],
      imageUrl: '',
    })
    setCreating(false)
    setDraft('')
    setSelected({ id: ref.id, ...preview })
  }

  return (
    <div className="recipes-page-inner">
      <div className="recipes-header">
        <h2>Recettes</h2>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={18} /> Nouvelle
        </button>
      </div>

      <div className="recipes-toolbar">
        <div className="recipes-search">
          <Search size={18} />
          <input
            type="search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            // quand la recherche ne laisse qu'une recette, Entrée l'ouvre directement
            onKeyDown={e => {
              if (e.key === 'Enter' && filtered.length === 1) {
                setSelected(filtered[0])
                e.currentTarget.blur()
              }
            }}
            placeholder="Titre ou ingrédient…"
            aria-label="Rechercher une recette"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} aria-label="Effacer">
              <X size={16} />
            </button>
          )}
        </div>

        {usedTags.length > 0 && (
          <button
            className={`filter-toggle${activeTags.length ? ' active' : ''}`}
            onClick={() => setShowFilters(v => !v)}
            aria-label="Filtrer par tag"
          >
            <SlidersHorizontal size={18} />
            {activeTags.length > 0 && <span className="filter-count">{activeTags.length}</span>}
          </button>
        )}
      </div>

      {showFilters && usedTags.length > 0 && (
        <div className="tag-filters">
          {usedTags.map(tag => (
            <button
              key={tag}
              className={`tag-chip${activeTags.includes(tag) ? ' active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
          {activeTags.length > 0 && (
            <button className="tag-clear" onClick={() => setActiveTags([])}>
              Tout afficher
            </button>
          )}
        </div>
      )}

      <div className="recipes-grid">
        {filtered.length === 0 && (
          <p className="empty">
            {recipes.length === 0
              ? 'Aucune recette. Colle ta première recette avec « Nouvelle ».'
              : 'Aucune recette ne correspond.'}
          </p>
        )}
        {filtered.map(r => (
          <RecipeCard key={r.id} recipe={r} onSelect={setSelected} />
        ))}
      </div>

      {selected && (
        <RecipeSheet
          recipe={selected}
          onClose={() => setSelected(null)}
          onSave={setSelected}
        />
      )}

      {creating && (
        <div
          className="overlay"
          onClick={e => { if (e.target === e.currentTarget) setCreating(false) }}
        >
          <div className="overlay-content" onClick={e => e.stopPropagation()}>
            <button className="btn-close" onClick={() => setCreating(false)}>✖</button>
            <h2 className="overlay-title">Nouvelle recette</h2>
            <p className="missing-hint">
              Colle une recette entière (n'importe quel format) ou tape simplement un titre.
            </p>

            <textarea
              className="sheet-textarea"
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={'Tarte aux pommes\n\nIngrédients :\n- 1 pâte brisée\n- 4 pommes\n- 100 g de sucre\n\nPréparation :\n1. Préchauffer le four à 180°C\n2. Étaler la pâte'}
            />

            {preview && (
              <div className="parse-preview">
                <strong>{preview.title || '(titre manquant)'}</strong>
                <span>
                  {preview.ingredients.length} ingrédient{preview.ingredients.length > 1 ? 's' : ''}
                  {' · '}
                  {preview.steps.length} étape{preview.steps.length > 1 ? 's' : ''}
                </span>
                {preview.ingredients.length > 0 && (
                  <p className="parse-preview-list">
                    {preview.ingredients.map(i => i.name).join(', ')}
                  </p>
                )}
              </div>
            )}

            <div className="overlay-footer">
              <button className="btn-modify" onClick={() => setCreating(false)}>Annuler</button>
              <button className="btn-save" onClick={createRecipe} disabled={!preview?.title}>
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
