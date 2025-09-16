import type { IStorage } from "./storage";
import type { Client, Case, Session } from "./domain";

/** --- In-Memory-Daten --- */
let clients: Client[] = [{ id: 1, name: "Test-Client", gender: "w", age: 34 }];
let cases: Case[] = [];
let sessions: Session[] = [];

let nextClientId = 2;
let nextCaseId = 1;
let nextSessId = 1;

/** Hilfen */
const byStartedAtDesc = <T extends { started_at: string }>(a: T, b: T) =>
  a.started_at < b.started_at ? 1 : a.started_at > b.started_at ? -1 : 0;

/** Export: In-Memory-Storage, erfüllt IStorage */
export const memoryStorage: IStorage = {
  // ---- Clients ----
  async listClients() {
    return [...clients]; // Kopie zurückgeben (nicht mutierbar außen)
  },

  async addClient(name, gender = null, age = null) {
    const c: Client = { id: nextClientId++, name: name.trim(), gender, age };
    clients = [c, ...clients];
  },

  async updateClient(id, name, gender = null, age = null) {
    clients = clients.map((c) =>
      c.id === id ? { ...c, name: name.trim(), gender, age } : c
    );
  },

  async deleteClient(id) {
    // zu löschende Anliegen ermitteln
    const killCaseIds = cases
      .filter((cs) => cs.client_id === id)
      .map((cs) => cs.id);
    // Client entfernen
    clients = clients.filter((c) => c.id !== id);
    // Anliegen des Clients entfernen
    cases = cases.filter((cs) => cs.client_id !== id);
    // Sitzungen der entfernten Anliegen entfernen
    sessions = sessions.filter((s) => !killCaseIds.includes(s.case_id));
  },

  // ---- Cases (Anliegen) ----
  async listCases(clientId) {
    // Neueste zuerst: nach started_at (Fallback: id)
    return cases
      .filter((cs) => cs.client_id === clientId)
      .sort((a, b) => byStartedAtDesc(a, b) || b.id - a.id);
  },

  async addCase(c) {
    const status: Case["status"] = c.status ?? "open";
    const cs: Case = { id: nextCaseId++, ...c, status };
    cases = [cs, ...cases];
  },

  async updateCaseOutcome(p) {
    cases = cases.map((cs) => (cs.id === p.id ? { ...cs, ...p } : cs));
  },

  /** NEU: Anliegen löschen (inkl. zugehöriger Sitzungen) */
  async deleteCase(id: number) {
    sessions = sessions.filter((s) => s.case_id !== id);
    cases = cases.filter((c) => c.id !== id);
  },

  // ---- Sessions (Sitzungen) ----
  async listSessions(caseId) {
    return sessions.filter((s) => s.case_id === caseId).sort(byStartedAtDesc);
  },

  async addSession(s) {
    const sess: Session = { id: nextSessId++, ...s };
    sessions = [sess, ...sessions];
  },

  async updateSession(id, patch) {
    sessions = sessions.map((s) => (s.id === id ? { ...s, ...patch } : s));
  },

  async deleteSession(id) {
    sessions = sessions.filter((s) => s.id !== id);
  },

  // ---- Sitzungen: Gesamtübersicht (für „Sitzungen“-Seite) ----
  async listAllSessionsExpanded() {
    // Sessions → (session, case, client), neueste zuerst
    const expanded = sessions
      .map((s) => {
        const cs = cases.find((c) => c.id === s.case_id);
        if (!cs) return null;
        const cl = clients.find((x) => x.id === cs.client_id);
        if (!cl) return null;
        return { session: s, case: cs, client: cl };
      })
      .filter(
        (x): x is { session: Session; case: Case; client: Client } => x !== null
      )
      .sort((a, b) => byStartedAtDesc(a.session, b.session));

    return expanded;
  },
};
