// src/App.jsx
import { useState, useContext } from 'react'
import './App.css'
import { FamilyProvider, FamilyCtx } from './FamilyContext'
import ShoppingList from './ShoppingList'
import MealPlan from './MealPlan'
import Recipes from './Recipes'

function AppContent() {
  const { logout } = useContext(FamilyCtx)
  const [page, setPage] = useState('shopping')

  return (
    <>
      {/* Barre de navigation */}
      <div className="navbar-wrapper">
        <nav className="navbar">
          <a
            href="#"
            className={page === 'shopping' ? 'active' : ''}
            onClick={e => { e.preventDefault(); setPage('shopping') }}
          >
            🛒 Courses
          </a>
          <a
            href="#"
            className={page === 'meal' ? 'active' : ''}
            onClick={e => { e.preventDefault(); setPage('meal') }}
          >
            🍽️ Repas
          </a>
          <a
            href="#"
            className={page === 'recipes' ? 'active' : ''}
            onClick={e => { e.preventDefault(); setPage('recipes') }}
          >
            📒 Recettes
          </a>
          <button className="btn-small" onClick={logout}>Déconnexion</button>
        </nav>
      </div>

      <main>
        {page === 'shopping' && (
            <ShoppingList />
        )}

        {page === 'meal' && (
          <section className="meal-container">
            <h2>🍽️ Planning repas</h2>
            <MealPlan />
          </section>
        )}

        {page === 'recipes' && (
          <section className="recipes-container">
            <Recipes />
          </section>
        )}
      </main>
    </>
  )
}

export default function App() {
  return (
    <FamilyProvider>
      <AppContent />
    </FamilyProvider>
  )
}
