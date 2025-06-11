// src/MealPlan.jsx
import { useEffect, useState, useContext } from 'react';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { format } from 'date-fns';
import MealHistory from './MealHistory';
import { FamilyCtx } from './FamilyContext';

export default function MealPlan() {
  const { familyId } = useContext(FamilyCtx);
  const week = format(new Date(), 'yyyy‑II');
  const planRef = doc(db, 'families', familyId, 'mealPlans', week);
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

  const allowDrop = e => e.preventDefault();
  const highlight = e => e.currentTarget.classList.add('dragover');
  const unhighlight = e => e.currentTarget.classList.remove('dragover');
  const onDrop = async (day, time, e) => {
    e.preventDefault();
    unhighlight(e);
    const dish = e.dataTransfer.getData('text/plain');
    if (!dish) return;
    await setDoc(planRef, {
      ...plan,
      [day]: { ...plan[day], [time]: dish }
    });
  };

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
                <td
                  key={t}
                  onClick={()=>edit(day,t)}
                  onDragOver={allowDrop}
                  onDragEnter={highlight}
                  onDragLeave={unhighlight}
                  onDrop={e => onDrop(day, t, e)}
                >
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
      <MealHistory />
    </>
  );
}
