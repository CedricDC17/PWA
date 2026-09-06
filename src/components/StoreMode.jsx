// src/components/StoreMode.jsx
import { useMemo, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { rayonLabel, RAYON_AUTRE } from '../utils/rayons'
import { formatQuantity } from '../utils/units'
import useLongPress from '../hooks/useLongPress'

/** Ligne d'article : tap = acheté/pas acheté, appui long = menu (corriger le rayon…) */
function StoreRow({ item, bought, onToggleBought, onLongPress }) {
  const handlers = useLongPress(
    () => onLongPress(item),
    () => onToggleBought(item, !bought)
  )
  const badge = formatQuantity(item.quantity, item.unit)
  return (
    <div className={`store-item${bought ? ' bought' : ''}`} {...handlers}>
      <span className={`store-checkbox${bought ? ' checked' : ''}`}>
        {bought && <Check size={14} />}
      </span>
      <span className="store-item-name">{item.name}</span>
      {!bought && badge && <span className="qty-badge">{badge}</span>}
    </div>
  )
}

/**
 * Mode magasin : la liste active, groupée par rayon dans l'ordre du magasin.
 * Cocher un article le fait descendre dans la sous-liste "achetés" de son rayon.
 * À la sortie, les articles achetés quittent la liste active (sans être supprimés
 * de l'historique).
 */
export default function StoreMode({
  items,
  rayonOrder,
  onToggleBought,
  onQuickAdd,
  onLongPress,
  onExit,
}) {
  const [adding, setAdding] = useState(false)
  const [term, setTerm] = useState('')

  const active = useMemo(() => items.filter(i => i.checked), [items])
  const boughtCount = active.filter(i => i.bought).length

  const groups = useMemo(() => {
    return rayonOrder
      .map(rayonId => ({
        id: rayonId,
        label: rayonLabel(rayonId),
        items: active
          .filter(i => (i.rayon || RAYON_AUTRE) === rayonId)
          .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
      }))
      .filter(g => g.items.length > 0)
  }, [active, rayonOrder])

  const submitQuickAdd = e => {
    e.preventDefault()
    const value = term.trim()
    if (!value) return
    onQuickAdd(value)
    setTerm('')
  }

  const progress = active.length ? Math.round((boughtCount / active.length) * 100) : 0

  return (
    <div className="store-mode">
      <header className="store-header">
        <div className="store-header-top">
          <h2>Mode magasin</h2>
          <button className="btn-save" onClick={onExit}>Terminer</button>
        </div>
        <div className="store-progress">
          <div className="store-progress-bar">
            <div className="store-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{boughtCount}/{active.length}</span>
        </div>
      </header>

      {active.length === 0 && (
        <p className="empty">Ta liste est vide. Ajoute des articles avant de partir.</p>
      )}

      {groups.map(group => {
        const remaining = group.items.filter(i => !i.bought)
        const bought = group.items.filter(i => i.bought)
        const done = remaining.length === 0

        return (
          <section key={group.id} className={`store-rayon${done ? ' done' : ''}`}>
            <h3 className="store-rayon-title">
              {done && <Check size={16} />}
              {group.label}
              {done && <span className="store-rayon-done">terminé</span>}
            </h3>

            {remaining.map(item => (
              <StoreRow
                key={item.id}
                item={item}
                bought={false}
                onToggleBought={onToggleBought}
                onLongPress={onLongPress}
              />
            ))}

            {bought.length > 0 && (
              <details className="store-bought">
                <summary>{bought.length} acheté{bought.length > 1 ? 's' : ''}</summary>
                {bought.map(item => (
                  <StoreRow
                    key={item.id}
                    item={item}
                    bought
                    onToggleBought={onToggleBought}
                    onLongPress={onLongPress}
                  />
                ))}
              </details>
            )}
          </section>
        )
      })}

      {adding ? (
        <form className="store-quickadd" onSubmit={submitQuickAdd}>
          <input
            autoFocus
            type="text"
            value={term}
            onChange={e => setTerm(e.target.value)}
            placeholder="Article oublié…"
          />
          <button type="submit" className="btn-save">Ajouter</button>
          <button
            type="button"
            className="btn-modify"
            onClick={() => { setAdding(false); setTerm('') }}
          >
            <X size={18} />
          </button>
        </form>
      ) : (
        <button
          className="store-fab"
          onClick={() => setAdding(true)}
          aria-label="Ajouter un article oublié"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  )
}
