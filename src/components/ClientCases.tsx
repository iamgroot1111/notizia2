import { useCallback, useEffect, useState } from 'react'
import type { Case, Session } from '../shared/domain'
import { storage } from '../shared/storage'
import '../app.css' // nur falls deine globalen Klassen hier definiert sind

/* Deutsch sichtbare Namen für Anliegen (Problem-Kategorien) */
const PROBLEM_OPTIONS: { value: Case['problem_category']; label: string }[] = [
  { value: 'overweight',     label: 'Übergewicht' },
  { value: 'social_anxiety', label: 'Soziale Angst' },
  { value: 'panic',          label: 'Panik' },
  { value: 'depression',     label: 'Depression' },
  { value: 'sleep',          label: 'Schlafproblem' },
  { value: 'pain',           label: 'Schmerzen' },
  { value: 'self_worth',     label: 'Selbstwert' },
  { value: 'relationship',   label: 'Beziehungen' },
  { value: 'other',          label: 'Sonstige' },
]

/* Methoden deutsch anzeigen (technischer Wert bleibt) */
const METHOD_LABELS: Record<Session['method'], string> = {
  aufloesende_hypnose: 'Auflösende Hypnose',
  klassische_hypnose:  'Klassische Hypnose',
  coaching:            'Coaching',
  other:               'Sonstige',
}
const METHODS: Session['method'][] = [
  'aufloesende_hypnose', 'klassische_hypnose', 'coaching', 'other',
]

type Props = { clientId: number }

export default function ClientCases({ clientId }: Props) {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)

  // Neues Anliegen
  const [pcat, setPcat]   = useState<Case['problem_category']>('other')
  const [ptext, setPtext] = useState('')

  // Anzeige
  const [showCases, setShowCases]   = useState(false)
  const [openCaseId, setOpenCaseId] = useState<number | null>(null)

  // Sitzungen pro Anliegen
  const [sessionsByCase, setSessionsByCase] =
    useState<Record<number, Session[]>>(() => ({}))

  // Sitzung bearbeiten
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null)
  const [editPatch, setEditPatch] = useState<Partial<Session>>({})

  const labelForProblem = (v: Case['problem_category']) =>
    PROBLEM_OPTIONS.find(o => o.value === v)?.label ?? v
  const labelForMethod  = (m: Session['method']) => METHOD_LABELS[m] ?? m

  // --- Daten laden ---
  const refreshCases = useCallback(async () => {
    setLoading(true)
    const list = await storage.listCases(clientId)
    setCases(list)
    setLoading(false)
  }, [clientId])

  useEffect(() => { refreshCases() }, [refreshCases])

  // --- Anliegen anlegen ---
  async function addCase() {
    if (!ptext.trim()) return
    await storage.addCase({
      client_id: clientId,
      problem_category: pcat,
      problem_text: ptext.trim(),
      started_at: new Date().toISOString(),
    })
    setPcat('other'); setPtext('')
    await refreshCases()
  }

  const onNewCaseKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && ptext.trim()) { e.preventDefault(); void addCase() }
  }

  // --- Sitzungen laden/öffnen ---
  async function toggleSessions(caseId: number) {
    if (openCaseId === caseId) { setOpenCaseId(null); return }
    setOpenCaseId(caseId)
    const list = await storage.listSessions(caseId)
    setSessionsByCase(prev => ({ ...prev, [caseId]: list }))
    setEditingSessionId(null)
  }

  // --- neue Sitzung ---
  const [sMethod, setSMethod] = useState<Session['method']>('aufloesende_hypnose')
  const [sBefore, setSBefore] = useState<number | ''>(''),
        [sAfter,  setSAfter]  = useState<number | ''>(''),
        [sDur,    setSDur]    = useState<number | ''>('')

  const onNewSessionKeyDown: React.KeyboardEventHandler<HTMLInputElement | HTMLSelectElement> = (e) => {
    if (e.key === 'Enter' && openCaseId != null) { e.preventDefault(); void addSession(openCaseId) }
  }

  async function addSession(caseId: number) {
    await storage.addSession({
      case_id: caseId,
      started_at: new Date().toISOString(),
      duration_min: sDur === '' ? null : Number(sDur),
      method: sMethod,
      ease_hypnosis: null,                  // Leichtigkeit vollständig entfernt
      sud_before: sBefore === '' ? null : Number(sBefore),
      sud_after:  sAfter  === '' ? null : Number(sAfter),
      emotional_release: null, insights: null, notes: null,
    })
    setSDur(''); setSBefore(''); setSAfter('')
    const list = await storage.listSessions(caseId)
    setSessionsByCase(prev => ({ ...prev, [caseId]: list }))
  }

  // --- Sitzung bearbeiten ---
  function startEditSession(s: Session) {
    setEditingSessionId(s.id)
    setEditPatch({
      method: s.method,
      duration_min: s.duration_min,
      sud_before: s.sud_before,
      sud_after: s.sud_after,
    })
  }
  function cancelEditSession() {
    setEditingSessionId(null); setEditPatch({})
  }
  async function saveSession(caseId: number, id: number) {
    await storage.updateSession(id, editPatch)
    const list = await storage.listSessions(caseId)
    setSessionsByCase(prev => ({ ...prev, [caseId]: list }))
    cancelEditSession()
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
            <select value={pcat} onChange={e => setPcat(e.target.value as Case['problem_category'])}>
              {PROBLEM_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="kv">
            <div>Beschreibung</div>
            <input
              placeholder="Kurzbeschreibung"
              value={ptext}
              onChange={e => setPtext(e.target.value)}
              onKeyDown={onNewCaseKeyDown}
            />
          </div>
        </div>

        <div className="toolbar">
          <button className="btn" onClick={addCase} disabled={!ptext.trim()}>Anliegen anlegen</button>
          {loading && <span className="hint">…laden</span>}
        </div>
      </div>

      {/* Toggle Liste */}
      <div className="toolbar" style={{ marginTop: 8 }}>
        <button
          className="btn"
          onClick={() => setShowCases(s => !s)}
          aria-expanded={showCases}
          aria-controls={`cases-${clientId}`}
        >
          {showCases ? `Anliegen verbergen (${cases.length})` : `Anliegen anzeigen (${cases.length})`}
        </button>
      </div>

      {/* Anliegen-Liste */}
      {showCases && (
        <div id={`cases-${clientId}`} style={{ marginTop: 10 }}>
          <strong>Anliegen</strong>
          <ul style={{ listStyle:'none', padding:0, display:'grid', gap:8 }}>
            {cases.map(cs => (
              <li key={cs.id} className="cardSection">
                <div className="header">
                  <div>
                    <div>
                      <strong>#{cs.id}</strong> · {labelForProblem(cs.problem_category)} ·{' '}
                      <em>{new Date(cs.started_at).toLocaleDateString()}</em>
                    </div>
                    <div style={{opacity:.85}}>{cs.problem_text}</div>
                    <div style={{opacity:.7}}>Status: {cs.status}</div>
                  </div>

                  <div className="toolbar">
                    <button
                      className="btn"
                      onClick={() => toggleSessions(cs.id)}
                      aria-expanded={openCaseId === cs.id}
                      aria-controls={`sessions-${cs.id}`}
                    >
                      {openCaseId === cs.id ? 'Sitzungen schließen' : 'Sitzungen zeigen'}
                    </button>
                  </div>
                </div>

                {openCaseId === cs.id && (
                  <div id={`sessions-${cs.id}`} style={{ marginTop: 8, display:'grid', gap:8 }}>
                    {/* Sitzung anlegen */}
                    <form onSubmit={(e)=>{e.preventDefault(); void addSession(cs.id)}} className="rowGrid cardSection">
                      <div className="kv">
                        <div>Methode</div>
                        <select
                          value={sMethod}
                          onChange={e => setSMethod(e.target.value as Session['method'])}
                          onKeyDown={onNewSessionKeyDown}
                        >
                          {METHODS.map(m => <option key={m} value={m}>{labelForMethod(m)}</option>)}
                        </select>
                      </div>

                      <div className="kv">
                        <div>Dauer (min)</div>
                        <input
                          type="number" min={0}
                          value={sDur}
                          onChange={e=>setSDur(e.target.value===''?'':Number(e.target.value))}
                          onKeyDown={onNewSessionKeyDown}
                        />
                      </div>

                      <div className="kv">
                        <div>SUD vor</div>
                        <input
                          type="number" min={0} max={10}
                          value={sBefore}
                          onChange={e=>setSBefore(e.target.value===''?'':Number(e.target.value))}
                          onKeyDown={onNewSessionKeyDown}
                        />
                      </div>

                      <div className="kv">
                        <div>SUD nach</div>
                        <input
                          type="number" min={0} max={10}
                          value={sAfter}
                          onChange={e=>setSAfter(e.target.value===''?'':Number(e.target.value))}
                          onKeyDown={onNewSessionKeyDown}
                        />
                      </div>

                      <div className="toolbar">
                        <button className="btn" type="submit">Sitzung hinzufügen</button>
                      </div>
                    </form>

                    {/* Sitzungsliste (mit Bearbeiten) */}
                    <ul style={{ listStyle:'none', padding:0, display:'grid', gap:6 }}>
                      {(sessionsByCase[cs.id] ?? []).map(s => {
                        const isEdit = editingSessionId === s.id
                        return (
                          <li key={s.id} className="cardSection" style={{ padding:8 }}>
                            {!isEdit ? (
                              <div className="row" style={{ alignItems:'baseline' }}>
                                <div style={{flex:1,minWidth:0}}>
                                  <div><strong>{new Date(s.started_at).toLocaleString()}</strong> · {labelForMethod(s.method)}</div>
                                  <div style={{opacity:.8}}>
                                    Dauer: {s.duration_min ?? '–'} min ·
                                    SUD: {s.sud_before ?? '–'} → {s.sud_after ?? '–'}
                                  </div>
                                </div>
                                <div className="actions">
                                  <button className="btn" onClick={()=>startEditSession(s)}>Bearbeiten</button>
                                  <button className="btn" onClick={()=>storage.deleteSession(s.id).then(()=>toggleSessions(cs.id))}>Löschen</button>
                                </div>
                              </div>
                            ) : (
                              <form onSubmit={(e)=>{e.preventDefault(); void saveSession(cs.id, s.id)}} className="rowGrid">
                                <div className="kv">
                                  <div>Methode</div>
                                  <select
                                    value={editPatch.method ?? s.method}
                                    onChange={e=>setEditPatch(p=>({...p, method:e.target.value as Session['method']}))}
                                  >
                                    {METHODS.map(m => <option key={m} value={m}>{labelForMethod(m)}</option>)}
                                  </select>
                                </div>

                                <div className="kv">
                                  <div>Dauer (min)</div>
                                  <input
                                    type="number" min={0}
                                    value={(editPatch.duration_min ?? s.duration_min) ?? ''}
                                    onChange={e=>setEditPatch(p=>({...p, duration_min: e.target.value===''?null:Number(e.target.value)}))}
                                  />
                                </div>

                                <div className="kv">
                                  <div>SUD vor</div>
                                  <input
                                    type="number" min={0} max={10}
                                    value={(editPatch.sud_before ?? s.sud_before) ?? ''}
                                    onChange={e=>setEditPatch(p=>({...p, sud_before: e.target.value===''?null:Number(e.target.value)}))}
                                  />
                                </div>

                                <div className="kv">
                                  <div>SUD nach</div>
                                  <input
                                    type="number" min={0} max={10}
                                    value={(editPatch.sud_after ?? s.sud_after) ?? ''}
                                    onChange={e=>setEditPatch(p=>({...p, sud_after: e.target.value===''?null:Number(e.target.value)}))}
                                  />
                                </div>

                                <div className="toolbar">
                                  <button className="btn btnPrimary" type="submit">Speichern</button>
                                  <button className="btn" type="button" onClick={cancelEditSession}>Abbrechen</button>
                                </div>
                              </form>
                            )}
                          </li>
                        )
                      })}
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
  )
}
