import { useMemo, useState } from 'react'
import { useData, type Client } from '../lib/useData'
import ClientFormModal from '../components/ClientFormModal'
import NewSessionPanel from '../components/NewSessionPanel'

type Props = {
  onOpenSessions?: (clientId: string) => void
}

export default function ClientsPage({ onOpenSessions }: Props) {
  const { listClients, removeClient } = useData()
  const [query, setQuery] = useState('')
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [sessionForClient, setSessionForClient] = useState<string | null>(null)

  const clients = useMemo(() => {
    const q = query.trim().toLowerCase()
    const items = listClients()
    return q ? items.filter(c => c.name.toLowerCase().includes(q)) : items
  }, [listClients, query])

  return (
    <section className="page">
      <header className="pageHeader">
        <h2>Klienten</h2>
        <div className="headerActions">
          <input
            className="search"
            placeholder="Suchen…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Klienten suchen"
          />
          <button className="btn btnPrimary" onClick={() => setCreateOpen(true)}>Neuer Klient</button>
        </div>
      </header>

      {clients.length === 0 ? (
        <div className="empty">
          <p>Noch keine Klienten.</p>
          <button className="btn btnPrimary" onClick={() => setCreateOpen(true)}>Ersten Klienten anlegen</button>
        </div>
      ) : (
        <ul className="list">
          {clients.map(c => (
            <li key={c.id} id={`client-${c.id}`} tabIndex={-1} className="row clientRow">
              <div className="rowMain">
                <div className="rowTitle">{c.name}</div>
                <div className="rowSub">
                  <span>Notiz: {c.note ? c.note : '–'}</span>
                </div>
              </div>
              <div className="rowActions">
                <button className="btn" onClick={() => setSessionForClient(c.id)}>Neue Sitzung</button>
                <button className="btn" onClick={() => onOpenSessions?.(c.id)}>Sitzungen ansehen</button>
                <button className="btn" onClick={() => setEditClient(c)}>Bearbeiten</button>
                <button className="btn btnDanger" onClick={() => removeClient(c.id)}>Löschen</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ClientFormModal open={createOpen || Boolean(editClient)} onClose={() => { setCreateOpen(false); setEditClient(null) }} editClient={editClient ?? undefined} />

      <NewSessionPanel
        open={Boolean(sessionForClient)}
        onClose={() => setSessionForClient(null)}
        presetClientId={sessionForClient}
      />
    </section>
  )
}
