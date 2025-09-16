// src/lib/useData.ts
import { useContext } from 'react'
import { DataCtx } from './data-context'
import type { DataAPI } from './data-context'

export function useData(): DataAPI {
  const ctx = useContext(DataCtx)
  if (!ctx) throw new Error('useData must be used within <DataProvider>')
  return ctx
}

/* Typen re-exportieren, damit du sie bequem mit import type {...} aus '../lib/useData' holen kannst */
export type { Client, Session, ID, State } from './data-context'
