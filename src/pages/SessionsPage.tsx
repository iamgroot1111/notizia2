import { useEffect, useMemo, useState } from 'react'
import { storage } from '../shared/storage'
import type { Method, Gender } from '../shared/domain'

const METHOD_LABELS: Record<Method, string> = {
  aufloesende_hypnose: 'Auflösende Hypnose',
  klassische_hypnose:  'Klassische Hypnose',
  coaching:            'Coaching',
  other:               'Sonstige',
}

type Row = {
  session: {
    id: number
    case_id: number
    started_at: string
    duration_min: number | null
    method: Method
    ease_hypnosis: number | null
    sud_before: number | null
    sud_after: number | null
    emotional_release: string | null
    insights: string | null
    notes: string | null
  }
  case: {
    id: number
    client_id: number
    problem_category: string
    problem_text: string
    started_at: string
    status: string
    severity?: number | null
  }
  client: {
    id: number
    name: string
    gender?: Gender | null
    age?: number | null
  }
}

export default function SessionsPage({ onGoToClient }: { onGoToClient?: (id:number)=>void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')                       // Volltext
  const [m, setM] = useState<Method | ''>('')          // Methode
  const [genders, setGenders] = useState<Set<Gender>>(new Set()) // w/m/d
  const [ageMin, setAgeMin] = useState<number | ''>('')          // Alter von
  const [ageMax, setAgeMax] = useState<number | ''>('')          // Alter bis

  useEffect(() => {
    storage.listAllSessionsExpanded().then(setRows)
  }, [])

  // ---- Filterlogik ----
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()

    return rows.filter(r => {
      // Volltext: Name, Anliegen-Text, Methode (label)
      const matchQ = query
        ? (
            r.client.name.toLowerCase().includes(query) ||
            r.case.problem_text.toLowerCase().includes(query) ||
            METHOD_LABELS[r.session.method].toLowerCase().includes(query)
          )
        : true

      const matchM = m ? r.session.method === m : true

      const matchG = genders.size
        ? (r.client.gender ? genders.has(r.client.gender) : false)
        : true

      const a = r.client.age ?? null
      const matchAgeMin = ageMin === '' ? true : (a !== null && a >= Number(ageMin))
      const matchAgeMax = ageMax === '' ? true : (a !== null && a <= Number(ageMax))
      const matchAge = matchAgeMin && matchAgeMax

      return matchQ && matchM && matchG && matchAge
    })
  }, [rows, q, m, genders, ageMin, ageMax])

  // ---- UI-Handler ----
  function toggleGender(g: Gender) {
    setGenders(prev => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g); else next.add(g)
      return next
    })
  }

  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>Sitzungen</h2>

      {/* Filterzeile 1: Volltext + Methode */}
      <div className="row" style={{ alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ flex: 1, minWidth: 220, display:'grid', gap:4 }}>
          Suche (Volltext)
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, Anliegen oder Methode"
          />
        </label>

        <label style={{ minWidth: 200, display:'grid', gap:4 }}>
          Methode
          <select
            className="input"
            value={m}
            onChange={(e) => setM(e.target.value as Method | '')}
          >
            <option value="">alle</option>
            {Object.keys(METHOD_LABELS).map(k => (
              <option key={k} value={k}>
                {METHOD_LABELS[k as Method]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Filterzeile 2: Geschlecht + Alter */}
      <div className="row" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
        <div className="actions" style={{ gap: 12 }}>
          <span>Geschlecht:</span>
          <label>
            <input
              type="checkbox"
              checked={genders.has('w')}
              onChange={() => toggleGender('w')}
            />{' '}
            w
          </label>
          <label>
            <input
              type="checkbox"
              checked={genders.has('m')}
              onChange={() => toggleGender('m')}
            />{' '}
            m
          </label>
          <label>
            <input
              type="checkbox"
              checked={genders.has('d')}
              onChange={() => toggleGender('d')}
            />{' '}
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
              onChange={(e) => setAgeMin(e.target.value === '' ? '' : Number(e.target.value))}
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
              onChange={(e) => setAgeMax(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      {/* Ergebnis-Info */}
      <div role="status" aria-live="polite" className="hint" style={{ marginTop: 8 }}>
        {filtered.length} Sitzung{filtered.length === 1 ? '' : 'en'}
      </div>

      {/* Ergebnisliste */}
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8, marginTop: 8 }}>
        {filtered.map((r) => (
          <li key={r.session.id} className="cardSection" style={{ padding: 10 }}>
            <div className="row" style={{ alignItems: 'baseline' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>
                  <strong>{new Date(r.session.started_at).toLocaleString()}</strong>
                  {' · '}
                  {METHOD_LABELS[r.session.method]}
                </div>
                <div className="hint">
                  {r.client.name}
                  {' — '}
                  {r.case.problem_text}
                  {' (SUD: '}
                  {r.session.sud_before ?? '–'}
                  {' → '}
                  {r.session.sud_after ?? '–'}
                  {')'}
                  {typeof r.client.age === 'number' ? ` · Alter: ${r.client.age}` : ''}
                  {r.client.gender ? ` · Geschlecht: ${r.client.gender}` : ''}
                </div>
              </div>

              {/* Aktionen – später: "Zum Klienten" o. Navigieren */}
              <div className="actions">
                <button className="btn" onClick={() => onGoToClient?.(r.client.id)}>Zum Klienten</button>
              </div>
            </div>
          </li>
        ))}
        {filtered.length === 0 && <li className="hint">Keine Sitzungen gefunden.</li>}
      </ul>
    </section>
  )
}
