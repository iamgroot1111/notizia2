import { useEffect, useMemo, useState } from 'react';
import type { Method, Gender, Client } from '../shared/domain';
import { storage } from '../shared/storage';
import {
  filterRows,
  runAnalytics,
  type Row as RowX,
  type Query as QueryX,
  type Result as ResultX,
} from '../shared/analytics';

/* -------------------- Labels & Optionen -------------------- */

const METHOD_LABELS: Record<Method, string> = {
  aufloesende_hypnose: 'Auflösende Hypnose',
  klassische_hypnose:  'Klassische Hypnose',
  coaching:            'Coaching',
  other:               'Sonstige',
};
const METHODS: Method[] = ['aufloesende_hypnose','klassische_hypnose','coaching','other'];

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
];
const PROBLEM_LABELS: Record<string, string> = Object.fromEntries(
  PROBLEM_OPTIONS.map(p => [p.value, p.label])
) as Record<string, string>;

/* -------------------- Typ‑Helfer & Utilities -------------------- */

type KV = { label: string; value: number };
type G3 = 'w' | 'm' | 'd';
const GALL: readonly G3[] = ['w','m','d'] as const;

const AGE_CLASSES = [
  { label: '0–17',  min: 0,  max: 17 },
  { label: '18–29', min: 18, max: 29 },
  { label: '30–44', min: 30, max: 44 },
  { label: '45–59', min: 45, max: 59 },
  { label: '60+',   min: 60, max: null as number | null },
];
function ageClassOf(age: number | null | undefined): string | null {
  if (typeof age !== 'number') return null;
  const c = AGE_CLASSES.find(c => age >= c.min && (c.max == null || age <= c.max));
  return c ? c.label : null;
}

const SOLVED = new Set(['solved','closed','done','abgeschlossen','erledigt']);
function isClosed(status?: string | null) {
  const s = (status ?? '').toLowerCase();
  return (s && s !== 'open') || SOLVED.has(s);
}

/* ========================================================== */

export default function ReportPage() {
  const [sub, setSub] = useState<'builder'|'export'>('builder');
  const [allRows, setAllRows] = useState<RowX[]>([]);
  const [lastFiltered, setLastFiltered] = useState<RowX[] | null>(null);
  const [lastResult, setLastResult] = useState<ResultX | null>(null);

  useEffect(() => {
    storage.listAllSessionsExpanded().then(setAllRows);
  }, []);

  return (
    <section className="card" style={{ display:'grid', gap:12 }}>
      <h1 style={{marginTop:0}}>Auswertungen</h1>

      <div className="actions" style={{justifyContent:'flex-start'}}>
        <button className={`btn ${sub==='builder'?'btnPrimary':''}`} onClick={()=>setSub('builder')}>Abfrage</button>
        <button className={`btn ${sub==='export'?'btnPrimary':''}`}  onClick={()=>setSub('export')}>Export</button>
      </div>

      {sub === 'builder' ? (
        <QueryBuilder
          allRows={allRows}
          onRun={(rows, result) => { setLastFiltered(rows); setLastResult(result); }}
          lastRows={lastFiltered}
          lastResult={lastResult}
        />
      ) : (
        <ExportPanel rows={lastFiltered ?? allRows} />
      )}
    </section>
  );
}

/* -------------------------- Query Builder -------------------------- */

function QueryBuilder({
  allRows,
  onRun,
  lastRows,
  lastResult,
}: {
  allRows: RowX[];
  onRun: (rows: RowX[], result: ResultX) => void;
  lastRows: RowX[] | null;
  lastResult: ResultX | null;
}) {
  const [gender, setGender] = useState<Gender | ''>('');
  const [method, setMethod] = useState<Method | ''>('');
  const [ageMin, setAgeMin] = useState<string>('');
  const [ageMax, setAgeMax] = useState<string>('');
  const [minSessions, setMinSessions] = useState<string>('');
  const [problem, setProblem] = useState<string>('');

  const q: QueryX = useMemo(() => ({
    gender: gender || undefined,
    method: method || undefined,
    ageMin: ageMin === '' ? null : Number(ageMin),
    ageMax: ageMax === '' ? null : Number(ageMax),
    minSessionsPerClient: minSessions === '' ? null : Number(minSessions),
    problem: problem || undefined,
  }), [gender, method, ageMin, ageMax, minSessions, problem]);

  function run() {
    const filtered = filterRows(allRows, q);
    const result = runAnalytics(filtered);
    onRun(filtered, result);
  }

  /* ---------- Zusatz‑Kennzahlen (stabilisiert) ---------- */
  const rows = useMemo<RowX[]>(() => lastRows ?? [], [lastRows]);

  // 1) Anliegen‑Verteilung
  const byProblem = useMemo<KV[]>(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const key = r.case.problem_category;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m]
      .map(([k,v]) => ({ label: PROBLEM_LABELS[k] ?? k, value: v }))
      .sort((a,b)=>b.value - a.value);
  }, [rows]);

  // 2) Verteilung Geschlecht (Anliegen)
  const byGenderProblem = useMemo<Record<G3, KV[]>>(() => {
    const out: Record<G3, KV[]> = { w:[], m:[], d:[] };
    for (const g of GALL) {
      const m = new Map<string, number>();
      for (const r of rows) if (r.client.gender === g) {
        const k = r.case.problem_category;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      out[g] = [...m]
        .map(([k,v]) => ({ label: PROBLEM_LABELS[k] ?? k, value: v }))
        .sort((a,b)=>b.value - a.value);
    }
    return out;
  }, [rows]);

  // 2b) Verteilung Geschlecht (Methode)
  const byGenderMethod = useMemo<Record<G3, KV[]>>(() => {
    const out: Record<G3, KV[]> = { w:[], m:[], d:[] };
    for (const g of GALL) {
      const m = new Map<Method, number>();
      for (const r of rows) if (r.client.gender === g) {
        const k = r.session.method;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      out[g] = [...m]
        .map(([k,v]) => ({ label: METHOD_LABELS[k], value: v }))
        .sort((a,b)=>b.value - a.value);
    }
    return out;
  }, [rows]);

  // 3) Verteilung Altersklassen (Anliegen)
  const byAgeProblem = useMemo<Record<string, KV[]>>(() => {
    const maps: Record<string, Map<string, number>> = {};
    for (const c of AGE_CLASSES) maps[c.label] = new Map();
    for (const r of rows) {
      const ac = ageClassOf(r.client.age);
      if (!ac) continue;
      const k = r.case.problem_category;
      const m = maps[ac];
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    const out: Record<string, KV[]> = {};
    for (const c of AGE_CLASSES) {
      out[c.label] = [...maps[c.label]]
        .map(([k,v]) => ({ label: PROBLEM_LABELS[k] ?? k, value: v }))
        .sort((a,b)=>b.value - a.value);
    }
    return out;
  }, [rows]);

  // 3b) Verteilung Altersklassen (Methode)
  const byAgeMethod = useMemo<Record<string, KV[]>>(() => {
    const maps: Record<string, Map<Method, number>> = {};
    for (const c of AGE_CLASSES) maps[c.label] = new Map();
    for (const r of rows) {
      const ac = ageClassOf(r.client.age);
      if (!ac) continue;
      const k = r.session.method;
      const m = maps[ac];
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    const out: Record<string, KV[]> = {};
    for (const c of AGE_CLASSES) {
      out[c.label] = [...maps[c.label]]
        .map(([k,v]) => ({ label: METHOD_LABELS[k], value: v }))
        .sort((a,b)=>b.value - a.value);
    }
    return out;
  }, [rows]);

  // 4) Ø Sitzungen je Fall (Anliegen × Methode)
  const avgSessionsByProblemMethod = useMemo<KV[]>(() => {
    const pairMap = new Map<string, Map<number, number>>(); // "problem__method" -> caseId -> count
    for (const r of rows) {
      const pair = `${r.case.problem_category}__${r.session.method}`;
      let byCase = pairMap.get(pair);
      if (!byCase) { byCase = new Map(); pairMap.set(pair, byCase); }
      byCase.set(r.case.id, (byCase.get(r.case.id) ?? 0) + 1);
    }
    const items: KV[] = [];
    for (const [pair, byCase] of pairMap) {
      const [prob, meth] = pair.split('__') as [string, Method];
      const counts = [...byCase.values()];
      const mean = counts.reduce((s,x)=>s+x,0) / counts.length;
      items.push({ label: `${PROBLEM_LABELS[prob] ?? prob} × ${METHOD_LABELS[meth]}`, value: Number(mean.toFixed(1)) });
    }
    return items.sort((a,b)=>b.value - a.value);
  }, [rows]);

  // 5) Ø Sitzungen je gelöstem Fall (Methode)
  const avgSessionsSolvedByMethod = useMemo<KV[]>(() => {
    const solved = new Set<number>();
    for (const r of rows) if (isClosed(r.case.status)) solved.add(r.case.id);

    const map = new Map<Method, Map<number, number>>(); // method -> caseId -> count
    for (const r of rows) {
      if (!solved.has(r.case.id)) continue;
      const m = r.session.method;
      let byCase = map.get(m);
      if (!byCase) { byCase = new Map(); map.set(m, byCase); }
      byCase.set(r.case.id, (byCase.get(r.case.id) ?? 0) + 1);
    }
    const items: KV[] = [];
    for (const [m, byCase] of map) {
      const counts = [...byCase.values()];
      const mean = counts.reduce((s,x)=>s+x,0) / counts.length;
      items.push({ label: METHOD_LABELS[m], value: Number(mean.toFixed(1)) });
    }
    return items.sort((a,b)=>b.value - a.value);
  }, [rows]);

  // Für die Anzeige „Verteilung Geschlecht (Klienten)“
  const uniqueClients: Client[] = useMemo(() => {
    const m = new Map<number, Client>();
    for (const r of rows) m.set(r.client.id, r.client);
    return Array.from(m.values());
  }, [rows]);
  const byGenderClients = useMemo(() => {
    const g = { w:0, m:0, d:0, unknown:0 };
    for (const c of uniqueClients) {
      if (c.gender === 'w') g.w++; else if (c.gender === 'm') g.m++;
      else if (c.gender === 'd') g.d++; else g.unknown++;
    }
    return g;
  }, [uniqueClients]);

  /* -------------------- UI -------------------- */
  return (
    <>
      <div className="card">
        <h2 style={{margin:'0 0 8px 0'}}>Abfrage erstellen</h2>

        <div className="formGrid">
          <label>Geschlecht
            <select className="input" value={gender} onChange={(e)=>setGender(e.target.value as Gender | '')}>
              <option value="">alle</option>
              <option value="w">weiblich</option>
              <option value="m">männlich</option>
              <option value="d">divers</option>
            </select>
          </label>

          <label>Methode
            <select className="input" value={method} onChange={(e)=>setMethod(e.target.value as Method | '')}>
              <option value="">alle</option>
              {METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
            </select>
          </label>

          <label>Alter (ab)
            <input className="input" type="number" min={0} placeholder="z. B. 18"
                   value={ageMin} onChange={(e)=>setAgeMin(e.target.value)} />
          </label>

          <label>Alter (bis)
            <input className="input" type="number" min={0} placeholder="z. B. 80"
                   value={ageMax} onChange={(e)=>setAgeMax(e.target.value)} />
          </label>

          <label>Anzahl Sitzungen (≥)
            <input className="input" type="number" min={0}
                   value={minSessions} onChange={(e)=>setMinSessions(e.target.value)} />
          </label>

          <label>Anliegen/Problem
            <select className="input" value={problem} onChange={(e)=>setProblem(e.target.value)}>
              <option value="">alle</option>
              {PROBLEM_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>

          <div className="actions">
            <button className="btn btnPrimary" onClick={run}>Abfrage ausführen</button>
            <button className="btn" onClick={()=>{
              const name = prompt('Abfrage-Namen eingeben (wird lokal gespeichert):');
              if (!name) return;
              const saved = { name, gender, method, ageMin, ageMax, minSessions, problem };
              const key = 'notizia_saved_queries';
              const prev = JSON.parse(localStorage.getItem(key) || '[]');
              prev.unshift(saved);
              localStorage.setItem(key, JSON.stringify(prev).replace(/\u2028|\u2029/g,''));
              alert('Gespeichert.');
            }}>Abfrage speichern</button>
            <button className="btn" onClick={()=>window.print()}>Drucken</button>
          </div>
        </div>
      </div>

      {/* Ergebnis-Übersicht */}
      {lastResult && (
        <div className="card" style={{ display:'grid', gap:12, overflowX:'hidden' }}>
          <h2 style={{margin:'0'}}>Ergebnis</h2>

          <div className="row" style={{flexWrap:'wrap', gap:12}}>
            <div><strong>Sitzungen:</strong> {lastResult.totalSessions}</div>
            <div><strong>Ø&nbsp;Dauer:</strong> {lastResult.dur.mean != null ? `${lastResult.dur.mean.toFixed(1)} min` : '–'}</div>
            <div><strong>Gelöste Anliegen:</strong> {lastResult.closedCases}</div>
          </div>

          <Section title="Methoden‑Verteilung">
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

          {/* ---- Zusatz-Abschnitte (wie von dir gefordert) ---- */}

          <Section title="Anliegen‑Verteilung">
            <Bars items={byProblem} />
          </Section>

          <Section title="Verteilung Geschlecht (Anliegen)">
            <Sub title="weiblich"><Bars items={byGenderProblem.w} /></Sub>
            <Sub title="männlich"><Bars items={byGenderProblem.m} /></Sub>
            <Sub title="divers"><Bars items={byGenderProblem.d} /></Sub>
          </Section>

          <Section title="Verteilung Geschlecht (Methode)">
            <Sub title="weiblich"><Bars items={byGenderMethod.w} /></Sub>
            <Sub title="männlich"><Bars items={byGenderMethod.m} /></Sub>
            <Sub title="divers"><Bars items={byGenderMethod.d} /></Sub>
          </Section>

          <Section title="Verteilung Altersklassen (Anliegen)">
            {AGE_CLASSES.map(c => (
              <Sub key={c.label} title={c.label}><Bars items={byAgeProblem[c.label] ?? []} /></Sub>
            ))}
          </Section>

          <Section title="Verteilung Altersklassen (Methode)">
            {AGE_CLASSES.map(c => (
              <Sub key={c.label} title={c.label}><Bars items={byAgeMethod[c.label] ?? []} /></Sub>
            ))}
          </Section>

          <Section title="Ø Sitzungen je Fall (Anliegen × Methode)">
            <Bars items={avgSessionsByProblemMethod} format={(n)=>n.toFixed(1)} />
          </Section>

          <Section title="Ø Sitzungen je gelöstem Fall (Methode)">
            <Bars items={avgSessionsSolvedByMethod} format={(n)=>n.toFixed(1)} />
          </Section>

          <Section title="Verteilung Geschlecht (Klienten)">
            <Bars items={[
              { label: 'weiblich', value: byGenderClients.w },
              { label: 'männlich', value: byGenderClients.m },
              { label: 'divers',   value: byGenderClients.d },
              // { label: 'unbekannt', value: byGenderClients.unknown },
            ]} />
          </Section>
        </div>
      )}
    </>
  );
}

/* ------------------------------ Export ------------------------------ */

function ExportPanel({ rows }: { rows: RowX[] }) {
  const [anon, setAnon] = useState(false);
  const [closedOnly, setClosedOnly] = useState(false);
  const [includeSessions, setIncludeSessions] = useState(true);

  const exportRows = useMemo(() => {
    let out = rows;
    if (closedOnly) out = out.filter(r => (r.case.status ?? 'open') !== 'open');
    return out;
  }, [rows, closedOnly]);

  function download(filename: string, text: string, mime = 'text/plain') {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    const head = [
      'date','client','gender','age',
      'problem_category','problem_text','case_status',
      'method','duration_min','sud_before','sud_after','sud_delta'
    ];
    const lines = [head.join(';')];

    for (const r of exportRows) {
      const cname = anon ? `Client ${r.client.id}` : r.client.name;
      const sudDelta =
        r.session.sud_before != null && r.session.sud_after != null
          ? (r.session.sud_before - r.session.sud_after)
          : '';
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
      ].join(';'));
    }

    download('notizia_export.csv', lines.join('\n'), 'text/csv');
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
    }));
    download('notizia_export.json', JSON.stringify(mapped, null, 2), 'application/json');
  }

  return (
    <div className="card">
      <h2 style={{marginTop:0}}>Export</h2>

      <div className="formGrid">
        <div className="card">
          <h3 style={{marginTop:0}}>Optionen</h3>
          <label><input type="checkbox" checked={anon} onChange={e=>setAnon(e.target.checked)} /> Anonymisiert</label>
          <label><input type="checkbox" checked={closedOnly} onChange={e=>setClosedOnly(e.target.checked)} /> Nur gelöste Anliegen</label>
          <label><input type="checkbox" checked={includeSessions} onChange={e=>setIncludeSessions(e.target.checked)} /> Sitzungen beilegen</label>
          <div className="actions" style={{marginTop:8}}>
            <button className="btn btnPrimary" onClick={exportCSV}>CSV exportieren</button>
            <button className="btn" onClick={exportJSON}>JSON exportieren</button>
          </div>
        </div>

        <div className="card">
          <h3 style={{marginTop:0}}>Vorschau</h3>
          <div className="hint">
            {rows.length} Datensätze (aktuelle Abfrage{rows === exportRows ? '' : ', gefiltert'}).
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Mini-Komponenten --------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h4 style={{margin:'0 0 .25rem 0'}}>{title}</h4>
      <div style={{maxWidth:'100%'}}>{children}</div>
    </div>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="cardSection" style={{marginTop:6}}>
      <strong style={{display:'block', marginBottom:6}}>{title}</strong>
      {children}
    </div>
  );
}

function Bars({
  items,
  format = (n:number)=>String(n),
}: {
  items: Array<{ label: string; value: number }>;
  format?: (n:number)=>string;
}) {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gap:6 }}>
      {items.map((i) => {
        const pct = (i.value / max) * 100;
        return (
          <li key={i.label} style={{ minWidth:0 }}>
            <div
              style={{
                display:'grid',
                gridTemplateColumns:'minmax(90px,1fr) 1fr auto',
                gap:8,
                alignItems:'center',
                minWidth:0
              }}
            >
              <div style={{overflow:'hidden', textOverflow:'ellipsis'}}>{i.label}</div>
              <div style={{ background:'#eef2f7', borderRadius:8, overflow:'hidden', minWidth:0 }}>
                <div style={{ width:`${pct}%`, minWidth:2, height:10, background:'var(--primary)' }} />
              </div>
              <div style={{ minWidth:24, textAlign:'right', whiteSpace:'nowrap' }}>{format(i.value)}</div>
            </div>
          </li>
        );
      })}
      {items.length === 0 && <li className="hint">Keine Daten.</li>}
    </ul>
  );
}
