import { useEffect, useMemo, useState } from 'react'
import { useData, type Session } from '../lib/useData'
import NewSessionPanel from '../components/NewSessionPanel'

type Props = {
  filterClientId?: string | null
  onFilterAcknowledged?: () => void
}

export default function SessionsPage({ filterClientId, onFilterAcknowledged }: Props) {
  const { listSessions, listSessionsByClient, state, getClient, removeSession } = useData()
  const [clientFilter, setClientFilter] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editSessionId, setEditSessionId] = useState<string | null>(null)

  // Übernahme des initialen Filters (aus ClientsPage)
  useEffect(() => {
    if (filterClientId) {
      setClientFilter(filterClientId)
      onFilterAcknowledged?.()
    }
  }, [filterClientId, onFilterAcknowledged])

  const sessions: Session[] = useMemo(() => {
    return clientFilter ? listSessionsByClient(clientFilter) : listSessions()
  }, [clientFilter, listSessions, listSessionsByClient])

  const onNew = () => setPanelOpen(true)

  return (
    <section className="page">
      <header className="pageHeader">
        <h2>Sitzungen</h2>
        <div className="headerActions">
          <select
            className="select"
            value={clientFilter ?? ''}
            onChange={e => setClientFilter(e.target.value || null)}
            aria-label="Klient filtern"
          >
            <option value="">Alle Klienten</option>
            {state.clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="btn btnPrimary" onClick={onNew}>Neue Sitzung</button>
        </div>
      </header>

      {/* Filter-Chip, wenn aktiv */}
      {clientFilter && (
        <div className="chips">
          <span className="chip">
            Klient: {getClient(clientFilter)?.name ?? clientFilter}
            <button className="chipX" aria-label="Filter entfernen" onClick={() => setClientFilter(null)}>×</button>
          </span>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="empty">
          <p>Keine Sitzungen {clientFilter ? 'für diesen Klienten' : ''} gefunden.</p>
          <button className="btn btnPrimary" onClick={onNew}>Neue Sitzung anlegen</button>
        </div>
      ) : (
        <ul className="list">
          {sessions.map(s => {
            const c = getClient(s.clientId)
            return (
              <li key={s.id} className="row sessionRow">
                <div className="rowMain">
                  <div className="rowTitle">
                    {new Date(s.date).toLocaleDateString()} · {c?.name ?? 'Unbekannter Klient'}
                  </div>
                  <div className="rowSub">
                    <span>Typ: {s.type || '—'}</span>
                    {s.notes && <span className="sep" />}
                    {s.notes && <span className="muted">{s.notes.slice(0, 80)}{s.notes.length > 80 ? '…' : ''}</span>}
                  </div>
                </div>
                <div className="rowActions">
                  <button className="btn" onClick={() => { setEditSessionId(s.id); setPanelOpen(true) }}>Bearbeiten</button>
                  <button className="btn btnDanger" onClick={() => removeSession(s.id)}>Löschen</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <NewSessionPanel
        open={panelOpen}
        onClose={() => { setPanelOpen(false); setEditSessionId(null) }}
        presetClientId={clientFilter ?? undefined}
        editSessionId={editSessionId}
      />
    </section>
  )
}
