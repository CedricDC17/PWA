import { Menu, X, ShoppingBasket, CalendarDays, BookOpen } from 'lucide-react'

const PAGES = [
  { id: 'shopping', label: 'Courses', icon: ShoppingBasket },
  { id: 'meal', label: 'Repas', icon: CalendarDays },
  { id: 'recipes', label: 'Recettes', icon: BookOpen },
]

export default function Sidebar({ page, onNavigate, open, onOpen, onClose }) {
  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={onOpen}
        aria-label="Ouvrir le menu"
      >
        <Menu />
      </button>

      <div
        className={`sidebar-backdrop${open ? ' open' : ''}`}
        onClick={onClose}
      />

      <nav
        className={`sidebar-drawer${open ? ' open' : ''}`}
        aria-hidden={!open}
      >
        <div className="sidebar-header">
          <img src="/icons/icon-192.png" alt="" />
          <span>Liste Courses</span>
          <button
            className="btn-close"
            style={{ position: 'static', marginLeft: 'auto' }}
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        {PAGES.map(item => {
          const Icon = item.icon
          return (
            <a
              key={item.id}
              href="#"
              className={page === item.id ? 'active' : ''}
              onClick={e => {
                e.preventDefault()
                onNavigate(item.id)
                onClose()
              }}
            >
              <Icon />
              {item.label}
            </a>
          )
        })}
      </nav>
    </>
  )
}
