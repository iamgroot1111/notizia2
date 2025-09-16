import {
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import { DataCtx, type Client, type Session, type State, type DataAPI, type ID } from './data-context'

const PERSIST_KEY = 'notizia:data:v1'

const nowISO = () => new Date().toISOString()
const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2))

type Action =
  | { type: 'LOAD_ALL'; payload: State }
  | { type: 'CLIENT_ADD_OR_UPDATE'; payload: Client }
  | { type: 'CLIENT_REMOVE'; payload: { id: ID } }
  | { type: 'SESSION_UPSERT'; payload: Session }
  | { type: 'SESSION_REMOVE'; payload: { id: ID } }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_ALL':
      return action.payload

    case 'CLIENT_ADD_OR_UPDATE': {
      const exists = state.clients.some(c => c.id === action.payload.id)
      const clients = exists
        ? state.clients.map(c => (c.id === action.payload.id ? action.payload : c))
        : [action.payload, ...state.clients]
      return { ...state, clients }
    }

    case 'CLIENT_REMOVE': {
      const id = action.payload.id
      return {
        clients: state.clients.filter(c => c.id !== id),
        sessions: state.sessions.filter(s => s.clientId !== id),
      }
    }

    case 'SESSION_UPSERT': {
      const exists = state.sessions.some(s => s.id === action.payload.id)
      const sessions = exists
        ? state.sessions.map(s => (s.id === action.payload.id ? action.payload : s))
        : [action.payload, ...state.sessions]
      return { ...state, sessions }
    }

    case 'SESSION_REMOVE':
      return { ...state, sessions: state.sessions.filter(s => s.id !== action.payload.id) }

    default:
      return state
  }
}

function createValue(state: State, dispatch: Dispatch<Action>): DataAPI {
  return {
    state,

    // ------- Clients -------
    listClients: () => [...state.clients].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    getClient: (id: ID) => state.clients.find(c => c.id === id),
    upsertClient: (input) => {
      const existing = input.id ? state.clients.find(c => c.id === input.id) : undefined
      const entity: Client = {
        id: existing?.id ?? newId(),
        name: input.name.trim(),
        note: input.note ?? existing?.note,
        createdAt: existing?.createdAt ?? nowISO(),
        updatedAt: nowISO(),
      }
      dispatch({ type: 'CLIENT_ADD_OR_UPDATE', payload: entity })
      return entity
    },
    removeClient: (id) => dispatch({ type: 'CLIENT_REMOVE', payload: { id } }),

    // ------- Sessions -------
    listSessions: () => [...state.sessions].sort((a, b) => b.date.localeCompare(a.date)),
    listSessionsByClient: (clientId) =>
      state.sessions.filter(s => s.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date)),
    upsertSession: (input) => {
      const existing = input.id ? state.sessions.find(s => s.id === input.id) : undefined
      const entity: Session = {
        id: existing?.id ?? newId(),
        clientId: input.clientId,
        date: input.date,
        type: input.type ?? existing?.type,
        notes: input.notes ?? existing?.notes,
        createdAt: existing?.createdAt ?? nowISO(),
        updatedAt: nowISO(),
      }
      dispatch({ type: 'SESSION_UPSERT', payload: entity })
      return entity
    },
    removeSession: (id) => dispatch({ type: 'SESSION_REMOVE', payload: { id } }),
  }
}

/** 👇 Einzige Export-API dieser Datei: die Komponente */
export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { clients: [], sessions: [] } as State)

  // Laden
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSIST_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as State
        dispatch({ type: 'LOAD_ALL', payload: parsed })
      }
    } catch {
      // ignore
    }
  }, [])

  // Speichern
  useEffect(() => {
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [state])

  const value = useMemo(() => createValue(state, dispatch), [state])
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}
