// src/components/RayonOrderEditor.jsx
import { ChevronUp, ChevronDown } from 'lucide-react'
import { rayonLabel } from '../utils/rayons'

/**
 * Réorganise les rayons dans l'ordre où on les croise en magasin.
 * Boutons haut/bas plutôt que glisser-déposer : le drag HTML5 ne fonctionne pas
 * de façon fiable au doigt sur mobile, et c'est un réglage qu'on fait une fois.
 */
export default function RayonOrderEditor({ order, onChange, onClose }) {
  const move = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= order.length) return
    const next = [...order]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    onChange(next)
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
        <h2 className="overlay-title">Ordre des rayons</h2>
        <p className="missing-hint">
          Range les rayons dans l'ordre où tu les croises en magasin. Le mode magasin
          suivra cet ordre.
        </p>

        <ul className="rayon-order-list">
          {order.map((id, index) => (
            <li key={id}>
              <span>{rayonLabel(id)}</span>
              <div className="rayon-order-actions">
                <button
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Monter"
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === order.length - 1}
                  aria-label="Descendre"
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="overlay-footer">
          <button className="btn-save" onClick={onClose}>Terminé</button>
        </div>
      </div>
    </div>
  )
}
