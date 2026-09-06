// src/MealPlan.jsx
import { useEffect, useState } from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  collection,
  getDocs,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { format } from 'date-fns';
import MealRecipePicker from './components/MealRecipePicker';
import MissingIngredientsModal from './components/MissingIngredientsModal';
import { toDisplayName, findExact } from './utils/normalize';
import { detectRayon } from './utils/rayons';
import { parseQuantityForShopping } from './utils/units';

const FAMILY_ID = 'sharedFamily';

export default function MealPlan() {
  const week = format(new Date(), 'yyyy‑II');
  const planRef = doc(db, 'families', FAMILY_ID, 'mealPlans', week);
  const days = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  const times = ['midi','soir'];

  const [plan, setPlan] = useState({});
  useEffect(() => onSnapshot(planRef, s => setPlan(s.data() || {})), []);

  // Étape 1 : choisir une recette pour un créneau
  const [picker, setPicker] = useState(null); // { day, time }
  // Étape 2 : cocher les ingrédients manquants
  const [missingStep, setMissingStep] = useState(null); // { day, time, recipe }

  const openPicker = (day, time) => setPicker({ day, time });
  const closePicker = () => setPicker(null);

  const assignRecipe = async recipe => {
    if (!picker) return;
    const { day, time } = picker;
    await setDoc(planRef, {
      ...plan,
      [day]: { ...plan[day], [time]: { recipeId: recipe.id, title: recipe.title } }
    });
    setPicker(null);
    if (recipe.ingredients?.length) {
      setMissingStep({ day, time, recipe });
    }
  };

  // Repas libre : simple étiquette, sans fiche recette ni étape ingrédients.
  const assignFreeMeal = async text => {
    if (!picker) return;
    const title = text.trim();
    if (!title) return;
    const { day, time } = picker;
    await setDoc(planRef, {
      ...plan,
      [day]: { ...plan[day], [time]: { title, free: true } }
    });
    setPicker(null);
  };

  const removeSlot = (day, time, e) => {
    e.stopPropagation();
    const dayPlan = { ...plan[day] };
    delete dayPlan[time];
    setDoc(planRef, { ...plan, [day]: dayPlan });
  };

  const clearPlan = () => setDoc(planRef, {});

  // Ajoute les ingrédients manquants à la liste de courses (families/{id}/shoppingItems),
  // en reportant quantité et unité quand elles ont un sens pour les achats.
  const addIngredientsToShoppingList = async ingredients => {
    const col = collection(db, 'families', FAMILY_ID, 'shoppingItems');
    const snap = await getDocs(col);
    const existing = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    for (const ing of ingredients) {
      const name = toDisplayName(ing.name);
      if (!name) continue;
      const { quantity, unit } = parseQuantityForShopping(ing.quantity);
      const match = findExact(existing, name);

      if (match) {
        await updateDoc(doc(db, 'families', FAMILY_ID, 'shoppingItems', match.id), {
          checked: true,
          bought: false,
          useCount: (match.useCount || 0) + 1,
          // on ne remplace pas une quantité déjà saisie à la main
          ...(quantity && !match.quantity ? { quantity, unit: unit || null } : {}),
        });
      } else {
        await addDoc(col, {
          name,
          checked: true,
          bought: false,
          favored: false,
          rayon: detectRayon(name),
          quantity: quantity || null,
          unit: unit || null,
          useCount: 1,
          createdAt: Date.now()
        });
      }
    }
  };

  const handleMissingDone = async missing => {
    if (missing.length) {
      await addIngredientsToShoppingList(missing);
    }
    setMissingStep(null);
  };

  return (
    <>
      <table className="meal-table">
        <thead>
          <tr>
            <th>Jour</th>
            {times.map(t => <th key={t}>{t}</th>)}
          </tr>
        </thead>
        <tbody>
          {days.map(day => (
            <tr key={day}>
              <td>{day}</td>
              {times.map(t => {
                const slot = plan[day]?.[t];
                return (
                  <td key={t} onClick={() => openPicker(day, t)}>
                    {slot?.title ? (
                      <>
                        <span className={`slot-title${slot.free ? ' slot-free' : ''}`}>
                          {slot.title}
                        </span>
                        <button
                          className="slot-remove"
                          onClick={e => removeSlot(day, t, e)}
                          aria-label="Retirer ce repas"
                        >
                          ✖
                        </button>
                      </>
                    ) : (
                      <span className="slot-empty">+</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <button className="clear-plan-btn" onClick={clearPlan}>
        Effacer le planning
      </button>

      {picker && (
        <MealRecipePicker
          day={picker.day}
          time={picker.time}
          onSelect={assignRecipe}
          onSelectFree={assignFreeMeal}
          onClose={closePicker}
        />
      )}

      {missingStep && (
        <MissingIngredientsModal
          recipe={missingStep.recipe}
          onDone={handleMissingDone}
          onClose={() => setMissingStep(null)}
        />
      )}
    </>
  );
}
