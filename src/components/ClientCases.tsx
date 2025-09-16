import { useCallback, useEffect, useState } from "react";
import type { Case, Session } from "../shared/domain";
import { storage } from "../shared/storage";
import "../app.css";

const PROBLEM_OPTIONS: { value: Case["problem_category"]; label: string }[] = [
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

const METHOD_LABELS: Record<Session["method"], string> = {
  aufloesende_hypnose: "Auflösende Hypnose",
  klassische_hypnose: "Klassische Hypnose",
  coaching: "Coaching",
  other: "Sonstige",
};

type Props = { clientId: number };

export default function ClientCases({ clientId }: Props) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  // Neues Anliegen
  const [pcat, setPcat] = useState<Case["problem_category"]>("other");
  const [ptext, setPtext] = useState("");

  // Anzeige
  const [showCases, setShowCases] = useState(false);
  const [openCaseId, setOpenCaseId] = useState<number | null>(null);

  // Sitzungen pro Anliegen (nur Anzeige)
  const [sessionsByCase, setSessionsByCase] = useState<Record<number, Session[]>>(
    () => ({})
  );

  // Anliegen bearbeiten
  const [editCaseId, setEditCaseId] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState<Case["problem_category"]>("other");
  const [editText, setEditText] = useState("");
  const [editStatus, setEditStatus] = useState<Case["status"]>("open");

  const labelForProblem = (v: Case["problem_category"]) =>
    PROBLEM_OPTIONS.find((o) => o.value === v)?.label ?? v;
  const labelForMethod = (m: Session["method"]) => METHOD_LABELS[m] ?? m;

  // Daten laden
  const refreshCases = useCallback(async () => {
    setLoading(true);
    const list = await storage.listCases(clientId);
    setCases(list);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { void refreshCases(); }, [refreshCases]);

  // Anliegen anlegen
  async function addCase() {
  await storage.addCase({
    client_id: clientId,
    problem_category: pcat,
    problem_text: ptext.trim(),            // leer erlaubt
    started_at: new Date().toISOString(),
  })
  setPcat('other')
  setPtext('')
  await refreshCases()
}
  const onNewCaseKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && ptext.trim()) { e.preventDefault(); void addCase(); }
  };

  // Sitzungen laden/öffnen
  async function toggleSessions(caseId: number) {
    if (openCaseId === caseId) { setOpenCaseId(null); return; }
    setOpenCaseId(caseId);
    const list = await storage.listSessions(caseId);
    setSessionsByCase((prev) => ({ ...prev, [caseId]: list }));
  }

  // Navigation zur Sitzungen-Seite mit Kontext
  function goToNewSession(cid: number, csid?: number) {
    sessionStorage.setItem("sessionsClientId", String(cid));
    if (typeof csid === "number") sessionStorage.setItem("sessionsCaseId", String(csid));
    window.location.hash = "#sessions";
  }
  function openSessionInSessionsPage(sessionId: number) {
    sessionStorage.setItem("openSessionId", String(sessionId));
    window.location.hash = "#sessions";
  }

  // Bearbeiten / Löschen von Anliegen
  function startEditCase(cs: Case) {
    setEditCaseId(cs.id);
    setEditCategory(cs.problem_category);
    setEditText(cs.problem_text);
    setEditStatus(cs.status);
  }
  function cancelEditCase() {
    setEditCaseId(null);
  }
  async function saveCase(cs: Case) {
    await storage.updateCaseOutcome({
      id: cs.id,
      problem_category: editCategory,
      problem_text: editText.trim(),
      status: editStatus,
    });
    setEditCaseId(null);
    await refreshCases();
  }
  async function removeCase(cs: Case) {
    if (!window.confirm(`Anliegen „${labelForProblem(cs.problem_category)} – ${cs.problem_text}“ wirklich löschen?`)) return;
    // benötigt storage.deleteCase – siehe Interface-Erweiterung unten
    // ts-expect-error deleteCase wird gleich hinzugefügt
    await storage.deleteCase(cs.id);
    if (openCaseId === cs.id) setOpenCaseId(null);
    await refreshCases();
  }

  return (
    <div className="caseBlock">
      {/* Neues Anliegen */}
      <div className="cardSection">
        <div className="header">
          <strong>Neues Anliegen</strong>
          <span className="tag">{labelForProblem(pcat)}</span>
        </div>

        <div className="rowGrid">
          <div className="kv">
            <div>Anliegen</div>
            <select value={pcat} onChange={(e) => setPcat(e.target.value as Case["problem_category"])}>
              {PROBLEM_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="kv">
            <div>Beschreibung</div>
            <input placeholder="Kurzbeschreibung"
                   value={ptext}
                   onChange={(e) => setPtext(e.target.value)}
                   onKeyDown={onNewCaseKeyDown}/>
          </div>
        </div>

        <div className="toolbar">
          <button className="btn" onClick={addCase}>Anliegen anlegen</button>
          {loading && <span className="hint">…laden</span>}
        </div>
      </div>

      {/* Toggle Liste */}
      <div className="toolbar" style={{ marginTop: 8 }}>
        <button className="btn" onClick={() => setShowCases((s) => !s)}
                aria-expanded={showCases} aria-controls={`cases-${clientId}`}>
          {showCases ? `Anliegen verbergen (${cases.length})` : `Anliegen anzeigen (${cases.length})`}
        </button>
      </div>

      {/* Anliegen-Liste */}
      {showCases && (
        <div id={`cases-${clientId}`} style={{ marginTop: 10 }}>
          <strong>Anliegen</strong>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
            {cases.map((cs, idx) => (
              <li key={cs.id} className="cardSection">
                <div className="header">
                  <div>
                    <div>
                      <strong>#{idx + 1}</strong>
                      {" · "}{labelForProblem(cs.problem_category)}
                      {" · "}<em>{new Date(cs.started_at).toLocaleDateString()}</em>
                    </div>
                    {editCaseId !== cs.id ? (
                      <>
                        <div style={{ opacity: 0.85 }}>{cs.problem_text}</div>
                        <div style={{ opacity: 0.7 }}>Status: {cs.status}</div>
                      </>
                    ) : (
                      <div className="rowGrid" style={{ marginTop: 8 }}>
                        <div className="kv">
                          <div>Anliegen</div>
                          <select value={editCategory}
                                  onChange={(e)=>setEditCategory(e.target.value as Case["problem_category"])}>
                            {PROBLEM_OPTIONS.map((p) => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="kv">
                          <div>Beschreibung</div>
                          <input value={editText} onChange={e=>setEditText(e.target.value)} />
                        </div>
                        <div className="kv">
                          <div>Status</div>
                          <select value={editStatus} onChange={e=>setEditStatus(e.target.value as Case["status"])}>
                            <option value="open">open</option>
                            <option value="closed">closed</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="toolbar">
                    <button className="btn"
                            onClick={() => toggleSessions(cs.id)}
                            aria-expanded={openCaseId === cs.id}
                            aria-controls={`sessions-${cs.id}`}>
                      {openCaseId === cs.id ? "Sitzungen schließen" : "Sitzungen zeigen"}
                    </button>
                    {editCaseId !== cs.id ? (
                      <>
                        <button className="btn btnPrimary" onClick={() => goToNewSession(clientId, cs.id)}>
                          Neue Sitzung
                        </button>
                        <button className="btn" onClick={()=>startEditCase(cs)}>Bearbeiten</button>
                        <button className="btn btnDanger" onClick={()=>removeCase(cs)}>Löschen</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btnPrimary" onClick={()=>saveCase(cs)} disabled={!editText.trim()}>Speichern</button>
                        <button className="btn" onClick={cancelEditCase}>Abbrechen</button>
                      </>
                    )}
                  </div>
                </div>

                {openCaseId === cs.id && (
                  <div id={`sessions-${cs.id}`} style={{ marginTop: 8, display: "grid", gap: 8 }}>
                    <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 6 }}>
                      {(sessionsByCase[cs.id] ?? []).map((s) => (
                        <li key={s.id} className="cardSection" style={{ padding: 8 }}>
                          <div className="row" style={{ alignItems: "baseline" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div>
                                <strong>{new Date(s.started_at).toLocaleString()}</strong>{" "}
                                · {labelForMethod(s.method)}
                              </div>
                              <div style={{ opacity: 0.8 }}>
                                Dauer: {s.duration_min ?? "–"} min · SUD: {s.sud_before ?? "–"} → {s.sud_after ?? "–"}
                              </div>
                            </div>
                            <div className="actions">
                              <button className="btn" onClick={() => openSessionInSessionsPage(s.id)}>
                                Zur Sitzung
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                      {(!sessionsByCase[cs.id] || sessionsByCase[cs.id].length === 0) && (
                        <li className="hint">Noch keine Sitzungen.</li>
                      )}
                    </ul>
                  </div>
                )}
              </li>
            ))}
            {cases.length === 0 && <li className="hint">Noch keine Anliegen.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
