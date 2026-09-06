// src/ShoppingList.jsx
import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
} from 'firebase/firestore'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { db, auth } from './firebase'
import './ShoppingList.css'
import { ShoppingCart, Star, ListOrdered } from 'lucide-react'
import { toDisplayName, findExact, findNearDuplicate } from './utils/normalize'
import { detectRayon, resolveRayonOrder, DEFAULT_RAYON_ORDER } from './utils/rayons'
import { formatQuantity } from './utils/units'
import useLongPress from './hooks/useLongPress'
import AddBar from './components/AddBar'
import ItemActionMenu from './components/ItemActionMenu'
import StoreMode from './components/StoreMode'
import RayonOrderEditor from './components/RayonOrderEditor'

const FAMILY_ID = 'sharedFamily'

/* ---------- Lignes (composants locaux : chacun a son propre appui long) ---------- */

function ActiveRow({ item, onToggle, onLongPress }) {
  const handlers = useLongPress(() => onLongPress(item), () => onToggle(item))
  const badge = formatQuantity(item.quantity, item.unit)
  return (
    <li className="shopping-card" {...handlers}>
      <span className="shopping-card-name">{item.name}</span>
      {badge && <span className="qty-badge">{badge}</span>}
      <input type="checkbox" checked readOnly tabIndex={-1} />
    </li>
  )
}

function SuggestionChip({ item, onToggle, onLongPress }) {
  const handlers = useLongPress(() => onLongPress(item), () => onToggle(item))
  const badge = formatQuantity(item.quantity, item.unit)
  return (
    <div
      className={`freq-card${item.checked ? ' is-added' : ''}`}
      {...handlers}
      title={item.checked ? 'Déjà sur la liste — toucher pour retirer' : undefined}
    >
      {item.favored && <Star size={14} className="freq-star" />}
      <span className="freq-name">{item.name}</span>
      {badge && <span className="qty-badge small">{badge}</span>}
    </div>
  )
}

/* ---------------------------------- Écran ---------------------------------- */

export default function ShoppingList() {
  const [items, setItems] = useState([])
  const [rayonOrder, setRayonOrder] = useState(DEFAULT_RAYON_ORDER)
  const [storeMode, setStoreMode] = useState(false)
  const [menuItem, setMenuItem] = useState(null)
  const [showRayonEditor, setShowRayonEditor] = useState(false)
  const [duplicate, setDuplicate] = useState(null) // { name, existing }

  const itemsCol = collection(db, 'families', FAMILY_ID, 'shoppingItems')
  const settingsRef = doc(db, 'families', FAMILY_ID, 'settings', 'shopping')
  const itemRef = id => doc(db, 'families', FAMILY_ID, 'shoppingItems', id)

  // Auth anonyme + écoute temps réel des articles
  useEffect(() => {
    signInAnonymously(auth).catch(console.error)
    let unsubItems
    const unsubAuth = onAuthStateChanged(auth, user => {
      if (!user) return
      const q = query(itemsCol, orderBy('createdAt'))
      unsubItems = onSnapshot(
        q,
        snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        console.error
      )
    })
    return () => {
      unsubAuth()
      unsubItems?.()
    }
  }, [])

  // Ordre des rayons (réglage partagé de la famille)
  useEffect(() => {
    return onSnapshot(
      settingsRef,
      snap => setRayonOrder(resolveRayonOrder(snap.data()?.rayonOrder)),
      console.error
    )
  }, [])

  /* ------------------------------ Actions ------------------------------ */

  // Ajoute un article (ou le remet sur la liste s'il est déjà connu)
  const addOrCheck = async (rawName, { force = false } = {}) => {
    const name = toDisplayName(rawName)
    if (!name) return

    const exact = findExact(items, name)
    if (exact) {
      await updateDoc(itemRef(exact.id), {
        checked: true,
        bought: false,
        useCount: (exact.useCount || 0) + 1,
      })
      return
    }

    if (!force) {
      const near = findNearDuplicate(items, name)
      if (near) {
        setDuplicate({ name, existing: near })
        return
      }
    }

    await addDoc(itemsCol, {
      name,
      checked: true,
      bought: false,
      favored: false,
      rayon: detectRayon(name),
      quantity: null,
      unit: null,
      useCount: 1,
      createdAt: Date.now(),
    })
  }

  // Un tap bascule dans les deux sens : sur la liste <-> hors de la liste.
  // En sortant, la quantité repart à zéro (elle vaut pour ces courses-là) mais
  // l'unité reste mémorisée : les pommes de terre se rachètent en kg.
  const toggleItem = item =>
    item.checked
      ? updateDoc(itemRef(item.id), { checked: false, bought: false, quantity: null })
      : updateDoc(itemRef(item.id), {
          checked: true,
          bought: false,
          useCount: (item.useCount || 0) + 1,
        })

  const toggleFavorite = item =>
    updateDoc(itemRef(item.id), { favored: !item.favored })

  const setRayon = (item, rayon) => updateDoc(itemRef(item.id), { rayon })

  const setQuantity = (item, quantity, unit) =>
    updateDoc(itemRef(item.id), {
      quantity,
      unit,
      checked: true,
      bought: false,
      useCount: item.checked ? (item.useCount || 0) : (item.useCount || 0) + 1,
    })

  const removeItem = item => deleteDoc(itemRef(item.id))

  const saveRayonOrder = order => {
    setRayonOrder(order)
    setDoc(settingsRef, { rayonOrder: order }, { merge: true }).catch(console.error)
  }

  /* --------------------------- Mode magasin --------------------------- */

  const enterStoreMode = async () => {
    // Nettoie d'éventuels "achetés" restés d'une sortie précédente interrompue
    await Promise.all(
      items.filter(i => i.bought).map(i => updateDoc(itemRef(i.id), { bought: false }))
    )
    setStoreMode(true)
  }

  const toggleBought = (item, value) =>
    updateDoc(itemRef(item.id), { bought: value })

  // À la sortie : ce qui est acheté quitte la liste active, le reste y demeure.
  // Rien n'est supprimé de l'historique ; seule la quantité est remise à zéro
  // pour ne pas traîner d'une semaine sur l'autre (l'unité, elle, est gardée).
  const exitStoreMode = async () => {
    await Promise.all(
      items
        .filter(i => i.bought)
        .map(i =>
          updateDoc(itemRef(i.id), { checked: false, bought: false, quantity: null })
        )
    )
    setStoreMode(false)
  }

  /* ------------------------------ Tri ------------------------------ */

  const activeItems = useMemo(
    () =>
      items
        .filter(i => i.checked)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [items]
  )

  // Toutes les entrées jamais saisies : favoris en tête, puis les plus utilisées.
  // L'ordre ne dépend pas de l'état "sur la liste" pour que rien ne bouge sous le doigt.
  const suggestions = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (!!b.favored !== !!a.favored) return b.favored ? 1 : -1
        const diff = (b.useCount || 0) - (a.useCount || 0)
        if (diff !== 0) return diff
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      }),
    [items]
  )

  /* ------------------------------ Rendu ------------------------------ */

  if (storeMode) {
    return (
      <>
        <StoreMode
          items={items}
          rayonOrder={rayonOrder}
          onToggleBought={toggleBought}
          onQuickAdd={name => addOrCheck(name, { force: true })}
          onLongPress={setMenuItem}
          onExit={exitStoreMode}
        />
        {menuItem && (
          <ItemActionMenu
            item={items.find(i => i.id === menuItem.id) || menuItem}
            onClose={() => setMenuItem(null)}
            onToggleFavorite={toggleFavorite}
            onSetRayon={setRayon}
            onSetQuantity={setQuantity}
            onDelete={removeItem}
          />
        )}
      </>
    )
  }

  return (
    <div className="shopping-container">
      <div className="shopping-header">
        <h2>Liste de courses</h2>
        <button
          className="btn-icon"
          onClick={() => setShowRayonEditor(true)}
          aria-label="Ordre des rayons"
          title="Ordre des rayons"
        >
          <ListOrdered size={18} />
        </button>
      </div>

      <button className="store-mode-btn" onClick={enterStoreMode}>
        <ShoppingCart size={18} />
        Faire les courses
        {activeItems.length > 0 && <span className="count">{activeItems.length}</span>}
      </button>

      <AddBar items={items} onAdd={addOrCheck} />

      <ul className="shopping-list">
        {activeItems.length === 0 && <p className="empty">Liste vide</p>}
        {activeItems.map(item => (
          <ActiveRow
            key={item.id}
            item={item}
            onToggle={toggleItem}
            onLongPress={setMenuItem}
          />
        ))}
      </ul>

      <section className="suggestions-section">
        <h3>Suggestions</h3>
        {suggestions.length === 0 && <p className="empty">Aucun article enregistré</p>}
        <div className="suggestions-list">
          {suggestions.map(item => (
            <SuggestionChip
              key={item.id}
              item={item}
              onToggle={toggleItem}
              onLongPress={setMenuItem}
            />
          ))}
        </div>
        {suggestions.length > 0 && (
          <p className="suggestions-hint">
            Appui long sur un article pour les favoris, le rayon, la quantité ou le supprimer.
          </p>
        )}
      </section>

      {menuItem && (
        <ItemActionMenu
          item={items.find(i => i.id === menuItem.id) || menuItem}
          onClose={() => setMenuItem(null)}
          onToggleFavorite={toggleFavorite}
          onSetRayon={setRayon}
          onSetQuantity={setQuantity}
          onDelete={removeItem}
        />
      )}

      {showRayonEditor && (
        <RayonOrderEditor
          order={rayonOrder}
          onChange={saveRayonOrder}
          onClose={() => setShowRayonEditor(false)}
        />
      )}

      {duplicate && (
        <div
          className="overlay"
          onClick={e => {
            if (e.target === e.currentTarget) setDuplicate(null)
          }}
        >
          <div className="overlay-content" onClick={e => e.stopPropagation()}>
            <h2 className="overlay-title">Article déjà connu ?</h2>
            <p className="missing-hint">
              « {duplicate.name} » ressemble beaucoup à « {duplicate.existing.name} »,
              déjà enregistré.
            </p>
            <div className="overlay-footer">
              <button
                className="btn-modify"
                onClick={() => {
                  const name = duplicate.name
                  setDuplicate(null)
                  addOrCheck(name, { force: true })
                }}
              >
                Créer quand même
              </button>
              <button
                className="btn-save"
                onClick={() => {
                  const existing = duplicate.existing
                  setDuplicate(null)
                  toggleItem({ ...existing, checked: false })
                }}
              >
                Utiliser « {duplicate.existing.name} »
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
