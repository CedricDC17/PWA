// src/App.jsx
import { useState } from 'react'
import './App.css'
import { FamilyProvider } from './FamilyContext'
import ShoppingList from './ShoppingList'
import MealPlan from './MealPlan'
import Recipes from './Recipes'
import Sidebar from './components/Sidebar'

export default function App() {
  const [page, setPage] = useState('shopping') // 'shopping' | 'meal' | 'recipes'
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <FamilyProvider>
      <Sidebar
        page={page}
        onNavigate={setPage}
        open={menuOpen}
        onOpen={() => setMenuOpen(true)}
        onClose={() => setMenuOpen(false)}
      />

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
    </FamilyProvider>
  )
}
