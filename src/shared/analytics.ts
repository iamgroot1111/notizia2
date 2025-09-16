// src/shared/analytics.ts
// src/shared/analytics.ts
import type { Client, Case, Session, Method, Gender } from './domain'

/** Zeile aus listAllSessionsExpanded */
export type Row = { session: Session; case: Case; client: Client }

export type Query = {
  gender?: Gender | ''                  // '' = alle
  method?: Method | ''                  // '' = alle
  ageMin?: number | null
  ageMax?: number | null
  minSessionsPerClient?: number | null  // ≥
  problem?: string | ''                 // Problem-Kategorie
}

export type Stat = { count: number; mean: number | null; median: number | null; min: number | null; max: number | null }

export type Result = {
  totalSessions: number
  sessionsByMethod: Array<{ method: Method; count: number }>
  dur: Stat
  sudDelta: Stat
  /** Zusätze */
  closedCases: number
  trendMonth: Array<{ key: string; count: number }>     // YYYY-MM
  trendWeek: Array<{ key: string; count: number }>      // YYYY-Www
  byAgeClass: Array<{ label: string; count: number }>
  byGender: { w: number; m: number; d: number }
}

/* ------------------ Helper ------------------ */

function numberStats(values: number[]): Stat {
  const v = values.slice().sort((a,b)=>a-b)
  const n = v.length
  if (!n) return { count: 0, mean: null, median: null, min: null, max: null }
  const sum = v.reduce((s,x)=>s+x,0)
  const mean = sum / n
  const median = n % 2 ? v[(n-1)/2] : (v[n/2-1] + v[n/2]) / 2
  return { count: n, mean, median, min: v[0], max: v[n-1] }
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}
function isoWeekKey(d0: Date) {
  // ISO-Week: Donnerstag-Trick
  const d = new Date(Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const year = d.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil((((+d - +yearStart) / 86400000) + 1) / 7)
  return `${year}-W${String(week).padStart(2,'0')}`
}

/* ------------------ Filter ------------------ */

export function filterRows(rows: Row[], q: Query): Row[] {
  let out = rows

  if (q.method) out = out.filter(r => r.session.method === q.method)
  if (q.gender) out = out.filter(r => r.client.gender === q.gender)

  if (q.problem) out = out.filter(r => r.case.problem_category === q.problem)

  if (q.ageMin != null) {
    out = out.filter(r => typeof r.client.age === 'number' && (r.client.age as number) >= q.ageMin!)
  }
  if (q.ageMax != null) {
    out = out.filter(r => typeof r.client.age === 'number' && (r.client.age as number) <= q.ageMax!)
  }

  if (q.minSessionsPerClient != null) {
    const byClient = new Map<number, number>()
    for (const r of out) byClient.set(r.client.id, (byClient.get(r.client.id) ?? 0) + 1)
    const ok = new Set<number>([...byClient].filter(([,cnt]) => cnt >= q.minSessionsPerClient!).map(([id]) => id))
    out = out.filter(r => ok.has(r.client.id))
  }

  return out
}

/* --------------- Aggregation (KPIs) --------------- */

export function runAnalytics(filtered: Row[]): Result {
  const totalSessions = filtered.length

  /* Methoden-Verteilung */
  const byMethod = new Map<Method, number>()
  for (const r of filtered) {
    byMethod.set(r.session.method, (byMethod.get(r.session.method) ?? 0) + 1)
  }
  const sessionsByMethod = [...byMethod].map(([method,count]) => ({ method, count })).sort((a,b)=>b.count-a.count)

  /* Dauer / SUD-Delta */
  const durations = filtered.map(r => r.session.duration_min).filter((x):x is number => typeof x === 'number')
  const sudDeltas = filtered
    .map(r => (r.session.sud_before != null && r.session.sud_after != null) ? (r.session.sud_before - r.session.sud_after) : null)
    .filter((x):x is number => x != null)

  /* Gelöste Anliegen (einmalig pro Case) */
  const closed = new Set<number>()
  for (const r of filtered) {
    // alles was nicht 'open' ist, als gelöst werten (kannst du später schärfer machen)
    if ((r.case.status ?? 'open') !== 'open') closed.add(r.case.id)
  }

  /* Trends */
  const byMonth = new Map<string, number>()
  const byWeek  = new Map<string, number>()
  for (const r of filtered) {
    const d = new Date(r.session.started_at)
    const mk = monthKey(d), wk = isoWeekKey(d)
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + 1)
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1)
  }
  const trendMonth = [...byMonth].map(([key,count]) => ({key,count})).sort((a,b)=>a.key.localeCompare(b.key))
  const trendWeek  = [...byWeek].map(([key,count]) => ({key,count})).sort((a,b)=>a.key.localeCompare(b.key))

  /* Altersklassen */
  const classes: Array<{ label: string; min: number; max: number | null }> = [
    { label: '0–17',  min: 0,  max: 17 },
    { label: '18–29', min: 18, max: 29 },
    { label: '30–44', min: 30, max: 44 },
    { label: '45–59', min: 45, max: 59 },
    { label: '60+',   min: 60, max: null },
  ]
  const byAgeInit = classes.map(c => ({ label: c.label, count: 0 }))
  for (const r of filtered) {
    const a = r.client.age
    if (typeof a === 'number') {
      const idx = classes.findIndex(c => (a >= c.min) && (c.max == null || a <= c.max))
      if (idx >= 0) byAgeInit[idx].count++
    }
  }

  /* Geschlecht (auf Sitzungen) */
  const g = { w: 0, m: 0, d: 0 }
  for (const r of filtered) {
    if (r.client.gender === 'w') g.w++
    else if (r.client.gender === 'm') g.m++
    else if (r.client.gender === 'd') g.d++
  }

  return {
    totalSessions,
    sessionsByMethod,
    dur: numberStats(durations),
    sudDelta: numberStats(sudDeltas),
    closedCases: closed.size,
    trendMonth,
    trendWeek,
    byAgeClass: byAgeInit,
    byGender: g,
  }
}
