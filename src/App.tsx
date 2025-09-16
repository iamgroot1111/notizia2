import { useEffect, useState } from 'react'
import NavBar, { type Tab } from './components/NavBar'
import ClientsPage from './pages/ClientsPage'
import SessionsPage from './pages/SessionsPage'
import ReportPage from './pages/ReportPage'

/** Hash -> Tab (clients | sessions | report) */
function parseTabFromHash(hash: string): Tab | null {
  const raw = hash.replace(/^#\/?/, '')
  return raw === 'clients' || raw === 'sessions' || raw === 'report' ? raw : null
}

export default function App() {
  // Startzustand aus der URL lesen (oder 'clients')
  const [active, setActive] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'clients'
    return parseTabFromHash(window.location.hash) ?? 'clients'
  })
  // Key, um die SessionsPage beim Menü-Klick neu zu montieren
  const [sessionsKey, setSessionsKey] = useState(0)

  // Auf Hash-Änderungen reagieren → active setzen
  useEffect(() => {
    const onHashChange = () => {
      const t = parseTabFromHash(window.location.hash)
      if (t) setActive(t)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // active -> Hash spiegeln (nur wenn abweichend)
  useEffect(() => {
    const h = (window.location.hash || '').replace(/^#\/?/, '')
    if (h !== active) window.history.replaceState(null, '', `#${active}`)
  }, [active])

  // Menüwechsel behandeln (Sitzungen immer neutral & frisch)
  function handleNavChange(tab: Tab) {
    if (tab === 'sessions') {
      // Kontext leeren -> neutrale Sitzungen
      sessionStorage.removeItem('sessionsClientId')
      sessionStorage.removeItem('sessionsCaseId')
      sessionStorage.removeItem('openSessionId')
      sessionStorage.removeItem('openCreateSession')
      // Frisch montieren, damit wirklich alles zurückgesetzt ist
      setSessionsKey((k) => k + 1)
    }
    setActive(tab)
  }

  // Aus Sitzungen zu einem Klienten springen (optional)
  function goToClient(id: number) {
    setActive('clients')
    // Nach dem Tabwechsel zum Klienten scrollen
    setTimeout(() => {
      document.getElementById(`client-${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 0)
  }

  return (
    <div className="container">
      {/* Skip-Link für Screenreader/Keyboard */}
      <a href="#main" className="skipLink">Zum Inhalt springen</a>

      {/* Sticky Topbar */}
      <div className="topbar">
        <div className="headerBar" role="banner">
          <img src="/notizia_logo.png" alt="Notizia" className="logo" />
          <h1 className="title">Heilerfolge sichtbar machen</h1>
        </div>
        <NavBar active={active} onChange={handleNavChange} />
      </div>

      {/* Hauptbereich */}
      <main id="main" role="main" tabIndex={-1}>
        {active === 'clients' && <ClientsPage />}

        {active === 'sessions' && (
          <SessionsPage
            key={sessionsKey}
            onGoToClient={goToClient}   // optional, falls deine Seite das nutzt
          />
        )}

        {active === 'report' && <ReportPage />}
      </main>
    </div>
  )
}
