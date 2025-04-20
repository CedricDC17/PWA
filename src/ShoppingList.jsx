// src/ShoppingList.jsx
import { useEffect, useState } from 'react';
import {
  collection, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, query, orderBy
} from 'firebase/firestore';
import { db } from './firebase';

export default function ShoppingList() {
  const user = { uid: 'sharedFamily' };
  const col  = collection(db, 'families', user.uid, 'shoppingItems');

  const [items, setItems] = useState([]);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty]   = useState(1);

  useEffect(() => {
    const q = query(col, orderBy('createdAt'));
    return onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    });
  }, []);

  const addItem = async () => {
    if (!newName.trim()) return;
    await addDoc(col, { name:newName.trim(), quantity:newQty, checked:false, createdAt:Date.now() });
    setNewName(''); setNewQty(1);
  };
  const toggle = item => updateDoc(doc(col,item.id), { checked: !item.checked });
  const clearSelected = async () => {
    for (const i of items.filter(i=>i.checked)) {
      await deleteDoc(doc(col,i.id));
    }
  };
  const clearAll = async () => {
    for (const i of items) {
      await deleteDoc(doc(col,i.id));
    }
  };

  return (
    <>
      <ul className="shopping-items">
        {items.map(i => (
          <li key={i.id}>
            <label>
              <input
                type="checkbox"
                checked={i.checked}
                onChange={()=>toggle(i)}
              />
              <span className={i.checked ? 'checked' : ''}>
                {i.name} × {i.quantity}
              </span>
            </label>
            <button onClick={()=>deleteDoc(doc(col,i.id))}>🗑️</button>
          </li>
        ))}
      </ul>

      <div className="shopping-form">
        <input
          type="text"
          value={newName}
          onChange={e=>setNewName(e.target.value)}
          placeholder="Ajouter un article…"
        />
        <select
          value={newQty}
          onChange={e=>setNewQty(+e.target.value)}
        >
          {[...Array(20)].map((_,i)=>
            <option key={i} value={i+1}>{i+1}</option>
          )}
        </select>
        <button onClick={addItem}>➕</button>
      </div>

      <div className="shopping-actions">
        <button onClick={clearSelected}>Effacer sélectionnés</button>
        <button className="clear-all" onClick={clearAll}>Effacer la liste</button>
      </div>
    </>
  );
}
