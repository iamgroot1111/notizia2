import { useEffect, useRef, useState } from 'react'
import NavBar, { type Tab } from './components/NavBar'
import ClientsPage from './pages/ClientsPage'
import SessionsPage from './pages/SessionsPage'
import ReportPage from './pages/ReportPage'
// import ExportPage from './pages/ExportPage' // optional

const KNOWN_TABS = ['clients', 'sessions', 'report'] as const

function isTab(x: string): x is Tab {
  // includes() liefert nur boolean; der Type-Guard macht daraus Tab‑Narrowing
  return (KNOWN_TABS as readonly string[]).includes(x)
}

function parseTabFromHash(hash: string): Tab | null {
  const raw = hash.replace(/^#/, '')
  return isTab(raw) ? raw : null
}

export default function App() {
  const [active, setActive] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'clients' as Tab
    return parseTabFromHash(window.location.hash) ?? ('clients' as Tab)
  })

  const mainRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash !== `#${active}`) {
        window.history.replaceState(null, '', `#${active}`)
      }
    }
    mainRef.current?.focus()
  }, [active])

  const scrollToId = (id: string) => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
      ;(el as HTMLElement).focus?.()
    }
  }

  const handleGoToClient = (id: string | number) => {
    setActive('clients')
    const defer =
      typeof queueMicrotask === 'function'
        ? queueMicrotask
        : (cb: () => void) => setTimeout(cb, 0)
    defer(() => scrollToId(`client-${id}`))
  }

  return (
    <div className="container">
      <a href="#main" className="skipLink">Zum Inhalt springen</a>

      <div className="topbar">
        <div className="headerBar" role="banner">
          <img src="/notizia_logo.png" alt="Notizia" className="logo" />
          <h1 className="title">Heilerfolge sichtbar machen</h1>
        </div>
        <NavBar active={active} onChange={setActive} />
      </div>

      <main id="main" ref={mainRef} role="main" tabIndex={-1}>
        {active === 'clients'  && <ClientsPage />}
        {active === 'sessions' && <SessionsPage onGoToClient={handleGoToClient} />}
        {active === 'report'   && <ReportPage />}
        {/* {active === 'export'   && <ExportPage />} */}
      </main>
    </div>
  )
}
