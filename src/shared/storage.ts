import type { Client, Case, Session } from "./domain";
import { memoryStorage } from "./storage.memory";
import { indexeddbStorage } from "./storage.indexeddb";

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

  // Cases
  listCases(clientId: number): Promise<Case[]>;
  addCase(
    c: Omit<Case, "id" | "status"> & { status?: Case["status"] }
  ): Promise<void>;
  updateCaseOutcome(payload: Partial<Case> & { id: number }): Promise<void>;
  deleteCase(id: number): Promise<void>; // <— NEU

  // Sessions
  listSessions(caseId: number): Promise<Session[]>;
  addSession(s: Omit<Session, "id">): Promise<void>;
  updateSession(id: number, patch: Partial<Session>): Promise<void>;
  deleteSession(id: number): Promise<void>;

  // Overview
  listAllSessionsExpanded(): Promise<
    Array<{ session: Session; case: Case; client: Client }>
  >;
}

export const storage: IStorage =
  typeof window !== "undefined" && "indexedDB" in window
    ? indexeddbStorage
    : memoryStorage;
