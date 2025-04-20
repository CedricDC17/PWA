// src/MealPlan.jsx
import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { format } from 'date-fns';

export default function MealPlan() {
  const user = { uid: 'sharedFamily' };
  const week = format(new Date(), 'yyyy‑II');
  const planRef = doc(db, 'families', user.uid, 'mealPlans', week);
  const days = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  const times = ['midi','soir'];

  const [plan, setPlan] = useState({});
  useEffect(() => onSnapshot(planRef, s=>setPlan(s.data()||{})), []);

  const edit = async (day, time) => {
    const text = prompt(`Quoi pour ${time} le ${day} ?`, plan[day]?.[time]||'');
    if (text!=null) {
      await setDoc(planRef, {
        ...plan,
        [day]: { ...plan[day], [time]: text }
      });
    }
  };
  const clearPlan = ()=> setDoc(planRef, {});

  return (
    <>
      <table className="meal-table">
        <thead>
          <tr>
            <th>Jour</th>
            {times.map(t=> <th key={t}>{t}</th>)}
          </tr>
        </thead>
        <tbody>
          {days.map(day=>(
            <tr key={day}>
              <td>{day}</td>
              {times.map(t=>(
                <td key={t} onClick={()=>edit(day,t)}>
                  <span>{plan[day]?.[t]||'—'}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button className="clear-plan-btn" onClick={clearPlan}>
        Effacer le planning
      </button>
    </>
  );
}
