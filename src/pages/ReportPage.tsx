import { useEffect, useMemo, useState } from 'react'
import type { Method, Gender } from '../shared/domain'
import { storage } from '../shared/storage'
import { filterRows, runAnalytics, type Row as RowX, type Query as QueryX, type Result as ResultX } from '../shared/analytics'

type SubTab = 'builder' | 'export'

const METHOD_LABELS: Record<Method, string> = {
  aufloesende_hypnose: 'Auflösende Hypnose',
  klassische_hypnose:  'Klassische Hypnose',
  coaching:            'Coaching',
  other:               'Sonstige',
}
const METHODS: Method[] = ['aufloesende_hypnose','klassische_hypnose','coaching','other']

const PROBLEM_OPTIONS: { value: string; label: string }[] = [
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

export default function ReportPage() {
  const [sub, setSub] = useState<SubTab>('builder')
  const [allRows, setAllRows] = useState<RowX[]>([])
  const [lastFiltered, setLastFiltered] = useState<RowX[] | null>(null)
  const [lastResult, setLastResult] = useState<ResultX | null>(null)

  useEffect(() => {
    storage.listAllSessionsExpanded().then(setAllRows)
  }, [])

  return (
    <section className="card">
      <div className="actions" style={{justifyContent:'flex-start', marginBottom:10}}>
        <button className={`btn ${sub==='builder'?'btnPrimary':''}`} onClick={()=>setSub('builder')}>Abfrage</button>
        <button className={`btn ${sub==='export'?'btnPrimary':''}`} onClick={()=>setSub('export')}>Export</button>
      </div>

      {sub === 'builder' ? (
        <QueryBuilder
          allRows={allRows}
          onRun={(rows, result) => { setLastFiltered(rows); setLastResult(result) }}
          lastResult={lastResult}
        />
      ) : (
        <ExportPanel rows={lastFiltered ?? allRows} />
      )}
    </section>
  )
}

/* -------------------------- Query Builder -------------------------- */

function QueryBuilder({
  allRows,
  onRun,
  lastResult,
}: {
  allRows: RowX[]
  onRun: (rows: RowX[], result: ResultX) => void
  lastResult: ResultX | null
}) {
  const [gender, setGender] = useState<Gender | ''>('')
  const [method, setMethod] = useState<Method | ''>('')
  const [ageMin, setAgeMin] = useState<string>('')
  const [ageMax, setAgeMax] = useState<string>('')
  const [minSessions, setMinSessions] = useState<string>('')
  const [problem, setProblem] = useState<string>('')

  const q: QueryX = useMemo(() => ({
    gender: gender || undefined,
    method: method || undefined,
    ageMin: ageMin === '' ? null : Number(ageMin),
    ageMax: ageMax === '' ? null : Number(ageMax),
    minSessionsPerClient: minSessions === '' ? null : Number(minSessions),
    problem: problem || undefined,
  }), [gender, method, ageMin, ageMax, minSessions, problem])

  function run() {
    const filtered = filterRows(allRows, q)
    const result = runAnalytics(filtered)
    onRun(filtered, result)
  }

  return (
    <>
      <h2 style={{marginTop:0}}>Abfrage erstellen</h2>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div>
          <label>Geschlecht<br/>
            <select className="input" value={gender} onChange={(e)=>setGender(e.target.value as Gender | '')}>
              <option value="">alle</option>
              <option value="w">weiblich</option>
              <option value="m">männlich</option>
              <option value="d">divers</option>
            </select>
          </label>
        </div>

        <div>
          <label>Methode<br/>
            <select className="input" value={method} onChange={(e)=>setMethod(e.target.value as Method | '')}>
              <option value="">alle</option>
              {METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
            </select>
          </label>
        </div>

        <div>
          <label>Alter (ab)<br/>
            <input className="input" type="number" min={0} placeholder="z. B. 18"
                   value={ageMin} onChange={(e)=>setAgeMin(e.target.value)} />
          </label>
        </div>

        <div>
          <label>Alter (bis)<br/>
            <input className="input" type="number" min={0} placeholder="z. B. 80"
                   value={ageMax} onChange={(e)=>setAgeMax(e.target.value)} />
          </label>
        </div>

        <div>
          <label>Anzahl Sitzungen (≥)<br/>
            <input className="input" type="number" min={0}
                   value={minSessions} onChange={(e)=>setMinSessions(e.target.value)} />
          </label>
        </div>

        <div>
          <label>Anliegen/Problem<br/>
            <select className="input" value={problem} onChange={(e)=>setProblem(e.target.value)}>
              <option value="">alle</option>
              {PROBLEM_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="actions" style={{marginTop:12}}>
        <button className="btn btnPrimary" onClick={run}>Abfrage ausführen</button>
        <button className="btn" onClick={()=>{
          const name = prompt('Abfrage-Namen eingeben (wird lokal gespeichert):')
          if (!name) return
          const saved = { name, gender, method, ageMin, ageMax, minSessions, problem }
          const key = 'notizia_saved_queries'
          const prev = JSON.parse(localStorage.getItem(key) || '[]')
          prev.unshift(saved)
          localStorage.setItem(key, JSON.stringify(prev).replace(/\u2028|\u2029/g,''))
          alert('Gespeichert.')
        }}>Abfrage speichern</button>
        <button className="btn" onClick={()=>window.print()}>Drucken</button>
      </div>

      {/* Ergebnis-Übersicht */}
      {lastResult && (
        <div className="card" style={{marginTop:12, display:'grid', gap:12}}>
          <h3 style={{margin:0}}>Ergebnis</h3>

          <div className="row" style={{flexWrap:'wrap', gap:12}}>
            <div><strong>Sitzungen:</strong> {lastResult.totalSessions}</div>
            <div><strong>Ø Dauer:</strong> {lastResult.dur.mean != null ? `${lastResult.dur.mean.toFixed(1)} min` : '–'}</div>
            <div><strong>Median SUD Δ:</strong> {lastResult.sudDelta.median ?? '–'}</div>
            <div><strong>Gelöste Anliegen:</strong> {lastResult.closedCases}</div>
          </div>

          <Section title="Methoden-Verteilung">
            <Bars items={lastResult.sessionsByMethod.map(m => ({
              label: METHOD_LABELS[m.method],
              value: m.count
            }))} />
          </Section>

          <Section title="Verteilung Geschlecht (Sitzungen)">
            <Bars items={[
              { label: 'weiblich', value: lastResult.byGender.w },
              { label: 'männlich', value: lastResult.byGender.m },
              { label: 'divers',   value: lastResult.byGender.d },
            ]} />
          </Section>

          <Section title="Verteilung Altersklassen (Sitzungen)">
            <Bars items={lastResult.byAgeClass.map(x => ({ label: x.label, value: x.count }))} />
          </Section>

          <Section title="Trend (Monate)">
            <Bars items={lastResult.trendMonth.map(x => ({ label: x.key, value: x.count }))} />
          </Section>

          <Section title="Trend (ISO‑Wochen)">
            <Bars items={lastResult.trendWeek.map(x => ({ label: x.key, value: x.count }))} />
          </Section>
        </div>
      )}
    </>
  )
}

/* ------------------------------ Export ------------------------------ */

function ExportPanel({ rows }: { rows: RowX[] }) {
  const [anon, setAnon] = useState(false)
  const [closedOnly, setClosedOnly] = useState(false)
  const [includeSessions, setIncludeSessions] = useState(true)

  const exportRows = useMemo(() => {
    let out = rows
    if (closedOnly) out = out.filter(r => (r.case.status ?? 'open') !== 'open')
    return out
  }, [rows, closedOnly])

  function download(filename: string, text: string, mime = 'text/plain') {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  function exportCSV() {
    const head = [
      'date','client','gender','age',
      'problem_category','problem_text','case_status',
      'method','duration_min','sud_before','sud_after','sud_delta'
    ]
    const lines = [head.join(';')]

    for (const r of exportRows) {
      const cname = anon ? `Client ${r.client.id}` : r.client.name
      const sudDelta =
        r.session.sud_before != null && r.session.sud_after != null
          ? (r.session.sud_before - r.session.sud_after)
          : ''
      lines.push([
        new Date(r.session.started_at).toLocaleString(),
        cname,
        r.client.gender ?? '',
        r.client.age ?? '',
        r.case.problem_category,
        (r.case.problem_text ?? '').replace(/[\r\n;]+/g,' ').trim(),
        r.case.status ?? '',
        r.session.method,
        r.session.duration_min ?? '',
        r.session.sud_before ?? '',
        r.session.sud_after ?? '',
        sudDelta
      ].join(';'))
    }

    download('notizia_export.csv', lines.join('\n'), 'text/csv')
  }

  function exportJSON() {
    const mapped = exportRows.map(r => ({
      date: r.session.started_at,
      client: anon ? `Client ${r.client.id}` : r.client.name,
      gender: r.client.gender,
      age: r.client.age,
      case: {
        id: r.case.id,
        problem_category: r.case.problem_category,
        problem_text: r.case.problem_text,
        status: r.case.status,
      },
      session: includeSessions ? {
        id: r.session.id,
        method: r.session.method,
        duration_min: r.session.duration_min,
        sud_before: r.session.sud_before,
        sud_after: r.session.sud_after,
      } : undefined
    }))
    download('notizia_export.json', JSON.stringify(mapped, null, 2), 'application/json')
  }

  return (
    <>
      <h2 style={{marginTop:0}}>Export</h2>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div className="card">
          <h3>Optionen</h3>
          <label><input type="checkbox" checked={anon} onChange={e=>setAnon(e.target.checked)} /> Anonymisiert</label><br/>
          <label><input type="checkbox" checked={closedOnly} onChange={e=>setClosedOnly(e.target.checked)} /> Nur gelöste Anliegen</label><br/>
          <label><input type="checkbox" checked={includeSessions} onChange={e=>setIncludeSessions(e.target.checked)} /> Sitzungen beilegen</label>
          <div className="actions" style={{marginTop:8}}>
            <button className="btn btnPrimary" onClick={exportCSV}>CSV exportieren</button>
            <button className="btn" onClick={exportJSON}>JSON exportieren</button>
          </div>
        </div>

        <div className="card">
          <h3>Vorschau</h3>
          <div className="hint">
            {rows.length} Datensätze (aktuelle Abfrage{rows === exportRows ? '' : ', gefiltert'}).
          </div>
        </div>
      </div>
    </>
  )
}

/* --------------------------- Mini-Komponenten --------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h4 style={{margin:'0 0 .25rem 0'}}>{title}</h4>
      {children}
    </div>
  )
}

function Bars({ items }: { items: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...items.map(i => i.value))
  return (
    <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gap:6 }}>
      {items.map((i) => (
        <li key={i.label} className="item" style={{ display:'grid', gap:6, alignItems:'center' }}>
          <div className="row" style={{ gap:12 }}>
            <div style={{ width:160 }}>{i.label}</div>
            <div style={{ flex:1, background:'#eef2f7', borderRadius:8, overflow:'hidden' }}>
              <div style={{ width:`${(i.value/max)*100}%`, minWidth:2, height:10, background:'var(--primary)' }} />
            </div>
            <div style={{ width:40, textAlign:'right' }}>{i.value}</div>
          </div>
        </li>
      ))}
      {items.length === 0 && <li className="hint">Keine Daten.</li>}
    </ul>
  )
}
