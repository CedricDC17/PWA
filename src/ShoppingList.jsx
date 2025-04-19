// src/ShoppingList.jsx
import { useContext, useEffect, useState } from 'react'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { db } from './firebase'
import { FamilyCtx } from './FamilyContext'

export default function ShoppingList() {
    const FAMILY_ID = "sharedFamily";    // ou un code que vous partagez
    const familyRef = doc(db, "families", FAMILY_ID);
    const itemsCol = collection(familyRef, "shoppingItems");
    const [items, setItems] = useState([])

    useEffect(() => {
        const q = query(col, orderBy('createdAt'))
        return onSnapshot(q, snap => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        })
    }, [])

    const add = async name => {
        await addDoc(col, { name, quantity: 1, checked: false, createdAt: Date.now() })
    }
    const toggle = async item => {
        await updateDoc(doc(col, item.id), { checked: !item.checked })
    }
    const remove = async item => {
        await deleteDoc(doc(col, item.id))
    }

    return (
        <div>
            <h2>Liste de courses</h2>
            <ul>
                {items.map(i => (
                    <li key={i.id}>
                        <input type="checkbox" checked={i.checked} onChange={() => toggle(i)} />
                        {i.quantity}× {i.name}
                        <button onClick={() => remove(i)}>🗑</button>
                    </li>
                ))}
            </ul>
            <button onClick={() => { const name = prompt('Nom'); name && add(name) }}>
                ➕ Ajouter un article
            </button>
        </div>
    )
}
