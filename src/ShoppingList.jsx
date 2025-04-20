import { useContext, useEffect, useRef, useState } from 'react'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { db } from './firebase'

export default function ShoppingList() {
  const user = { uid: 'sharedFamily' } // à récupérer depuis le contexte
  const col = collection(db, 'families', user.uid, 'shoppingItems')

  const [items, setItems] = useState([])
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState(1)
  const startYRef = useRef(0)
  const draggingRef = useRef(false)

  useEffect(() => {
    const q = query(col, orderBy('createdAt'))
    return onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const addItem = async () => {
    if (!newName.trim()) return
    await addDoc(col, { name: newName.trim(), quantity: newQty, checked: false, createdAt: Date.now() })
    setNewName('')
    setNewQty(1)
  }

  const toggle = async item => await updateDoc(doc(col, item.id), { checked: !item.checked })
  const remove = async item => await deleteDoc(doc(col, item.id))

  const onPointerDown = e => {
    draggingRef.current = true
    startYRef.current = e.clientY
    e.target.setPointerCapture(e.pointerId)
  }

  const onPointerMove = e => {
    if (!draggingRef.current) return
    const dy = startYRef.current - e.clientY
    if (Math.abs(dy) > 20) {
      setNewQty(q => {
        const next = q + Math.sign(dy)
        return Math.min(20, Math.max(1, next))
      })
      startYRef.current = e.clientY
    }
  }

  const onPointerUp = e => {
    draggingRef.current = false
    e.target.releasePointerCapture(e.pointerId)
  }

  return (
    <div className="h-screen flex justify-center items-center bg-gray-50">
      <div className="w-full max-w-md flex flex-col">
        {/* Shopping List */}
        <ul className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.map(i => (
            <li
              key={i.id}
              className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm text-base"
            >
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={i.checked}
                  onChange={() => toggle(i)}
                  className="h-5 w-5"
                />
                <span className={i.checked ? 'line-through text-gray-400' : 'text-gray-800'}>
                  {i.name} × {i.quantity}
                </span>
              </label>
              <button onClick={() => remove(i)} className="text-red-500 text-lg">
                🗑️
              </button>
            </li>
          ))}
        </ul>

        {/* Add Item */}
        <div className="p-4 bg-white shadow-inner">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Ajouter un article..."
              className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none text-base"
            />
            <div
              className="w-12 h-12 border border-gray-300 rounded flex items-center justify-center text-base select-none cursor-grab hover:bg-gray-100"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{ userSelect: 'none' }}
            >
              {newQty}
            </div>
            <button
              onClick={addItem}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex-none text-base"
            >
              ➕
            </button>
          </div>
          <div className="text-center text-sm text-gray-600 mt-1">
            Glisse sur le nombre pour ajuster la quantité
          </div>
        </div>
      </div>
    </div>
  )
}