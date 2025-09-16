import { useEffect, useMemo, useState } from "react";
import type { Method, Gender, Client, Case, Session } from "../shared/domain";
import { storage } from "../shared/storage";

/* ---------- Labels ---------- */
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

const PROBLEM_LABELS: Record<Case["problem_category"], string> = {
  overweight: "Übergewicht",
  social_anxiety: "Soziale Angst",
  panic: "Panik",
  depression: "Depression",
  sleep: "Schlafproblem",
  pain: "Schmerzen",
  self_worth: "Selbstwert",
  relationship: "Beziehungen",
  other: "Sonstige",
};

/* ---------- Datentyp für Listenzeilen ---------- */
type Row = {
  session: Session;
  case: Case;
  client: Client;
};

type Props = {
  onGoToClient?: (clientId: number) => void;
};

/* =======================================================================
   Hauptseite
   ======================================================================= */
export default function SessionsPage({ onGoToClient }: Props) {
  const [rows, setRows] = useState<Row[]>([]);

  // Filter
  const [q, setQ] = useState(""); // Volltext
  const [m, setM] = useState<Method | "">(""); // Methode
  const [genders, setGenders] = useState<Set<Gender>>(new Set()); // w/m/d
  const [ageMin, setAgeMin] = useState<number | "">(""); // Alter von
  const [ageMax, setAgeMax] = useState<number | "">(""); // Alter bis

  // Edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPatch, setEditPatch] = useState<Partial<Session>>({});

  // „Neue Sitzung“-Dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefillClientId, setCreatePrefillClientId] = useState<
    number | null
  >(null);

  // Laden
  async function refresh() {
    const list = await storage.listAllSessionsExpanded();
    setRows(list);
  }
  useEffect(() => {
    void refresh();
  }, []);

  // Cross-Page Intent (von ClientsPage: openCreateSession + sessionsClientId)
  useEffect(() => {
    const openNew = sessionStorage.getItem("openCreateSession") === "1";
    const cidStr = sessionStorage.getItem("sessionsClientId");
    if (openNew) {
      const cid = cidStr ? Number(cidStr) : NaN;
      setCreatePrefillClientId(Number.isFinite(cid) ? cid : null);
      setCreateOpen(true);
    }
    // Flags aufräumen, damit sie nicht „hängen bleiben“
    sessionStorage.removeItem("openCreateSession");
  }, []);

  /* ---------- Filterlogik ---------- */
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchQ = query
        ? r.client.name.toLowerCase().includes(query) ||
          r.case.problem_text.toLowerCase().includes(query) ||
          METHOD_LABELS[r.session.method].toLowerCase().includes(query)
        : true;

      const matchM = m ? r.session.method === m : true;

      const matchG = genders.size
        ? r.client.gender
          ? genders.has(r.client.gender)
          : false
        : true;

      const a = r.client.age ?? null;
      const matchAgeMin =
        ageMin === "" ? true : a !== null && a >= Number(ageMin);
      const matchAgeMax =
        ageMax === "" ? true : a !== null && a <= Number(ageMax);
      const matchAge = matchAgeMin && matchAgeMax;

      return matchQ && matchM && matchG && matchAge;
    });
  }, [rows, q, m, genders, ageMin, ageMax]);

  // Wenn genau 1 Klient in der Ergebnisliste vorkommt → für „Neue Sitzung“ nutzen
  const candidateClientId = useMemo<number | null>(() => {
    const ids = Array.from(new Set(filtered.map((r) => r.client.id)));
    return ids.length === 1 ? ids[0] : null;
  }, [filtered]);

  function toggleGender(g: Gender) {
    setGenders((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  /* ---------- Editieren / Löschen ---------- */
  function startEdit(s: Session) {
    setEditingId(s.id);
    setEditPatch({
      method: s.method,
      duration_min: s.duration_min,
      sud_before: s.sud_before,
      sud_after: s.sud_after,
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setEditPatch({});
  }
  async function saveEdit(id: number) {
    await storage.updateSession(id, editPatch);
    cancelEdit();
    await refresh();
  }
  async function removeSession(id: number) {
    if (!window.confirm("Sitzung wirklich löschen?")) return;
    await storage.deleteSession(id);
    await refresh();
  }

  /* ---------- Neue Sitzung öffnen ---------- */
  function openCreate() {
    // Kontext neutralisieren
    sessionStorage.removeItem("sessionsCaseId");
    sessionStorage.removeItem("openSessionId");

    if (candidateClientId != null) {
      sessionStorage.setItem("sessionsClientId", String(candidateClientId));
      setCreatePrefillClientId(candidateClientId);
    } else {
      sessionStorage.removeItem("sessionsClientId");
      setCreatePrefillClientId(null);
    }
    setCreateOpen(true);
  }

  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>Sitzungen</h2>

      {/* Filterzeile 1: Volltext + Methode + CTA */}
      <div
        className="row"
        style={{ alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}
      >
        <label style={{ flex: 1, minWidth: 220, display: "grid", gap: 4 }}>
          Suche
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, Anliegen oder Methode"
          />
        </label>

        <label style={{ minWidth: 200, display: "grid", gap: 4 }}>
          Methode
          <select
            className="input"
            value={m}
            onChange={(e) => setM(e.target.value as Method | "")}
          >
            <option value="">alle</option>
            {METHODS.map((k) => (
              <option key={k} value={k}>
                {METHOD_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        {/* CTA rechts; gleiche Optik wie andere Buttons */}
        <div className="actions">
          <button className="btn btnPrimary" onClick={openCreate}>
            Neue Sitzung
          </button>
        </div>
      </div>

      {/* Filterzeile 2: Geschlecht + Alter */}
      <div
        className="row"
        style={{
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 8,
        }}
      >
        <div className="actions" style={{ gap: 12 }}>
          <span>Geschlecht:</span>
          <label>
            <input
              type="checkbox"
              checked={genders.has("w")}
              onChange={() => toggleGender("w")}
            />{" "}
            w
          </label>
          <label>
            <input
              type="checkbox"
              checked={genders.has("m")}
              onChange={() => toggleGender("m")}
            />{" "}
            m
          </label>
          <label>
            <input
              type="checkbox"
              checked={genders.has("d")}
              onChange={() => toggleGender("d")}
            />{" "}
            d
          </label>
        </div>

        <div className="actions" style={{ gap: 8 }}>
          <label>
            Alter ab
            <input
              className="input"
              style={{ width: 90, marginLeft: 6 }}
              type="number"
              min={0}
              max={120}
              value={ageMin}
              onChange={(e) =>
                setAgeMin(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </label>
          <label>
            bis
            <input
              className="input"
              style={{ width: 90, marginLeft: 6 }}
              type="number"
              min={0}
              max={120}
              value={ageMax}
              onChange={(e) =>
                setAgeMax(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </label>
        </div>
      </div>

      {/* Ergebnis-Info */}
      <div
        role="status"
        aria-live="polite"
        className="hint"
        style={{ marginTop: 8 }}
      >
        {filtered.length} Sitzung{filtered.length === 1 ? "" : "en"}
      </div>

      {/* Ergebnisliste */}
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          display: "grid",
          gap: 8,
          marginTop: 8,
        }}
      >
        {filtered.map((r) => {
          const isEdit = editingId === r.session.id;
          return (
            <li
              key={r.session.id}
              className="cardSection"
              style={{ padding: 10 }}
            >
              {!isEdit ? (
                <div
                  className="row"
                  style={{ alignItems: "baseline", flexWrap: "wrap", gap: 12 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>
                      <strong>
                        {new Date(r.session.started_at).toLocaleString()}
                      </strong>
                      {" · "}
                      {METHOD_LABELS[r.session.method]}
                    </div>
                    <div className="hint">
                      {r.client.name}
                      {" — "}
                      {r.case.problem_text}
                      {" (SUD: "}
                      {r.session.sud_before ?? "–"}
                      {" → "}
                      {r.session.sud_after ?? "–"}
                      {")"}
                      {typeof r.client.age === "number"
                        ? ` · Alter: ${r.client.age}`
                        : ""}
                      {r.client.gender
                        ? ` · Geschlecht: ${r.client.gender}`
                        : ""}
                    </div>
                  </div>

                  <div className="actions">
                    <button
                      className="btn"
                      onClick={() => startEdit(r.session)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="btn"
                      onClick={() => removeSession(r.session.id)}
                    >
                      Löschen
                    </button>
                    <button
                      className="btn"
                      onClick={() => onGoToClient?.(r.client.id)}
                    >
                      Zum Klienten
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveEdit(r.session.id);
                  }}
                  className="row"
                  style={{ alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}
                >
                  <label style={{ minWidth: 200, display: "grid", gap: 4 }}>
                    Methode
                    <select
                      className="input"
                      value={editPatch.method ?? r.session.method}
                      onChange={(e) =>
                        setEditPatch((p) => ({
                          ...p,
                          method: e.target.value as Method,
                        }))
                      }
                    >
                      {METHODS.map((k) => (
                        <option key={k} value={k}>
                          {METHOD_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ width: 120, display: "grid", gap: 4 }}>
                    Dauer (min)
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={
                        editPatch.duration_min ?? r.session.duration_min ?? ""
                      }
                      onChange={(e) =>
                        setEditPatch((p) => ({
                          ...p,
                          duration_min:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        }))
                      }
                    />
                  </label>

                  <label style={{ width: 120, display: "grid", gap: 4 }}>
                    SUD vor
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={10}
                      value={editPatch.sud_before ?? r.session.sud_before ?? ""}
                      onChange={(e) =>
                        setEditPatch((p) => ({
                          ...p,
                          sud_before:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        }))
                      }
                    />
                  </label>

                  <label style={{ width: 120, display: "grid", gap: 4 }}>
                    SUD nach
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={10}
                      value={editPatch.sud_after ?? r.session.sud_after ?? ""}
                      onChange={(e) =>
                        setEditPatch((p) => ({
                          ...p,
                          sud_after:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        }))
                      }
                    />
                  </label>

                  <div className="actions">
                    <button className="btn btnPrimary" type="submit">
                      Speichern
                    </button>
                    <button className="btn" type="button" onClick={cancelEdit}>
                      Abbrechen
                    </button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="hint">Keine Sitzungen gefunden.</li>
        )}
      </ul>

      {/* Dialog: Neue Sitzung */}
      {createOpen && (
        <NewSessionForm
          prefillClientId={createPrefillClientId}
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            await refresh();
          }}
        />
      )}
    </section>
  );
}

/* =======================================================================
   Dialog-Komponente: Neue Sitzung
   ======================================================================= */
function NewSessionForm({
  prefillClientId,
  onClose,
  onCreated,
}: {
  prefillClientId: number | null;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<number | "">(prefillClientId ?? "");
  const [cases, setCases] = useState<Case[]>([]);
  const [caseId, setCaseId] = useState<number | "">("");

  // Sitzung
  const [method, setMethod] = useState<Method>("other");
  const [dur, setDur] = useState<string>(""); // als string für leere Eingabe
  const [sudBefore, setSudBefore] = useState<string>("");
  const [sudAfter, setSudAfter] = useState<string>("");

  // neues Anliegen
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [newCaseCategory, setNewCaseCategory] =
    useState<Case["problem_category"]>("other");
  const [newCaseText, setNewCaseText] = useState("");

  useEffect(() => {
    storage.listClients().then(setClients);
  }, []);

  // Fälle des Klienten laden
  useEffect(() => {
    if (typeof clientId === "number") {
      storage.listCases(clientId).then((list) => {
        setCases(list);
        if (list.length > 0) setCaseId(list[0].id); // neuester zuerst
        else setCaseId("");
      });
    } else {
      setCases([]);
      setCaseId("");
    }
  }, [clientId]);

  async function createCaseAndUse() {
    if (typeof clientId !== "number") return;
    await storage.addCase({
      client_id: clientId,
      problem_category: newCaseCategory,
      problem_text: newCaseText.trim(), // optional
      started_at: new Date().toISOString(),
    });
    const list = await storage.listCases(clientId);
    setCases(list);
    setCaseId(list[0]?.id ?? ""); // Index 0 = neuester Fall
    setNewCaseOpen(false);
    setNewCaseText("");
  }

  async function handleSave() {
    if (typeof caseId !== "number") return;
    await storage.addSession({
      case_id: caseId,
      started_at: new Date().toISOString(),
      duration_min: dur === "" ? null : Number(dur),
      method,
      ease_hypnosis: null, // nicht mehr verwendet, neutral lassen
      sud_before: sudBefore === "" ? null : Number(sudBefore),
      sud_after: sudAfter === "" ? null : Number(sudAfter),
      emotional_release: null,
      insights: null,
      notes: null,
    });
    await onCreated();
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-session-title"
      >
        <div className="modalHeader" id="new-session-title">
          Neue Sitzung
        </div>

        <div className="modalBody">
          {/* Klient */}
          <label className="field">
            <span>Klient</span>
            <select
              className="input"
              value={clientId}
              onChange={(e) =>
                setClientId(e.target.value === "" ? "" : Number(e.target.value))
              }
            >
              <option value="">– auswählen –</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {/* Anliegen: existierend */}
          <label className="field">
            <span>Anliegen</span>
            <select
              className="input"
              value={caseId}
              onChange={(e) =>
                setCaseId(e.target.value === "" ? "" : Number(e.target.value))
              }
              disabled={typeof clientId !== "number"}
            >
              <option value="">– auswählen –</option>
              {cases.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {PROBLEM_LABELS[cs.problem_category]} ·{" "}
                  {new Date(cs.started_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </label>

          {/* Neues Anliegen anlegen (optional) */}
          {typeof clientId === "number" && !newCaseOpen && (
            <button
              className="btn"
              type="button"
              onClick={() => setNewCaseOpen(true)}
            >
              Neues Anliegen anlegen
            </button>
          )}
          {typeof clientId === "number" && newCaseOpen && (
            <div className="cardSection" style={{ display: "grid", gap: 8 }}>
              <div
                className="row"
                style={{ gap: 8, flexWrap: "wrap", alignItems: "end" }}
              >
                <label style={{ minWidth: 200, display: "grid", gap: 4 }}>
                  Kategorie
                  <select
                    className="input"
                    value={newCaseCategory}
                    onChange={(e) =>
                      setNewCaseCategory(
                        e.target.value as Case["problem_category"]
                      )
                    }
                  >
                    {Object.keys(PROBLEM_LABELS).map((k) => (
                      <option key={k} value={k}>
                        {PROBLEM_LABELS[k as Case["problem_category"]]}
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  style={{ flex: 1, minWidth: 240, display: "grid", gap: 4 }}
                >
                  Kurzbeschreibung (optional)
                  <input
                    className="input"
                    value={newCaseText}
                    onChange={(e) => setNewCaseText(e.target.value)}
                    placeholder="Kurzbeschreibung"
                  />
                </label>
                <div className="actions">
                  <button
                    className="btn btnPrimary"
                    type="button"
                    onClick={() => void createCaseAndUse()}
                  >
                    Anlegen & übernehmen
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setNewCaseOpen(false)}
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sitzungsfelder */}
          <label className="field">
            <span>Methode</span>
            <select
              className="input"
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
            >
              {METHODS.map((k) => (
                <option key={k} value={k}>
                  {METHOD_LABELS[k]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Dauer (min)</span>
            <input
              className="input"
              type="number"
              min={0}
              value={dur}
              onChange={(e) => setDur(e.target.value)}
            />
          </label>

          <label className="field">
            <span>SUD vor</span>
            <input
              className="input"
              type="number"
              min={0}
              max={10}
              value={sudBefore}
              onChange={(e) => setSudBefore(e.target.value)}
            />
          </label>

          <label className="field">
            <span>SUD nach</span>
            <input
              className="input"
              type="number"
              min={0}
              max={10}
              value={sudAfter}
              onChange={(e) => setSudAfter(e.target.value)}
            />
          </label>
        </div>

        <div className="modalActions">
          <button className="btn btnSecondary" onClick={onClose}>
            Schließen
          </button>
          <button
            className="btn btnPrimary"
            onClick={() => void handleSave()}
            disabled={typeof caseId !== "number"}
          >
            Sitzung speichern
          </button>
        </div>
      </div>
    </div>
  );
}
