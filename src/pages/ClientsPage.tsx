import { useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import type { Client, Gender } from '../shared/domain'
import { storage } from '../shared/storage'
import { filterAndSortClients, validateClientInput, clientLabelForDelete } from '../shared/clients'
import ClientCases from '../components/ClientCases'
import AZIndex from '../components/AZIndex'

type ReviewMode = 'create' | 'edit' | null

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [name, setName] = useState('')                // Neu: Name
  const [newGender, setNewGender] = useState<Gender>('w')
  const [newAge, setNewAge] = useState<number | ''>('')

  const [query, setQuery] = useState('')              // Suche

  // Edit/Review
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftGender, setDraftGender] = useState<Gender | null | undefined>(undefined)
  const [draftAge, setDraftAge] = useState<number | null | undefined>(undefined)

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewMode, setReviewMode] = useState<ReviewMode>(null)
  const [reviewName, setReviewName] = useState('')

  // ---- Daten laden ----
  useEffect(() => { storage.listClients().then(setClients) }, [])
  async function refresh() { setClients(await storage.listClients()) }

  // ---- Aktionen ----
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

  // Review
  function openReviewForCreate() {
    const check = validateClientInput(name)
    if (!check.ok) return
    setReviewMode('create')
    setReviewName(check.value.name)
    setReviewOpen(true)
  }
  function openReviewForEdit() {
    if (editingId == null) return
    const check = validateClientInput(draftName)
    if (!check.ok) return
    setReviewMode('edit')
    setReviewName(check.value.name)
    setReviewOpen(true)
  }
  async function confirm() {
    if (reviewMode === 'create') {
      await storage.addClient(
        reviewName,
        newGender,
        newAge === '' ? null : Number(newAge)
      )
      setName(''); setNewAge(''); setNewGender('w')
    } else if (reviewMode === 'edit' && editingId != null) {
      const current = clients.find(c => c.id === editingId)!
      await storage.updateClient(
        editingId,
        reviewName,
        draftGender ?? current.gender,
        draftAge ?? (current.age ?? null)
      )
      cancelEdit()
    }
    await refresh()
    close()
  }
  function close() {
    setReviewOpen(false)
    setReviewMode(null)
    setReviewName('')
  }

  async function remove(id: number) {
    const label = clientLabelForDelete(clients, id)
    if (!window.confirm(`Klient „${label}“ wirklich löschen?`)) return
    if (editingId === id) cancelEdit()
    await storage.deleteClient(id)
    setClients(prev => prev.filter(c => c.id !== id))
  }

  // Tastatur
  const onEditKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); openReviewForEdit() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }
  const onCreateKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    const check = validateClientInput(name)
    if (e.key === 'Enter' && check.ok) { e.preventDefault(); openReviewForCreate() }
  }

  // ---- Suche / Vorschläge / A–Z ----
  const filtered = useMemo(() => filterAndSortClients(clients, query), [clients, query])

  const addCheck = validateClientInput(name)
  const canAdd = addCheck.ok
  const nameHas = name.trim().length > 0
  const nameInputClass = `input narrowLg ${!addCheck.ok ? 'inputInvalid' : (nameHas ? 'inputOk' : '')}`

  const saveCheck = validateClientInput(draftName)
  const canSave = saveCheck.ok

  // Vorschläge rechts (aus Namen)
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

  // A–Z: vorhandene Anfangsbuchstaben
  const lettersWithHits = useMemo(() => {
    const s = new Set<string>()
    for (const c of clients) if (c.name) s.add(c.name[0].toUpperCase())
    return s
  }, [clients])
  function jumpToLetter(letter: string) {
    setQuery(letter) // einfach: filtert nach Buchstabe
  }

  // Scroll-Ref für erste Karte (optional)
  const firstCardRef = useRef<HTMLLIElement | null>(null)

  // ---- UI ----
  return (
    <>
      {/* Neuer Klient */}
      <section className="card formGrid" aria-labelledby="new-client">
        <h2 id="new-client" className="visuallyHidden">Neuen Klienten anlegen</h2>

        {/* Name */}
        <label>
          Name:{' '}
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
        {addCheck.errors.name && <small className="hint">{addCheck.errors.name}</small>}

        {/* Geschlecht + Alter */}
        <div className="actions" style={{ gap: 12 }}>
          <span>Geschlecht:</span>
          <label>
            <input type="radio" name="gnew" checked={newGender === 'w'} onChange={() => setNewGender('w')} /> weiblich
          </label>
          <label>
            <input type="radio" name="gnew" checked={newGender === 'm'} onChange={() => setNewGender('m')} /> männlich
          </label>
          <label>
            <input type="radio" name="gnew" checked={newGender === 'd'} onChange={() => setNewGender('d')} /> divers
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
          <button className="btn btnPrimary" onClick={openReviewForCreate} disabled={!canAdd}>
            Prüfen & speichern
          </button>
          {!canAdd && <small className="hint">Bitte Eingaben prüfen</small>}
        </div>
      </section>

      {/* Suche + Vorschläge */}
      <section className="form" aria-labelledby="search-clients">
        <h2 id="search-clients" className="visuallyHidden">Klienten suchen</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(180px, 420px) 1fr',
            gap: 12,
            alignItems: 'start',
          }}
        >
          <div>
            <label>
              Suche:{' '}
              <input
                className="input narrowMd"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name (Volltext)"
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

      {/* A–Z Index */}
      <section className="form" aria-labelledby="az-index">
        <h2 id="az-index" className="visuallyHidden">Alphabetische Navigation</h2>
        <AZIndex lettersWithHits={lettersWithHits} onJump={jumpToLetter} />
      </section>

      {/* Liste */}
      <ul className="list" aria-label="Klientenliste">
        {filtered.map((c, idx) => {
          const isEditing = c.id === editingId
          return (
            <li id={`client-${c.id}`} key={c.id} className="item" ref={idx === 0 ? firstCardRef : undefined}>
              <div className="row">
                {/* Links */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>#{c.id}</strong>{' '}
                  {!isEditing ? (
                    <>
                      {c.name}
                      {/* optional: {c.gender ? ` · ${c.gender}` : ''}{typeof c.age === 'number' ? ` · ${c.age} J.` : ''} */}
                    </>
                  ) : (
                    <div className="editFields">
                      <label>
                        Name:{' '}
                        <input
                          className={saveCheck.errors.name ? 'input inputInvalid' : 'input'}
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={onEditKeyDown}
                        />
                      </label>
                      {/* Geschlecht / Alter bearbeiten */}
                      <div className="actions" style={{ gap: 12 }}>
                        <span>Geschlecht:</span>
                        <label>
                          <input
                            type="radio"
                            name={`gedit-${c.id}`}
                            defaultChecked={(draftGender ?? c.gender) === 'w'}
                            onChange={() => setDraftGender('w')}
                          />{' '}
                          w
                        </label>
                        <label>
                          <input
                            type="radio"
                            name={`gedit-${c.id}`}
                            defaultChecked={(draftGender ?? c.gender) === 'm'}
                            onChange={() => setDraftGender('m')}
                          />{' '}
                          m
                        </label>
                        <label>
                          <input
                            type="radio"
                            name={`gedit-${c.id}`}
                            defaultChecked={(draftGender ?? c.gender) === 'd'}
                            onChange={() => setDraftGender('d')}
                          />{' '}
                          d
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

                {/* Rechts: Buttons */}
                <div className="actions">
                  {!isEditing ? (
                    <>
                      <button className="btn" onClick={() => startEdit(c)}>Bearbeiten</button>
                      <button className="btn" onClick={() => remove(c.id)}>Löschen</button>
                    </>
                  ) : (
                    <>
                      <button className="btn" onClick={openReviewForEdit} disabled={!canSave}>Speichern</button>
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

      {/* Review-Dialog */}
      {reviewOpen && (
        <div className="modalOverlay" onClick={close}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
          >
            <div className="modalHeader" id="review-title">
              {reviewMode === 'create' ? 'Eingaben prüfen & speichern' : 'Änderungen prüfen & speichern'}
            </div>
            <div className="modalBody">
              <label>
                Name:{' '}
                <input className="input" value={reviewName} onChange={(e) => setReviewName(e.target.value)} />
              </label>
              {reviewMode === 'create' && (
                <div className="actions" style={{ gap: 12 }}>
                  <span>Geschlecht:</span>
                  <label><input type="radio" name="gchk" checked={newGender==='w'} onChange={()=>setNewGender('w')} /> w</label>
                  <label><input type="radio" name="gchk" checked={newGender==='m'} onChange={()=>setNewGender('m')} /> m</label>
                  <label><input type="radio" name="gchk" checked={newGender==='d'} onChange={()=>setNewGender('d')} /> d</label>

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
              )}
            </div>
            <div className="modalActions">
              <button className="btn btnSecondary" onClick={close}>Zurück</button>
              <button className="btn btnPrimary" onClick={confirm} disabled={!validateClientInput(reviewName).ok}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
