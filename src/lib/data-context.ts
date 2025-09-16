import { createContext } from 'react'

export type ID = string

export interface Client {
  id: ID
  name: string
  note?: string
  createdAt: string // ISO
  updatedAt: string // ISO
}

export interface Session {
  id: ID
  clientId: ID
  date: string      // ISO (YYYY-MM-DD)
  type?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface State {
  clients: Client[]
  sessions: Session[]
}

/** API, die der Store bereitstellt (von useData() zurückgegeben) */
export interface DataAPI {
  state: State

  // Clients
  listClients(): Client[]
  getClient(id: ID): Client | undefined
  upsertClient(input: { id?: ID; name: string; note?: string }): Client
  removeClient(id: ID): void

  // Sessions
  listSessions(): Session[]
  listSessionsByClient(clientId: ID): Session[]
  upsertSession(input: { id?: ID; clientId: ID; date: string; type?: string; notes?: string }): Session
  removeSession(id: ID): void
}

/** React Context – ohne Default-Implementierung */
export const DataCtx = createContext<DataAPI | null>(null)
