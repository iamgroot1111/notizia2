import { useState } from 'react'

type SubTab = 'builder' | 'export'

export default function ReportPage() {
  const [sub, setSub] = useState<SubTab>('builder')

  return (
    <section className="card">
      <div className="actions" style={{justifyContent:'flex-start', marginBottom:10}}>
        <button className={`btn ${sub==='builder'?'btnPrimary':''}`} onClick={()=>setSub('builder')}>Abfrage</button>
        <button className={`btn ${sub==='export'?'btnPrimary':''}`} onClick={()=>setSub('export')}>Export</button>
      </div>

      {sub === 'builder' ? <QueryBuilder/> : <ExportPanel/>}
    </section>
  )
}

function QueryBuilder(){
  return (
    <>
      <h2 style={{marginTop:0}}>Abfrage erstellen</h2>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div>
          <label>Geschlecht<br/>
            <select className="input">
              <option value="">alle</option>
              <option value="f">weiblich</option>
              <option value="m">männlich</option>
              <option value="d">divers</option>
            </select>
          </label>
        </div>
        <div>
          <label>Methode<br/>
            <select className="input">
              <option value="">alle</option>
              <option>aufloesende_hypnose</option>
              <option>klassische_hypnose</option>
              <option>coaching</option>
            </select>
          </label>
        </div>
        <div>
          <label>Alter (ab)<br/><input className="input" type="number" min={0} placeholder="z. B. 18" /></label>
        </div>
        <div>
          <label>Alter (bis)<br/><input className="input" type="number" min={0} placeholder="z. B. 80" /></label>
        </div>
        <div>
          <label>Anzahl Sitzungen (≥)<br/><input className="input" type="number" min={0} /></label>
        </div>
        <div>
          <label>Anliegen/Problem<br/>
            <select className="input">
              <option value="">alle</option>
              <option>Übergewicht</option><option>Soziale Angst</option>
              <option>Panik</option><option>Depression</option>
              <option>Schlafproblem</option><option>Schmerzen</option>
              <option>Selbstwert</option><option>Beziehungen</option>
              <option>Anderes</option>
            </select>
          </label>
        </div>
      </div>

      <div className="actions" style={{marginTop:12}}>
        <button className="btn btnPrimary">Abfrage ausführen</button>
        <button className="btn">Abfrage speichern</button>
        <button className="btn">Drucken</button>
        <button className="btn">Grafik anzeigen</button>
      </div>
    </>
  )
}

function ExportPanel(){
  return (
    <>
      <h2 style={{marginTop:0}}>Export</h2>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div className="card">
          <h3>Optionen</h3>
          <label><input type="checkbox"/> Anonymisiert</label><br/>
          <label><input type="checkbox"/> Nur gelöste Anliegen</label><br/>
          <label><input type="checkbox"/> Sitzungen beilegen</label>
          <div className="actions" style={{marginTop:8}}>
            <button className="btn btnPrimary">CSV exportieren</button>
            <button className="btn">JSON exportieren</button>
            <button className="btn">Grafik versenden</button>
          </div>
        </div>
        <div className="card">
          <h3>Vorschau</h3>
          <div className="hint">Platzhalter für Preview/Diagramm</div>
        </div>
      </div>
    </>
  )
}
