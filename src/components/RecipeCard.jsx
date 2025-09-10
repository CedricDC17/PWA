import React from 'react'

export default function RecipeCard({ recipe, onSelect }) {
  return (
    <div className="card" onClick={() => onSelect(recipe)}>
      {recipe.imageUrl && (
        <img src={recipe.imageUrl} alt="" className="card-thumb" />
      )}
      <h3 className="card-title">{recipe.title}</h3>
    </div>
  )
}
