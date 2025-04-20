// src/App.jsx
import './App.css';
import ShoppingList from './ShoppingList';
import MealPlan from './MealPlan';

export default function App() {
  return (
    <div>
      <div>
        <section>
          <h2>🛒 Liste de courses</h2>
          <div >
            <ShoppingList />
          </div>
        </section>

        <section>
          <h2>🍽️ Planning repas</h2>
          <div>
            <MealPlan />
          </div>
        </section>
      </div>
    </div>);
}