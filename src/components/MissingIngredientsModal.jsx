import { useState } from 'react'

export default function MissingIngredientsModal({ recipe, onDone, onClose }) {
  const ingredients = recipe.ingredients || []
  const [checked, setChecked] = useState(() => ingredients.map(() => true))

  const toggle = i =>
    setChecked(arr => arr.map((v, idx) => (idx === i ? !v : v)))

  const submit = () => {
    const missing = ingredients
      .filter((_, i) => checked[i])
      .map(ing => ing.name)
      .filter(Boolean)
    onDone(missing)
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
        <h2 className="overlay-title">Il te manque quoi ?</h2>
        <p className="missing-hint">
          « {recipe.title} » — décoche ce que tu as déjà à la maison, le reste part dans la liste de courses.
        </p>

        {ingredients.length === 0 ? (
          <p className="recipe-picker-empty">Cette recette n'a pas d'ingrédients renseignés.</p>
        ) : (
          <div className="missing-ingredients-list">
            {ingredients.map((ing, i) => (
              <label className="missing-ingredient-row" key={i}>
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={() => toggle(i)}
                />
                {ing.quantity && <span className="qty">{ing.quantity}</span>}
                <span>{ing.name}</span>
              </label>
            ))}
          </div>
        )}

        <div className="overlay-footer">
          <button className="btn-modify" onClick={() => onDone([])}>
            Passer
          </button>
          <button className="btn-save" onClick={submit}>
            Ajouter à la liste de courses
          </button>
        </div>
      </div>
    </div>
  )
}
