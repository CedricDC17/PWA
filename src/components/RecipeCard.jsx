// src/components/RecipeCard.jsx
import { CookingPot } from 'lucide-react'

export default function RecipeCard({ recipe, onSelect }) {
  const tags = recipe.tags || []
  const count = recipe.ingredients?.length || 0

  return (
    <button className="recipe-card" onClick={() => onSelect(recipe)}>
      {recipe.imageUrl ? (
        <img src={recipe.imageUrl} alt="" className="recipe-thumb" />
      ) : (
        <div className="recipe-thumb placeholder" aria-hidden="true">
          <CookingPot size={28} />
        </div>
      )}

      <div className="recipe-card-body">
        <h3 className="recipe-card-title">{recipe.title}</h3>

        {tags.length > 0 && (
          <div className="recipe-card-tags">
            {tags.slice(0, 2).map(t => (
              <span key={t} className="tag-chip small">{t}</span>
            ))}
            {tags.length > 2 && <span className="tag-more">+{tags.length - 2}</span>}
          </div>
        )}

        <span className="recipe-card-meta">
          {count > 0 ? `${count} ingrédient${count > 1 ? 's' : ''}` : 'Fiche à compléter'}
        </span>
      </div>
    </button>
  )
}
