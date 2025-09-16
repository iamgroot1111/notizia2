import { useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import NavBar, { type Tab } from './components/NavBar'
import ClientsPage from './pages/ClientsPage'
import SessionsPage from './pages/SessionsPage'
import ReportPage from './pages/ReportPage'
import { DataProvider } from './lib/DataContext'

/** Für kurzen Sichtbarkeits-Test auf true setzen */
const SMOKE_TEST = false

function parseTabFromHash(hash: string): Tab | null {
  const raw = hash.replace(/^#/, '')
  return raw === 'clients' || raw === 'sessions' || raw === 'report' ? (raw as Tab) : null
}

/** ---- Alle Hooks leben hier: KEINE bedingten Returns davor ---- */
function AppShell() {
  const [active, setActive] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'clients' as Tab
    return parseTabFromHash(window.location.hash) ?? ('clients' as Tab)
  })

  // Übergabe eines Client-Filters an die Sitzungsseite
  const [sessionsClientFilter, setSessionsClientFilter] = useState<string | null>(null)

  // A11y + Hash-Sync
  const mainRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wanted = `#${active}`
      if (window.location.hash !== wanted) {
        window.history.replaceState(null, '', wanted)
      }
    }
    mainRef.current?.focus()
  }, [active])

  const openSessionsForClient = (clientId: string) => {
    setSessionsClientFilter(clientId)
    setActive('sessions')
    if (typeof window !== 'undefined') window.history.replaceState(null, '', '#sessions')
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

      <DataProvider>
        <main id="main" ref={mainRef} role="main" tabIndex={-1}>
          {active === 'clients'  && <ClientsPage onOpenSessions={openSessionsForClient} />}
          {active === 'sessions' && (
            <SessionsPage
              filterClientId={sessionsClientFilter}
              onFilterAcknowledged={() => setSessionsClientFilter(null)}
            />
          )}
          {active === 'report'   && <ReportPage />}
        </main>
      </DataProvider>
    </div>
  )
}

/** Optionaler Sichtbarkeits-Test — enthält KEINE Hooks */
function SmokeScreen() {
  return (
    <div style={{ padding: 24, fontSize: 18 }}>
      <h1>✅ App lebt</h1>
      <p>Wenn du das siehst, funktionieren <code>index.html</code>, <code>main.tsx</code> und CSS.</p>
    </div>
  )
}

/** Wrapper ohne Hooks → entscheidet nur, was gerendert wird */
export default function App() {
  return (
    <ErrorBoundary>
      {SMOKE_TEST ? <SmokeScreen /> : <AppShell />}
    </ErrorBoundary>
  )
}
