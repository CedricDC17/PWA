import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { format } from 'date-fns';

export default function MealHistory() {
  const user = { uid: 'sharedFamily' };
  const plansRef = collection(db, 'families', user.uid, 'mealPlans');

  const [editing, setEditing] = useState(false);
  const [hidden, setHidden] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hiddenMealIdeas')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('hiddenMealIdeas', JSON.stringify(hidden));
  }, [hidden]);

  const [weeks, setWeeks] = useState([]);
  useEffect(() =>
    onSnapshot(plansRef, snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      arr.sort((a, b) => (a.id < b.id ? 1 : -1));
      setWeeks(arr);
    }),
  []);

  const currentWeek = format(new Date(), 'yyyy‑II');
  const days  = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  const times = ['midi','soir'];

  const history = weeks.filter(w => w.id !== currentWeek);

  // Récupère la liste unique des plats précédemment planifiés
  let pastDishes = Array.from(
    new Set(
      history.flatMap(week =>
        days.flatMap(d => times.map(t => week[d]?.[t]).filter(Boolean))
      )
    )
  ).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  pastDishes = pastDishes.filter(d => !hidden.includes(d));

  if (pastDishes.length === 0) {
    return (
      <section className="meal-history">
        <h3>Plats précédents</h3>
        <p>Aucun historique.</p>
      </section>
    );
  }

  return (
    <section className="meal-history">
      <div className="ideas-header">
        <h3>Plats précédents</h3>
        <button onClick={() => setEditing(e => !e)}>
          {editing ? 'Terminé' : 'Modifier'}
        </button>
      </div>
      <div className="ideas-list">
        {pastDishes.map(dish => (
          <div
            key={dish}
            className="dish-card"
            draggable
            onDragStart={e => {
              e.dataTransfer.setData('text/plain', dish)
            }}
          >
            {dish}
            {editing && (
              <button
                className="btn-remove-dish"
                onClick={e => {
                  e.stopPropagation()
                  setHidden(h => [...h, dish])
                }}
                title="Supprimer"
              >
                ✖
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
