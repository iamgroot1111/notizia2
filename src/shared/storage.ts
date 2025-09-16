import type { Client, Case, Session } from "./domain";
import { memoryStorage } from "./storage.memory";

export interface IStorage {
  // Clients
  listClients(): Promise<Client[]>;
  addClient(
    name: string,
    gender?: Client["gender"],
    age?: number | null
  ): Promise<void>;
  updateClient(
    id: number,
    name: string,
    gender?: Client["gender"],
    age?: number | null
  ): Promise<void>;
  deleteClient(id: number): Promise<void>;

  // Cases (Anliegen)
  listCases(clientId: number): Promise<Case[]>;
  addCase(
    c: Omit<Case, "id" | "status"> & { status?: Case["status"] }
  ): Promise<void>;
  updateCaseOutcome(payload: Partial<Case> & { id: number }): Promise<void>;
  deleteCase(id: number): Promise<void>;

  // Sessions (Sitzungen)
  listSessions(caseId: number): Promise<Session[]>;
  addSession(s: Omit<Session, "id">): Promise<void>;
  updateSession(id: number, patch: Partial<Session>): Promise<void>;
  deleteSession(id: number): Promise<void>;

  // Sitzungen – Gesamtübersicht (für Abfragen)
  listAllSessionsExpanded(): Promise<
    Array<{
      session: Session;
      case: Case;
      client: Client;
    }>
  >;
}

export const storage: IStorage = memoryStorage;
