import type { IStorage } from "./storage";
import type { Client, Case, Session } from "./domain";

const DB_NAME = "notizia";
const DB_VERSION = 1;
const STORES = {
  clients: "clients",
  cases: "cases",
  sessions: "sessions",
} as const;

type StoreName = keyof typeof STORES;

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.clients)) {
        db.createObjectStore(STORES.clients, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      if (!db.objectStoreNames.contains(STORES.cases)) {
        const s = db.createObjectStore(STORES.cases, {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("by_client", "client_id", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.sessions)) {
        const s = db.createObjectStore(STORES.sessions, {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("by_case", "case_id", { unique: false });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

// ---------- Request -> Promise (ohne generischen Request-Typ) ----------
function reqToPromise<T>(r: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result as T);
    r.onerror = () => reject(r.error);
  });
}

// ---------- Transaktion ----------
function runTx<K extends StoreName, R>(
  names: K[],
  mode: IDBTransactionMode,
  work: (
    stores: Record<K, IDBObjectStore>,
    tx: IDBTransaction
  ) => Promise<R> | R
): Promise<R> {
  return openDB().then(
    (db) =>
      new Promise<R>((resolve, reject) => {
        const tx = db.transaction(
          names.map((n) => n as string),
          mode
        );
        const partial: Partial<Record<K, IDBObjectStore>> = {};
        for (const n of names) partial[n] = tx.objectStore(n as string);
        const stores = partial as Record<K, IDBObjectStore>;

        const p = Promise.resolve(work(stores, tx));
        tx.oncomplete = () => p.then(resolve).catch(reject);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

// ---------- kleine Store-Helfer ----------
const getAll = <T>(store: IDBObjectStore) => reqToPromise<T[]>(store.getAll());
const getAllByIndex = <T>(
  store: IDBObjectStore,
  index: string,
  key: IDBValidKey
) => reqToPromise<T[]>(store.index(index).getAll(key));
const getOne = <T>(store: IDBObjectStore, key: IDBValidKey) =>
  reqToPromise<T | undefined>(store.get(key));

const add = <T extends object>(store: IDBObjectStore, value: T) =>
  reqToPromise<IDBValidKey>(store.add(value));
const put = <T extends object>(store: IDBObjectStore, value: T) =>
  reqToPromise<IDBValidKey>(store.put(value));
const del = (store: IDBObjectStore, key: IDBValidKey) =>
  reqToPromise<undefined>(store.delete(key));

export const indexeddbStorage: IStorage = {
  // ---- Clients ----
  async listClients() {
    return runTx(["clients"], "readonly", async ({ clients }) => {
      const list = await getAll<Client>(clients);
      return list.sort((a, b) => b.id - a.id);
    });
  },

  async addClient(name, gender = null, age = null) {
    const client: Omit<Client, "id"> = {
      name: name.trim(),
      gender: (gender ?? null) as Client["gender"] | null,
      age: (age ?? null) as number | null,
    };
    await runTx(["clients"], "readwrite", async ({ clients }) => {
      await add(clients, client);
    });
  },

  async updateClient(id, name, gender = null, age = null) {
    await runTx(["clients"], "readwrite", async ({ clients }) => {
      const cur = await getOne<Client>(clients, id);
      if (!cur) return;
      const next: Client = {
        ...cur,
        name: name.trim(),
        gender: (gender ?? null) as Client["gender"] | null,
        age: (age ?? null) as number | null,
      };
      await put(clients, next);
    });
  },

  async deleteClient(id) {
    await runTx(
      ["clients", "cases", "sessions"],
      "readwrite",
      async ({ clients, cases, sessions }) => {
        const list = await getAllByIndex<Case>(cases, "by_client", id);
        for (const cs of list) {
          const ss = await getAllByIndex<Session>(sessions, "by_case", cs.id);
          for (const s of ss) await del(sessions, s.id);
          await del(cases, cs.id);
        }
        await del(clients, id);
      }
    );
  },

  // ---- Cases ----
  async listCases(clientId) {
    return runTx(["cases"], "readonly", async ({ cases }) => {
      const list = await getAllByIndex<Case>(cases, "by_client", clientId);
      return list.sort((a, b) => b.id - a.id);
    });
  },

  async addCase(c) {
    const value: Omit<Case, "id"> = { ...c, status: c.status ?? "open" };
    await runTx(["cases"], "readwrite", async ({ cases }) => {
      await add(cases, value);
    });
  },

  async updateCaseOutcome(payload) {
    await runTx(["cases"], "readwrite", async ({ cases }) => {
      const cur = await getOne<Case>(cases, payload.id);
      if (!cur) return;
      const next: Case = { ...cur, ...payload };
      await put(cases, next);
    });
  },

  async deleteCase(id) {
    await runTx(
      ["cases", "sessions"],
      "readwrite",
      async ({ cases, sessions }) => {
        const ss = await getAllByIndex<Session>(sessions, "by_case", id);
        for (const s of ss) await del(sessions, s.id);
        await del(cases, id);
      }
    );
  },

  // ---- Sessions ----
  async listSessions(caseId) {
    return runTx(["sessions"], "readonly", async ({ sessions }) => {
      const list = await getAllByIndex<Session>(sessions, "by_case", caseId);
      return list.sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
    });
  },

  async addSession(s) {
    await runTx(["sessions"], "readwrite", async ({ sessions }) => {
      await add(sessions, s);
    });
  },

  async updateSession(id, patch) {
    await runTx(["sessions"], "readwrite", async ({ sessions }) => {
      const cur = await getOne<Session>(sessions, id);
      if (!cur) return;
      const next: Session = { ...cur, ...patch };
      await put(sessions, next);
    });
  },

  async deleteSession(id) {
    await runTx(["sessions"], "readwrite", async ({ sessions }) => {
      await del(sessions, id);
    });
  },

  // ---- Übersicht ----
  async listAllSessionsExpanded() {
    return runTx(
      ["sessions", "cases", "clients"],
      "readonly",
      async ({ sessions, cases, clients }) => {
        const allS = await getAll<Session>(sessions);
        const out: Array<{ session: Session; case: Case; client: Client }> = [];
        for (const s of allS) {
          const cs = await getOne<Case>(cases, s.case_id);
          if (!cs) continue;
          const cl = await getOne<Client>(clients, cs.client_id);
          if (!cl) continue;
          out.push({ session: s, case: cs, client: cl });
        }
        return out.sort((a, b) =>
          a.session.started_at < b.session.started_at ? 1 : -1
        );
      }
    );
  },
};
