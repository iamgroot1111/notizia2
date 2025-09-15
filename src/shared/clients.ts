import type { Client } from './domain'

export function validateClientInput(name: string) {
  const errors: { name?: string } = {}
  const n = name.trim()
  if (!n) errors.name = 'Name ist erforderlich'
  else if (n.length < 2) errors.name = 'Mindestens 2 Zeichen'
  return { ok: Object.keys(errors).length === 0, errors, value: { name: n } }
}

export function filterAndSortClients(clients: Client[], query: string) {
  const q = query.trim().toLowerCase()
  const base = q ? clients.filter(c => c.name.toLowerCase().includes(q)) : clients
  return [...base].sort((a, b) => b.id - a.id)
}

export function clientLabelForDelete(list: Client[], id: number) {
  const c = list.find(x => x.id === id)
  return c ? `${c.name} (#${c.id})` : `#${id}`
}
