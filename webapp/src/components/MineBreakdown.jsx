function riskColor(r) {
  if (r >= 0.6) return '#ef4444'
  if (r >= 0.3) return '#eab308'
  return '#22c55e'
}

export default function MineBreakdown({ mines }) {
  return (
    <div className="panel">
      <h3>Supply Chain Breakdown</h3>
      {mines.map(m => (
        <div key={m.id} className="mine-row">
          <div className="mine-dot" style={{ background: riskColor(m.risk) }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mine-name">{m.flag} {m.name}</div>
            <div className="mine-country">{m.country} · risk {Math.round(m.risk * 100)}%</div>
          </div>
          <div className="mine-bar-wrap">
            <div
              className="mine-bar"
              style={{ width: `${Math.round(m.share * 100)}%`, background: riskColor(m.risk) }}
            />
          </div>
          <div className="mine-pct">{Math.round(m.share * 100)}%</div>
        </div>
      ))}
    </div>
  )
}
