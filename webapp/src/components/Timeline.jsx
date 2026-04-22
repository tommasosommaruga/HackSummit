const STEPS = [
  { icon: '⛏️', label: 'Extraction' },
  { icon: '🏭', label: 'Refining' },
  { icon: '🔋', label: 'Cell Mfg' },
  { icon: '📦', label: 'Assembly' },
  { icon: '🛒', label: 'Consumer' },
]

export default function Timeline({ manufactureYear, sourceYear }) {
  const years = [
    sourceYear,
    sourceYear + 1,
    manufactureYear - 1,
    manufactureYear,
    manufactureYear + 1,
  ]

  return (
    <div className="panel">
      <h3>Temporal Route (~{manufactureYear - sourceYear}-Year Lag)</h3>
      <div className="timeline">
        {STEPS.map((s, i) => (
          <>
            <div key={s.label} className="tl-step">
              <div className={`tl-dot ${i === 0 || i === STEPS.length - 1 ? 'active' : ''}`}>{s.icon}</div>
              <div className="tl-year">{years[i]}</div>
              <div className="tl-label">{s.label}</div>
            </div>
            {i < STEPS.length - 1 && <div key={`line-${i}`} className="tl-line" />}
          </>
        ))}
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--sub)', marginTop: '0.5rem' }}>
        A battery manufactured in <strong style={{ color: 'var(--text)' }}>{manufactureYear}</strong> contains
        ore extracted around <strong style={{ color: 'var(--text)' }}>{sourceYear}</strong>.
        ESG reports from {manufactureYear} do <em>not</em> describe the ore in this battery.
      </p>
    </div>
  )
}
