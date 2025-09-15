type Props = {
  lettersWithHits: Set<string>  // z.B. neue Set(['A','B','F'])
  onJump: (letter: string) => void
}

export default function AZIndex({ lettersWithHits, onJump }: Props) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  function handle(letter: string) {
    if (lettersWithHits.has(letter)) return onJump(letter)
    // suche nächste mit Hits, sonst zurück
    const idx = letters.indexOf(letter)
    for (let i = idx + 1; i < letters.length; i++) if (lettersWithHits.has(letters[i])) return onJump(letters[i])
    for (let j = idx - 1; j >= 0; j--) if (lettersWithHits.has(letters[j])) return onJump(letters[j])
    onJump(letter) // zur Not einfach filtern
  }
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6, userSelect:'none' }} aria-label="Alphabetische Navigation">
      {letters.map(l => (
        <button
          key={l}
          type="button"
          onClick={() => handle(l)}
          className="btn"
          style={{ padding:'4px 8px', opacity: lettersWithHits.has(l) ? 1 : .4 }}
          aria-disabled={!lettersWithHits.has(l)}
        >{l}</button>
      ))}
    </div>
  )
}
