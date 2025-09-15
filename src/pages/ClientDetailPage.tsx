type Props = { clientName: string; onOpenSessions: () => void }

export default function ClientDetailPage({ clientName, onOpenSessions }: Props) {
  return (
    <section className="card" aria-labelledby="client-notebook">
      <h2 id="client-notebook" style={{marginTop:0}}>{clientName}</h2>
      {/* … Sektionen Anliegen / Sonstiges (später) … */}
      <div className="actions" style={{marginTop:10}}>
        <button className="btn btnPrimary" onClick={onOpenSessions}>Zu den Sitzungen</button>
      </div>
    </section>
  )
}
