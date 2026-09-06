// src/components/AddBar.jsx
import { useMemo, useRef, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { normalizeName } from '../utils/normalize'

/**
 * Champ unique : recherche dans les articles connus ET ajout d'un nouveau.
 * - frappe        -> suggestions filtrées (insensible à la casse et aux accents)
 * - clic sur une suggestion -> ajoute cet article
 * - Entrée / bouton         -> ajoute le texte saisi
 */
export default function AddBar({ items, onAdd }) {
  const [term, setTerm] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  const matches = useMemo(() => {
    const key = normalizeName(term)
    if (!key) return []
    return items
      .filter(i => normalizeName(i.name).includes(key))
      .slice(0, 6)
  }, [items, term])

  const submit = e => {
    e.preventDefault()
    const value = term.trim()
    if (!value) return
    onAdd(value)
    setTerm('')
    inputRef.current?.focus()
  }

  const pick = item => {
    onAdd(item.name)
    setTerm('')
    inputRef.current?.focus()
  }

  const showSuggestions = focused && matches.length > 0

  return (
    <div className="addbar-wrapper">
      <form className="addbar" onSubmit={submit}>
        <span className="addbar-icon"><Search size={18} /></span>
        <input
          ref={inputRef}
          type="text"
          value={term}
          onChange={e => setTerm(e.target.value)}
          onFocus={() => setFocused(true)}
          // délai pour laisser le clic sur une suggestion se produire
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Rechercher ou ajouter un article"
          aria-label="Rechercher ou ajouter un article"
        />
        <button type="submit" aria-label="Ajouter">
          <Plus size={20} />
        </button>
      </form>

      {showSuggestions && (
        <ul className="addbar-suggestions">
          {matches.map(item => (
            <li key={item.id}>
              <button type="button" onClick={() => pick(item)}>
                <span>{item.name}</span>
                {item.checked && <span className="addbar-tag">déjà sur la liste</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
