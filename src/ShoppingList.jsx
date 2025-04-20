// src/ShoppingList.jsx
import { useEffect, useState } from 'react';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

export default function ShoppingList() {
    const user = { uid: 'sharedFamily' };
    const col = collection(db, 'families', user.uid, 'shoppingItems');

    const [items, setItems] = useState([]);
    const [newName, setNewName] = useState('');
    const [newQty, setNewQty] = useState(1);

    useEffect(() => {
        const q = query(col, orderBy('createdAt'));
        return onSnapshot(q, snap => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }, []);

    const addItem = async () => {
        if (!newName.trim()) return;
        await addDoc(col, {
            name: newName.trim(),
            quantity: newQty,
            checked: false,
            createdAt: Date.now(),
        });
        setNewName('');
        setNewQty(1);
    };

    const toggle = item =>
        updateDoc(doc(col, item.id), { checked: !item.checked });
    const remove = item => deleteDoc(doc(col, item.id));

    return (
        <div className="w-screen flex items-center justify-center">
            <div className="w-full max-w-md p-4 bg-white rounded-lg shadow">
                <ul className="mb-4 space-y-3">
                    {items.map(i => (
                        <li
                            key={i.id}
                            className="flex items-center justify-between"
                        >
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={i.checked}
                                    onChange={() => toggle(i)}
                                    className="h-6 w-6"
                                />
                                <span className={
                                    i.checked
                                        ? 'line-through text-gray-400'
                                        : 'text-gray-800'
                                }>
                                    {i.name}
                                </span>
                            </label>
                            <span className="text-base font-medium">× {i.quantity}</span>
                            <button onClick={() => remove(i)} className="text-red-500 text-xl">
                                🗑️
                            </button>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="Ajouter un article..."
                        className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none text-base"
                    />
                    <select
                        value={newQty}
                        onChange={e => setNewQty(Number(e.target.value))}
                        className="w-16 h-12 border border-gray-300 rounded text-center text-base focus:outline-none"
                    >
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                    <button
                        onClick={addItem}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                    >
                        Ajouter
                    </button>
                </div>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Faites glisser la roulette pour choisir la quantité
                </p>
            </div>
        </div>
    );
}
