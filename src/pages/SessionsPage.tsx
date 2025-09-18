import { useEffect, useMemo, useState } from "react";
import type { Client, Case, Session, Method, Gender } from "../shared/domain";
import { storage } from "../shared/storage";
import type { Row as RowX } from "../shared/analytics";

/* -------------------- Labels & Optionen -------------------- */

const METHOD_LABELS: Record<Method, string> = {
  aufloesende_hypnose: "Auflösende Hypnose",
  klassische_hypnose: "Klassische Hypnose",
  coaching: "Coaching",
  other: "Sonstige",
};
const METHODS: Method[] = [
  "aufloesende_hypnose",
  "klassische_hypnose",
  "coaching",
  "other",
];

const PROBLEM_OPTIONS: { value: string; label: string }[] = [
  { value: "overweight", label: "Übergewicht" },
  { value: "social_anxiety", label: "Soziale Angst" },
  { value: "panic", label: "Panik" },
  { value: "depression", label: "Depression" },
  { value: "sleep", label: "Schlafproblem" },
  { value: "pain", label: "Schmerzen" },
  { value: "self_worth", label: "Selbstwert" },
  { value: "relationship", label: "Beziehungen" },
  { value: "other", label: "Sonstige" },
];
const PROBLEM_LABELS: Record<string, string> = Object.fromEntries(
  PROBLEM_OPTIONS.map((p) => [p.value, p.label])
) as Record<string, string>;

/* -------------------- Storage‑API (optional parts) -------------------- */

type SessionsStorageAPI = {
  listAllSessionsExpanded: () => Promise<RowX[]>;
  listClients: () => Promise<Client[]>;
  // optional:
  updateSession?: (
    patch: { id: number } & Partial<Session>
  ) => Promise<Session | void>;
  deleteSession?: (id: number) => Promise<void>;
  addSession?: (payload: {
    case_id: number;
    started_at: string;
    method: Method;
    duration_min?: number | null;
    sud_before?: number | null;
    sud_after?: number | null;
  }) => Promise<Session | void>;
  listCasesByClient?: (clientId: number) => Promise<Case[]>;
};
const s = storage as unknown as SessionsStorageAPI;

/* -------------------- Hash‑Helpers -------------------- */
function getHashParams() {
  const h = window.location.hash;
  const i = h.indexOf("?");
  const qs = new URLSearchParams(i >= 0 ? h.slice(i + 1) : "");
  return qs;
}

/* -------------------- Main Page -------------------- */

export default function SessionsPage({
  onGoToClient,
}: { onGoToClient?: (id: number) => void } = {}) {
  const [rows, setRows] = useState<RowX[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Filter UI
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState<Method | "">("");
  const [gW, setGW] = useState(false);
  const [gM, setGM] = useState(false);
  const [gD, setGD] = useState(false);
  const [ageMin, setAgeMin] = useState<string>("");
  const [ageMax, setAgeMax] = useState<string>("");

  // Deep‑Link Client‑Filter + Intent „Neuen Dialog öffnen“
  const [clientFilterId, setClientFilterId] = useState<number | null>(null);
  const [openNewForClientId, setOpenNewForClientId] = useState<number | null>(null);

  // Dialoge
  const [editRow, setEditRow] = useState<RowX | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    s.listAllSessionsExpanded().then(setRows);
    s.listClients().then(setClients);
  }, []);

  useEffect(() => {
    const apply = () => {
      const p = getHashParams();
      const cid = p.get("client");
      const wantNew = p.get("new") === "1";
      setClientFilterId(cid ? Number(cid) : null);
      setOpenNewForClientId(wantNew && cid ? Number(cid) : null);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  useEffect(() => {
    if (openNewForClientId != null) setNewOpen(true);
  }, [openNewForClientId]);

  async function refresh() {
    const list = await s.listAllSessionsExpanded();
    setRows(list);
  }

  // Ableitung: Fälle je Klient (Fallback)
  function casesFromRowsByClient(id: number): Case[] {
    const map = new Map<number, Case>();
    for (const r of rows) if (r.client.id === id) map.set(r.case.id, r.case);
    return [...map.values()];
  }

  // Filter anwenden
  const rowsForView = useMemo(() => {
    let out = rows.slice();

    if (clientFilterId) out = out.filter((r) => r.client.id === clientFilterId);

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter((r) => {
        const name = (r.client.name ?? "").toLowerCase();
        const prob = (
          PROBLEM_LABELS[r.case.problem_category] ??
          r.case.problem_category ??
          ""
        ).toLowerCase();
        const meth = (
          METHOD_LABELS[r.session.method] ?? r.session.method
        ).toLowerCase();
        return name.includes(q) || prob.includes(q) || meth.includes(q);
      });
    }

    if (method) out = out.filter((r) => r.session.method === method);

    const gSelected = new Set<Gender>([
      ...(gW ? (["w"] as const) : []),
      ...(gM ? (["m"] as const) : []),
      ...(gD ? (["d"] as const) : []),
    ]);
    if (gSelected.size > 0)
      out = out.filter((r) => r.client.gender && gSelected.has(r.client.gender));

    if (ageMin !== "")
      out = out.filter(
        (r) =>
          typeof r.client.age === "number" &&
          (r.client.age as number) >= Number(ageMin)
      );
    if (ageMax !== "")
      out = out.filter(
        (r) =>
          typeof r.client.age === "number" &&
          (r.client.age as number) <= Number(ageMax)
      );

    out.sort(
      (a, b) =>
        new Date(b.session.started_at).getTime() -
        new Date(a.session.started_at).getTime()
    );
    return out;
  }, [rows, query, method, gW, gM, gD, ageMin, ageMax, clientFilterId]);

  return (
    <section className="card" style={{ display: "grid", gap: 12 }}>
      <h1 style={{ marginTop: 0 }}>Sitzungen</h1>

      {/* Filter */}
      <div className="card">
        <div className="formGrid">
          <label>
            Suche
            <input
              className="input"
              placeholder="Name, Anliegen oder Methode"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <label>
            Methode
            <select
              className="input"
              value={method}
              onChange={(e) => setMethod(e.target.value as Method | "")}
            >
              <option value="">alle</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </label>

          {/* Geschlecht – jetzt mit .field, damit die Checkboxen in einer Zeile sind */}
          <div className="field">
            <span>Geschlecht:</span>
            <div className="row">
              <label><input type="checkbox" checked={gW} onChange={(e)=>setGW(e.target.checked)} /> w</label>
              <label><input type="checkbox" checked={gM} onChange={(e)=>setGM(e.target.checked)} /> m</label>
              <label><input type="checkbox" checked={gD} onChange={(e)=>setGD(e.target.checked)} /> d</label>
            </div>
          </div>

          <label>
            Alter ab
            <input
              className="input"
              type="number"
              min={0}
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
            />
          </label>

          <label>
            bis
            <input
              className="input"
              type="number"
              min={0}
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
            />
          </label>

          <div className="actions">
            <button className="btn btnPrimary" onClick={() => setNewOpen(true)}>
              Neue Sitzung
            </button>
          </div>
        </div>

        {/* Hinweis bei Deep‑Link‑Filter ohne Sitzungen */}
        {clientFilterId && rowsForView.length === 0 && (
          <div className="card" style={{ marginTop: 8 }}>
            <div className="hint" style={{ marginBottom: 8 }}>
              Noch keine Sitzung.
            </div>
            <button className="btn btnPrimary" onClick={() => setNewOpen(true)}>
              Neue Sitzung für diesen Klienten
            </button>
          </div>
        )}
      </div>

      {/* Liste */}
      <div className="card">
        <div className="hint" style={{ marginBottom: 6 }}>
          {rowsForView.length} Sitzung{rowsForView.length === 1 ? "" : "en"}
        </div>

        {rowsForView.length === 0 ? (
          <div className="hint">Keine Daten.</div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 8,
            }}
          >
            {rowsForView.map((r) => (
              <li
                key={r.session.id}
                className="card"
                style={{ background: "#f3faf5" }}
              >
                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div>
                    <strong>{formatDateTime(r.session.started_at)}</strong> ·{" "}
                    {PROBLEM_LABELS[r.case.problem_category] ??
                      r.case.problem_category}
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      className="btn"
                      onClick={() => setEditRow(r)}
                      disabled={!s.updateSession}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="btn"
                      onClick={async () => {
                        if (!s.deleteSession) return;
                        if (!confirm("Sitzung wirklich löschen?")) return;
                        await s.deleteSession(r.session.id);
                        await refresh();
                      }}
                      disabled={!s.deleteSession}
                    >
                      Löschen
                    </button>
                    {onGoToClient ? (
                      <button
                        className="btn"
                        onClick={() => onGoToClient(r.client.id)}
                      >
                        Zur Klientenkartei
                      </button>
                    ) : (
                      <a className="btn" href={`#clients?id=${r.client.id}`}>
                        Zur Klientenkartei
                      </a>
                    )}
                  </div>
                </div>
                <div className="hint" style={{ marginTop: 4 }}>
                  {r.client.name} —{" "}
                  {r.session.sud_before != null || r.session.sud_after != null
                    ? `SUD: ${r.session.sud_before ?? "–"} → ${
                        r.session.sud_after ?? "–"
                      }`
                    : `SUD: –`}{" "}
                  · Alter: {r.client.age ?? "–"} · Geschlecht:{" "}
                  {r.client.gender ?? "–"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dialog: Bearbeiten (Overlay) */}
      {editRow && (
        <EditSessionDialog
          row={editRow}
          onClose={(changed) => {
            setEditRow(null);
            if (changed) refresh();
          }}
          canSave={!!s.updateSession}
          onSave={async (patch) => {
            if (!s.updateSession) return false;
            await s.updateSession({ id: editRow.session.id, ...patch });
            return true;
          }}
        />
      )}

      {/* Dialog: Neue Sitzung – standardmäßig INLINE-Karte */}
      {newOpen && (
        <NewSessionDialog
          inline
          clients={clients}
          initialClientId={clientFilterId ?? undefined}
          loadCases={async (clientId) => {
            if (s.listCasesByClient) return await s.listCasesByClient(clientId);
            return casesFromRowsByClient(clientId);
          }}
          onClose={(changed) => {
            setNewOpen(false);
            if (changed) refresh();
          }}
          canCreate={!!s.addSession}
          onCreate={async (payload) => {
            if (!s.addSession) return false;
            await s.addSession(payload);
            return true;
          }}
        />
      )}
    </section>
  );
}

/* -------------------- Komponente: EditSessionDialog -------------------- */

function EditSessionDialog({
  row,
  onClose,
  canSave,
  onSave,
}: {
  row: RowX;
  onClose: (changed: boolean) => void;
  canSave: boolean;
  onSave: (patch: Partial<Session>) => Promise<boolean>;
}) {
  const [startedAt, setStartedAt] = useState<string>(
    toLocalInputValue(row.session.started_at)
  );
  const [method, setMethod] = useState<Method>(row.session.method);
  const [dur, setDur] = useState<string>(
    row.session.duration_min != null ? String(row.session.duration_min) : ""
  );
  const [sudB, setSudB] = useState<string>(
    row.session.sud_before != null ? String(row.session.sud_before) : ""
  );
  const [sudA, setSudA] = useState<string>(
    row.session.sud_after != null ? String(row.session.sud_after) : ""
  );

  return (
    <div className="modalOverlay">
      <div className="modal">
        <div className="modalHeader">Sitzung bearbeiten</div>
        <div className="modalBody">
          <label>
            Datum/Zeit
            <input
              className="input"
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
          </label>

          <label>
            Methode
            <select
              className="input"
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </label>

          <div className="row" style={{ gap: 8 }}>
            <label style={{ flex: 1 }}>
              Dauer (min)
              <input
                className="input"
                type="number"
                min={0}
                value={dur}
                onChange={(e) => setDur(e.target.value)}
              />
            </label>
            <label style={{ width: 120 }}>
              SUD vor
              <input
                className="input"
                type="number"
                min={0}
                max={10}
                value={sudB}
                onChange={(e) => setSudB(e.target.value)}
              />
            </label>
            <label style={{ width: 120 }}>
              SUD nach
              <input
                className="input"
                type="number"
                min={0}
                max={10}
                value={sudA}
                onChange={(e) => setSudA(e.target.value)}
              />
            </label>
          </div>
        </div>
        <div className="modalActions">
          <button
            className="btn btnPrimary"
            disabled={!canSave}
            onClick={async () => {
              const ok = await onSave({
                started_at: fromLocalInputValue(startedAt),
                method,
                duration_min: dur === "" ? null : Number(dur),
                sud_before: sudB === "" ? null : Number(sudB),
                sud_after: sudA === "" ? null : Number(sudA),
              });
              onClose(!!ok);
            }}
          >
            Speichern
          </button>
          <button className="btn" onClick={() => onClose(false)}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Komponente: NewSessionDialog -------------------- */

function NewSessionDialog({
  clients,
  initialClientId,
  loadCases,
  onClose,
  canCreate,
  onCreate,
  inline = false,                // <— Standard: Overlay; wir schalten oben "inline"
}: {
  clients: Client[];
  initialClientId?: number;
  loadCases: (clientId: number) => Promise<Case[]>;
  onClose: (changed: boolean) => void;
  canCreate: boolean;
  onCreate: (payload: {
    case_id: number;
    started_at: string;
    method: Method;
    duration_min?: number | null;
    sud_before?: number | null;
    sud_after?: number | null;
  }) => Promise<boolean>;
  inline?: boolean;
}) {
  const [clientId, setClientId] = useState<number | "">(initialClientId ?? "");
  const [cases, setCases] = useState<Case[]>([]);
  const [caseId, setCaseId] = useState<number | "">("");
  const [startedAt, setStartedAt] = useState<string>(
    toLocalInputValue(new Date().toISOString())
  );
  const [method, setMethod] = useState<Method>("aufloesende_hypnose");
  const [dur, setDur] = useState<string>("");
  const [sudB, setSudB] = useState<string>("");
  const [sudA, setSudA] = useState<string>("");

  useEffect(() => {
    if (typeof clientId === "number") {
      loadCases(clientId).then((cs) => {
        setCases(cs);
        setCaseId(cs.length > 0 ? cs[0].id : "");
      });
    } else {
      setCases([]); setCaseId("");
    }
  }, [clientId, loadCases]);

  const canSave =
    canCreate && typeof clientId === "number" && typeof caseId === "number";

  const form = (
    <>
      <label>
        Klient
        <select
          className="input"
          value={clientId}
          onChange={(e) =>
            setClientId(e.target.value === "" ? "" : Number(e.target.value))
          }
        >
          <option value="">– auswählen –</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{`#${c.id} ${c.name}`}</option>
          ))}
        </select>
      </label>

      <label>
        Fall / Anliegen
        <select
          className="input"
          value={caseId}
          onChange={(e) =>
            setCaseId(e.target.value === "" ? "" : Number(e.target.value))
          }
          disabled={typeof clientId !== "number"}
        >
          {typeof clientId !== "number" && (
            <option value="">– zuerst Klient wählen –</option>
          )}
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {PROBLEM_LABELS[c.problem_category] ?? c.problem_category}{" "}
              {c.status && c.status !== "open" ? "· (geschlossen)" : ""}
            </option>
          ))}
          {cases.length === 0 && typeof clientId === "number" && (
            <option value="">(Keine Fälle gefunden)</option>
          )}
        </select>
      </label>

      <label>
        Datum/Zeit
        <input
          className="input"
          type="datetime-local"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
        />
      </label>

      <label>
        Methode
        <select
          className="input"
          value={method}
          onChange={(e) => setMethod(e.target.value as Method)}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {METHOD_LABELS[m]}
            </option>
          ))}
        </select>
      </label>

      <div className="row" style={{ gap: 8 }}>
        <label style={{ flex: 1 }}>
          Dauer (min)
          <input
            className="input"
            type="number"
            min={0}
            value={dur}
            onChange={(e) => setDur(e.target.value)}
          />
        </label>
        <label style={{ width: 120 }}>
          SUD vor
          <input
            className="input"
            type="number"
            min={0}
            max={10}
            value={sudB}
            onChange={(e) => setSudB(e.target.value)}
          />
        </label>
        <label style={{ width: 120 }}>
          SUD nach
          <input
            className="input"
            type="number"
            min={0}
            max={10}
            value={sudA}
            onChange={(e) => setSudA(e.target.value)}
          />
        </label>
      </div>
    </>
  );

  const actions = (
    <div className="actions" style={{ marginTop: 10 }}>
      <button
        className="btn btnPrimary"
        disabled={!canSave}
        onClick={async () => {
          const ok = await onCreate({
            case_id: caseId as number,
            started_at: fromLocalInputValue(startedAt),
            method,
            duration_min: dur === "" ? null : Number(dur),
            sud_before: sudB === "" ? null : Number(sudB),
            sud_after: sudA === "" ? null : Number(sudA),
          });
          onClose(!!ok);
        }}
      >
        Anlegen
      </button>
      <button className="btn" onClick={() => onClose(false)}>
        Abbrechen
      </button>
      {!canCreate && (
        <div className="hint">Dein Storage hat keine <code>addSession</code>-Funktion.</div>
      )}
    </div>
  );

  if (inline) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Neue Sitzung</h3>
        {form}
        {actions}
      </div>
    );
  }

  return (
    <div className="modalOverlay">
      <div className="modal">
        <div className="modalHeader">Neue Sitzung</div>
        <div className="modalBody">{form}</div>
        <div className="modalActions">
          <button
            className="btn btnPrimary"
            disabled={!canSave}
            onClick={async () => {
              const ok = await onCreate({
                case_id: caseId as number,
                started_at: fromLocalInputValue(startedAt),
                method,
                duration_min: dur === "" ? null : Number(dur),
                sud_before: sudB === "" ? null : Number(sudB),
                sud_after: sudA === "" ? null : Number(sudA),
              });
              onClose(!!ok);
            }}
          >
            Anlegen
          </button>
          <button className="btn" onClick={() => onClose(false)}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- kleine Utils -------------------- */

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}
function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
function fromLocalInputValue(local: string) {
  const d = new Date(local);
  return d.toISOString();
}
