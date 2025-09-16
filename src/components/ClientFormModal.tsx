import { useEffect, useState } from 'react'
import Modal from './Modal'
import { useData, type Client } from '../lib/useData'

type Props = {
  open: boolean
  onClose: () => void
  editClient?: Client | null
}

export default function ClientFormModal({ open, onClose, editClient }: Props) {
  const { upsertClient } = useData()
  const [name, setName] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    setName(editClient?.name ?? '')
    setNote(editClient?.note ?? '')
  }, [editClient])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    upsertClient({ id: editClient?.id, name: name.trim(), note: note.trim() || undefined })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editClient ? 'Klient bearbeiten' : 'Neuen Klienten anlegen'}>
      <form onSubmit={onSubmit} className="modalForm">
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={e => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span>Notiz (optional)</span>
          <textarea rows={4} value={note} onChange={e => setNote(e.target.value)} />
        </label>
        <div className="modalActions">
          <button type="button" className="btn" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn btnPrimary" disabled={!name.trim()}>Speichern</button>
        </div>
      </form>
    </Modal>
  )
}
