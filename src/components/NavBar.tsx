import { useState } from 'react'

export type Tab = 'home' | 'clients' | 'sessions' | 'report'

type Props = { active: Tab; onChange: (t: Tab) => void }

const ITEMS: { key: Tab; label: string }[] = [
  { key: 'clients',  label: 'Klienten'  },
  { key: 'sessions', label: 'Sitzungen' },
  { key: 'report',   label: 'Auswertung' },
]

export default function NavBar({ active, onChange }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <nav className={`nav ${open ? 'navOpen' : ''}`} aria-label="Hauptnavigation">
      <ul id="mainnav" className="navList" role="menubar" aria-label="Menü">
        {ITEMS.map(it => (
          <li key={it.key} role="none">
            <button
              type="button"
              role="menuitem"
              className={`navBtn ${active === it.key ? 'navBtnActive' : ''}`}
              aria-current={active === it.key ? 'page' : undefined}
              onClick={() => { onChange(it.key); setOpen(false) }}
            >
              {it.label}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="burger"
        aria-label="Menü ein-/ausklappen"
        aria-expanded={open}
        aria-controls="mainnav"
        onClick={() => setOpen(o => !o)}
      >☰</button>
    </nav>
  )
}
