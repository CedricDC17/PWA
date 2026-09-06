// src/components/ItemActionMenu.jsx
import { useState } from 'react'
import { Star, StarOff, Tag, Hash, Trash2, ChevronLeft } from 'lucide-react'
import { RAYONS, rayonLabel } from '../utils/rayons'
import { UNITS } from '../utils/units'

/**
 * Menu d'actions ouvert par appui long sur un article.
 * Trois vues : menu principal, choix du rayon, choix de la quantité.
 */
export default function ItemActionMenu({
  item,
  onClose,
  onToggleFavorite,
  onSetRayon,
  onSetQuantity,
  onDelete,
}) {
  const [view, setView] = useState('menu')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [qty, setQty] = useState(item.quantity || 1)
  const [unit, setUnit] = useState(item.unit || '')

  const close = () => {
    setView('menu')
    setConfirmDelete(false)
    onClose()
  }

  const validateQuantity = () => {
    onSetQuantity(item, Number(qty) || 1, unit || null)
    close()
  }

  return (
    <div
      className="sheet-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />

        {view === 'menu' && (
          <>
            <h3 className="sheet-title">{item.name}</h3>
            <p className="sheet-subtitle">{rayonLabel(item.rayon)}</p>

            <button
              className="sheet-action"
              onClick={() => { onToggleFavorite(item); close() }}
            >
              {item.favored ? <StarOff size={20} /> : <Star size={20} />}
              {item.favored ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            </button>

            <button className="sheet-action" onClick={() => setView('rayon')}>
              <Tag size={20} />
              Changer le rayon
            </button>

            <button className="sheet-action" onClick={() => setView('quantity')}>
              <Hash size={20} />
              {item.checked ? 'Modifier la quantité' : 'Ajouter avec une quantité'}
            </button>

            <button
              className={`sheet-action danger${confirmDelete ? ' confirming' : ''}`}
              onClick={() => {
                if (confirmDelete) { onDelete(item); close() }
                else setConfirmDelete(true)
              }}
            >
              <Trash2 size={20} />
              {confirmDelete ? 'Confirmer la suppression ?' : 'Supprimer définitivement'}
            </button>
          </>
        )}

        {view === 'rayon' && (
          <>
            <button className="sheet-back" onClick={() => setView('menu')}>
              <ChevronLeft size={18} /> Retour
            </button>
            <h3 className="sheet-title">Rayon de « {item.name} »</h3>
            <div className="sheet-options">
              {RAYONS.map(r => (
                <button
                  key={r.id}
                  className={`sheet-option${item.rayon === r.id ? ' selected' : ''}`}
                  onClick={() => { onSetRayon(item, r.id); close() }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </>
        )}

        {view === 'quantity' && (
          <>
            <button className="sheet-back" onClick={() => setView('menu')}>
              <ChevronLeft size={18} /> Retour
            </button>
            <h3 className="sheet-title">Quantité pour « {item.name} »</h3>

            <div className="qty-row">
              <button
                className="qty-step"
                onClick={() => setQty(q => Math.max(1, Number(q) - 1))}
                aria-label="Diminuer"
              >
                −
              </button>
              <input
                className="qty-input"
                type="number"
                min="1"
                value={qty}
                onChange={e => setQty(e.target.value)}
              />
              <button
                className="qty-step"
                onClick={() => setQty(q => Number(q) + 1)}
                aria-label="Augmenter"
              >
                +
              </button>
            </div>

            <label className="qty-unit-label">
              Unité (facultatif)
              <select value={unit} onChange={e => setUnit(e.target.value)}>
                <option value="">— aucune —</option>
                {UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>

            <div className="sheet-footer">
              <button className="btn-modify" onClick={() => setView('menu')}>Annuler</button>
              <button className="btn-save" onClick={validateQuantity}>Valider</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
