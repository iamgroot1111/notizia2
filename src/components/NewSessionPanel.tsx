import { useEffect, useMemo, useState } from 'react'
import { useData } from '../lib/useData'

type Props = {
  open: boolean
  onClose: () => void
  presetClientId?: string | null
  editSessionId?: string | null
}

export default function NewSessionPanel({ open, onClose, presetClientId, editSessionId }: Props) {
  const { listClients, getClient, upsertSession, state } = useData()

  const editing = useMemo(
    () => (editSessionId ? state.sessions.find(s => s.id === editSessionId) : undefined),
    [editSessionId, state.sessions]
  )

  const [clientId, setClientId] = useState<string>(presetClientId ?? editing?.clientId ?? '')
  const [date, setDate] = useState<string>(editing?.date ?? new Date().toISOString().slice(0, 10))
  const [type, setType] = useState<string>(editing?.type ?? '')
  const [notes, setNotes] = useState<string>(editing?.notes ?? '')

  // Wenn ein anderer Client vorgegeben wird (aus ClientsPage)
  useEffect(() => {
    if (presetClientId) setClientId(presetClientId)
  }, [presetClientId])

  useEffect(() => {
    if (editing) {
      setClientId(editing.clientId)
      setDate(editing.date)
      setType(editing.type ?? '')
      setNotes(editing.notes ?? '')
    }
  }, [editing])

  if (!open) return null

  const disabledClientSelect = Boolean(presetClientId)
  const isValid = clientId && date

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    upsertSession({
      id: editing?.id,
      clientId,
      date,
      type: type.trim() || undefined,
      notes: notes.trim() || undefined
    })
    onClose()
  }

  return (
    <>
      <div className="panelBackdrop" onClick={onClose} aria-hidden="true" />
      <aside className="panel" role="dialog" aria-modal="true" aria-label={editing ? 'Sitzung bearbeiten' : 'Neue Sitzung'}>
        <header className="panelHeader">
          <h2>{editing ? 'Sitzung bearbeiten' : 'Neue Sitzung'}</h2>
          <button className="btn btnGhost" onClick={onClose} aria-label="Schließen">×</button>
        </header>
        <form className="panelBody" onSubmit={onSubmit}>
          <label className="field">
            <span>Klient</span>
            <select value={clientId} onChange={e => setClientId(e.target.value)} disabled={disabledClientSelect} required>
              <option value="" disabled>Bitte wählen…</option>
              {listClients().map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {disabledClientSelect && clientId && <small className="hint">Vorgegeben: {getClient(clientId)?.name}</small>}
          </label>

          <label className="field">
            <span>Datum</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </label>

          <label className="field">
            <span>Typ (optional)</span>
            <input type="text" value={type} onChange={e => setType(e.target.value)} placeholder="z. B. Erstgespräch" />
          </label>

          <label className="field">
            <span>Notizen (optional)</span>
            <textarea rows={6} value={notes} onChange={e => setNotes(e.target.value)} />
          </label>

          <footer className="panelFooter">
            <button type="button" className="btn" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btnPrimary" disabled={!isValid}>
              {editing ? 'Speichern' : 'Anlegen'}
            </button>
          </footer>
        </form>
      </aside>
    </>
  )
}
