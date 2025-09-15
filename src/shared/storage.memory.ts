import type { IStorage } from './storage'
import type { Client, Case, Session } from './domain'

let clients: Client[] = [
  { id: 1, name: 'Test-Client', gender: 'w', age: 34 },
]
let cases: Case[] = []
let sessions: Session[] = []

let nextClientId = 2
let nextCaseId   = 1
let nextSessId   = 1

export const memoryStorage: IStorage = {
  // ---- Clients ----
  async listClients(){ return clients },
  async addClient(name, gender=null, age=null){
    clients = [{ id: nextClientId++, name: name.trim(), gender, age }, ...clients]
  },
  async updateClient(id, name, gender=null, age=null){
    clients = clients.map(c =>
      c.id === id ? { ...c, name: name.trim(), gender, age } : c
    )
  },
  async deleteClient(id){
    clients = clients.filter(c => c.id !== id)
    const killCaseIds = cases.filter(cs => cs.client_id === id).map(cs => cs.id)
    cases    = cases.filter(cs => cs.client_id !== id)
    sessions = sessions.filter(s => !killCaseIds.includes(s.case_id))
  },

  // ---- Cases (Anliegen) ----
  async listCases(clientId){ return cases.filter(cs => cs.client_id === clientId).sort((a,b)=>b.id-a.id) },
  async addCase(c){
    const status = c.status ?? 'open'
    cases = [{ id: nextCaseId++, ...c, status }, ...cases]
  },
  async updateCaseOutcome(p){ cases = cases.map(cs => cs.id === p.id ? { ...cs, ...p } : cs) },

  // ---- Sessions (Sitzungen) ----
  async listSessions(caseId){ return sessions.filter(s => s.case_id === caseId).sort((a,b)=> (a.started_at < b.started_at ? 1 : -1)) },
  async addSession(s){ sessions = [{ id: nextSessId++, ...s }, ...sessions] },
  async updateSession(id, patch){ sessions = sessions.map(s => s.id === id ? ({ ...s, ...patch }) : s) },
  async deleteSession(id){ sessions = sessions.filter(s => s.id !== id) },

  // ---- Sitzungen: Gesamtübersicht ----
  async listAllSessionsExpanded(){
    return sessions
      .map(s => {
        const cs = cases.find(c => c.id === s.case_id)!
        const cl = clients.find(x => x.id === cs.client_id)!
        return { session: s, case: cs, client: cl }
      })
      .sort((a,b) => (a.session.started_at < b.session.started_at ? 1 : -1))
  },
}
