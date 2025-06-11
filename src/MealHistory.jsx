import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { format } from 'date-fns';

export default function MealHistory() {
  const user = { uid: 'sharedFamily' };
  const plansRef = collection(db, 'families', user.uid, 'mealPlans');

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

  if (history.length === 0) {
    return (
      <section className="meal-history">
        <h3>Historique des repas</h3>
        <p>Aucun historique.</p>
      </section>
    );
  }

  return (
    <section className="meal-history">
      <h3>Historique des repas</h3>
      {history.map(week => (
        <details key={week.id} className="history-week">
          <summary>Semaine {week.id}</summary>
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
                  {times.map(t => (
                    <td key={t}>
                      <span>{week[day]?.[t] || '—'}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </section>
  );
}
