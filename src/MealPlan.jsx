// src/MealPlan.jsx
import { useContext, useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { FamilyCtx } from './FamilyContext'
import { format } from 'date-fns'

export default function MealPlan() {
    const user = useContext(FamilyCtx)
    const week = format(new Date(), 'yyyy‑II') // II = ISO week
    const docRef = doc(db, 'families', user.uid, 'mealPlans', week)
    const [plan, setPlan] = useState({})

    useEffect(() => onSnapshot(docRef, d => setPlan(d.data() || {})), [])

    const edit = async (day, meal) => {
        const text = prompt(`Quoi pour ${meal} le ${day}?`, plan[day]?.[meal] || '')
        if (text != null) {
            await setDoc(docRef, {
                ...plan,
                [day]: { ...plan[day], [meal]: text }
            })
        }
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const meals = ['breakfast', 'lunch', 'dinner']

    return (
        <div>
            <h2>Planning repas (semaine {week})</h2>
            <table>
                <thead>
                    <tr><th>Jour</th>{meals.map(m => <th key={m}>{m}</th>)}</tr>
                </thead>
                <tbody>
                    {days.map(day =>
                        <tr key={day}>
                            <td>{day}</td>
                            {meals.map(m => (
                                <td key={m} onClick={() => edit(day, m)}>
                                    {plan[day]?.[m] || '—'}
                                </td>
                            ))}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
