// src/MealPlan.jsx
import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { format } from 'date-fns'

export default function MealPlan() {
  // UID partagé comme dans ShoppingList
  const user = { uid: 'sharedFamily' }
  // Semaine ISO
  const week = format(new Date(), 'yyyy\u2011II') // ex. "2025‑16"
  const planRef = doc(db, 'families', user.uid, 'mealPlans', week)
  const [plan, setPlan] = useState({})

  useEffect(() => {
    const unsubscribe = onSnapshot(planRef, snap => {
      setPlan(snap.data() || {})
    })
    return unsubscribe
  }, [])

  const edit = async (day, time) => {
    const current = plan[day]?.[time] || ''
    const text = prompt(`Quoi pour ${time} le ${day} ?`, current)
    if (text != null) {
      await setDoc(planRef, {
        ...plan,
        [day]: { ...plan[day], [time]: text }
      })
    }
  }

  const days = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']
  const times = ['midi','soir']

  return (
    <div className="w-screen min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-bold mb-4">
          Planning repas (semaine {week})
        </h2>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1">Jour</th>
              {times.map(t => (
                <th key={t} className="border px-2 py-1 capitalize">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day}>
                <td className="border px-2 py-1">{day}</td>
                {times.map(t => (
                  <td
                    key={t}
                    className="border px-2 py-1 flex items-center justify-between cursor-pointer"
                    onClick={() => edit(day, t)}
                  >
                    <span>{plan[day]?.[t] || '—'}</span>
                    <button className="text-blue-500">✏️</button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}