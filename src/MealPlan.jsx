// src/MealPlan.jsx
import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { format } from 'date-fns';
import MealHistory from './MealHistory';
import MealEditor from './components/MealEditor';

export default function MealPlan() {
  const user = { uid: 'sharedFamily' };
  const week = format(new Date(), 'yyyy‑II');
  const planRef = doc(db, 'families', user.uid, 'mealPlans', week);
  const days = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  const times = ['midi','soir'];

  const [plan, setPlan] = useState({});
  useEffect(() => onSnapshot(planRef, s=>setPlan(s.data()||{})), []);

  const [editing, setEditing] = useState(null);
  const startEdit = (day, time) =>
    setEditing({ day, time, value: plan[day]?.[time] || '' });
  const submitEdit = async text => {
    if (!editing) return;
    await setDoc(planRef, {
      ...plan,
      [editing.day]: { ...plan[editing.day], [editing.time]: text }
    });
    setEditing(null);
  };
  const cancelEdit = () => setEditing(null);
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
                  onClick={()=>startEdit(day,t)}
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
      {editing && (
        <MealEditor
          day={editing.day}
          time={editing.time}
          initialValue={editing.value}
          onSubmit={submitEdit}
          onCancel={cancelEdit}
        />
      )}
    </>
  );
}
