import { useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import type { Client, Gender } from '../shared/domain'
import { storage } from '../shared/storage'
import {
  filterAndSortClients,
  validateClientInput,
  clientLabelForDelete
} from '../shared/clients'
import ClientCases from '../components/ClientCases'

export default function ClientsPage() {
  // ---- Daten ----
  const [clients, setClients] = useState<Client[]>([])

  // Neuer Klient
  const [name, setName] = useState('')
  const [newGender, setNewGender] = useState<Gender>('w')
  const [newAge, setNewAge] = useState<number | ''>('')

  // Suche
  const [query, setQuery] = useState('')

  // Edit
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftGender, setDraftGender] =
    useState<Gender | null | undefined>(undefined)
  const [draftAge, setDraftAge] =
    useState<number | null | undefined>(undefined)

  // Laden
  useEffect(() => {
    void refresh()
  }, [])
  async function refresh() {
    setClients(await storage.listClients())
  }

  // ---- Aktionen: Neu ----
  const onCreateKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    const check = validateClientInput(name)
    if (e.key === 'Enter' && check.ok) {
      e.preventDefault()
      void createClient()
    }
  }

  async function createClient() {
    const check = validateClientInput(name)
    if (!check.ok) return
    await storage.addClient(
      check.value.name,
      newGender,
      newAge === '' ? null : Number(newAge),
    )
    setName(''); setNewGender('w'); setNewAge('')
    await refresh()
  }

  // ---- Aktionen: Edit ----
  function startEdit(c: Client) {
    setEditingId(c.id)
    setDraftName(c.name)
    setDraftGender(c.gender ?? undefined)
    setDraftAge(c.age ?? null)
  }
  function cancelEdit() {
    setEditingId(null)
    setDraftName('')
    setDraftGender(undefined)
    setDraftAge(undefined)
  }
  async function saveEdit() {
    if (editingId == null) return
    const check = validateClientInput(draftName)
    if (!check.ok) return
    const current = clients.find(c => c.id === editingId)!
    await storage.updateClient(
      editingId,
      check.value.name,
      draftGender ?? current.gender,
      draftAge ?? (current.age ?? null)
    )
    cancelEdit()
    await refresh()
  }
  async function remove(id: number) {
    const label = clientLabelForDelete(clients, id)
    if (!window.confirm(`Klient „${label}“ wirklich löschen?`)) return
    if (editingId === id) cancelEdit()
    await storage.deleteClient(id)
    setClients(prev => prev.filter(c => c.id !== id))
  }

  // ---- Suche / Vorschläge / A–Z ----
  const filtered = useMemo(
    () => filterAndSortClients(clients, query),
    [clients, query]
  )

  const suggestionList = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const seen = new Set<string>()
    return clients
      .filter(c => c.name.toLowerCase().includes(q))
      .map(c => c.name)
      .filter(n => (seen.has(n) ? false : (seen.add(n), true)))
      .slice(0, 8)
  }, [clients, query])

  // Tastatur im Edit-Feld
  const onEditKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void saveEdit() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }

  // UI-Helpers
  const addCheck = validateClientInput(name)
  const nameHas = name.trim().length > 0
  const nameInputClass = `input narrowLg ${!addCheck.ok ? 'inputInvalid' : (nameHas ? 'inputOk' : '')}`

  const saveCheck = validateClientInput(draftName)

  // Sessions-Navigation
  function goToSessionsForClient(clientId: number) {
    sessionStorage.removeItem('sessionsCaseId')
    sessionStorage.removeItem('openSessionId')
    sessionStorage.removeItem('openCreateSession')
    sessionStorage.setItem('sessionsClientId', String(clientId))
    window.location.hash = '#sessions'
  }
  function goToNewSessionForClient(clientId: number) {
    sessionStorage.removeItem('sessionsCaseId')
    sessionStorage.removeItem('openSessionId')
    sessionStorage.setItem('sessionsClientId', String(clientId))
    sessionStorage.setItem('openCreateSession', '1')
    window.location.hash = '#sessions'
  }
function handleCreateSubmit(e: React.FormEvent) {
  e.preventDefault()
  void createClient()
}

  // Scroll-Ref für erste Karte (optional)
  const firstCardRef = useRef<HTMLLIElement | null>(null)

  // ---- Render ----
  return (
    <>
      {/* KLlient anlegen */}
      <section className="card formGrid" aria-labelledby="new-client" style={{ marginBottom: 16 }}>
        <h2 id="new-client">Klient anlegen</h2>

       <form onSubmit={handleCreateSubmit} className="formGrid">
    <label className="field">
      <span>Name</span>
      <input
        className={nameInputClass}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={onCreateKeyDown}     
        placeholder="Klientenname"
        autoComplete="name"
        enterKeyHint="go"
      />
    </label>

    <div className="actions" style={{ gap: 12 }}>
      <span>Geschlecht:</span>
      <label>
        <input type="radio" name="gnew" checked={newGender==='w'} onChange={()=>setNewGender('w')} /> weiblich
      </label>
      <label>
        <input type="radio" name="gnew" checked={newGender==='m'} onChange={()=>setNewGender('m')} /> männlich
      </label>
      <label>
        <input type="radio" name="gnew" checked={newGender==='d'} onChange={()=>setNewGender('d')} /> divers
      </label>

      <label style={{ marginLeft: 12 }}>
        Alter:{' '}
        <input
          className="input"
          style={{ width: 100 }}
          type="number"
          min={0}
          max={120}
          value={newAge}
          onChange={(e) => setNewAge(e.target.value === '' ? '' : Number(e.target.value))}
        />
      </label>
    </div>

    <div className="actions">
      <button
        className="btn btnPrimary"
        type="submit"                    
        disabled={!addCheck.ok}
      >
        Anlegen
      </button>
    </div>
  </form>
      </section>

      {/* Klient suchen */}
      <section className="card" aria-labelledby="search-clients">
        <h2 id="search-clients">Klient suchen</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(180px, 420px) 1fr',
            gap: 12,
            alignItems: 'start',
          }}
        >
          <div>
            <label className="field">
              <span>Name</span>
              <input
                className="input narrowMd"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name"
              />
            </label>
            <div role="status" aria-live="polite" className="hint" style={{ marginTop: 6 }}>
              {filtered.length} Klient{filtered.length === 1 ? '' : 'en'}
            </div>
          </div>

          <div className="card" aria-label="Vorschläge" style={{ minHeight: 42 }}>
            {suggestionList.length === 0 ? (
              <span className="hint">Keine Vorschläge</span>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                {suggestionList.map((n) => (
                  <li key={n}>
                    <button className="btn" onClick={() => setQuery(n)}>
                      {n}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Liste */}
      <ul className="list" aria-label="Klientenliste">
        {filtered.map((c, idx) => {
          const isEditing = c.id === editingId
          return (
            <li id={`client-${c.id}`} key={c.id} className="item" ref={idx === 0 ? firstCardRef : undefined}>
              <div className="row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>#{c.id}</strong>{' '}
                  {!isEditing ? (
                    <>{c.name}</>
                  ) : (
                    <div className="editFields">
                      <label className="field">
                        <span>Name</span>
                        <input
                          className={saveCheck.errors.name ? 'input inputInvalid' : 'input'}
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={onEditKeyDown}
                        />
                      </label>

                      <div className="actions" style={{ gap: 12 }}>
                        <span>Geschlecht:</span>
                        <label>
                          <input
                            type="radio"
                            name={`gedit-${c.id}`}
                            defaultChecked={(draftGender ?? c.gender) === 'w'}
                            onChange={() => setDraftGender('w')}
                          /> w
                        </label>
                        <label>
                          <input
                            type="radio"
                            name={`gedit-${c.id}`}
                            defaultChecked={(draftGender ?? c.gender) === 'm'}
                            onChange={() => setDraftGender('m')}
                          /> m
                        </label>
                        <label>
                          <input
                            type="radio"
                            name={`gedit-${c.id}`}
                            defaultChecked={(draftGender ?? c.gender) === 'd'}
                            onChange={() => setDraftGender('d')}
                          /> d
                        </label>

                        <label style={{ marginLeft: 12 }}>
                          Alter:{' '}
                          <input
                            className="input"
                            style={{ width: 100 }}
                            type="number"
                            min={0}
                            max={120}
                            defaultValue={draftAge ?? (c.age ?? '')}
                            onChange={(e) =>
                              setDraftAge(e.target.value === '' ? null : Number(e.target.value))
                            }
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="actions">
                  {!isEditing ? (
                    <>
                      <button className="btn btnPrimary" onClick={() => goToNewSessionForClient(c.id)}>
                        Neue Sitzung
                      </button>
                      <button className="btn" onClick={() => goToSessionsForClient(c.id)}>
                        Zu den Sitzungen
                      </button>
                      <button className="btn" onClick={() => startEdit(c)}>Bearbeiten</button>
                      <button className="btn" onClick={() => remove(c.id)}>Löschen</button>
                    </>
                  ) : (
                    <>
                      <button className="btn" onClick={() => void saveEdit()} disabled={!saveCheck.ok}>Speichern</button>
                      <button className="btn btnSecondary" onClick={cancelEdit}>Abbrechen</button>
                    </>
                  )}
                </div>
              </div>

              {/* ▼ Anliegen & Sitzungen */}
              {!isEditing && (
                <div style={{ marginTop: 10 }}>
                  <ClientCases clientId={c.id} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
