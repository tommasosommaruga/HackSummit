const ICONS = { high: '🚨', medium: '⚠️', low: '✅' }

export default function FlagList({ flags }) {
  return (
    <div className="panel">
      <h3>Risk Flags</h3>
      <div className="flag-list">
        {flags.map((f, i) => (
          <div key={i} className={`flag-item ${f.level}`}>
            <span className="flag-icon">{ICONS[f.level]}</span>
            <div>
              <b>{f.text}</b>
              {f.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
