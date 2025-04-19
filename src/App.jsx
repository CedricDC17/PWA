import { FamilyProvider } from './FamilyContext'
import ShoppingList from './ShoppingList'
import MealPlan     from './MealPlan'

export default function App(){
  return (
    <FamilyProvider>
      <main>
        <h1>Ma PWA Familiale</h1>
        <ShoppingList/>
        <MealPlan/>
      </main>
    </FamilyProvider>
  )
}
