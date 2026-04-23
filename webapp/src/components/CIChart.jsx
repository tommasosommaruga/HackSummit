export default function CIChart({ ci }) {
  const bars = [
    { label: 'P5 Optimistic',  value: Math.round(ci.p5     * 100), color: '#22c55e' },
    { label: 'P50 Median',     value: Math.round(ci.median * 100), color: '#eab308' },
    { label: 'P95 Pessimistic',value: Math.round(ci.p95    * 100), color: '#ef4444' },
  ]
  return (
    <div className="panel">
      <h3>High-Risk Origin Probability</h3>
      <svg viewBox="0 0 280 120" style={{ width: '100%', height: 120 }}>
        {/* 50% reference line */}
        <line x1="0" y1="60" x2="280" y2="60" stroke="#374151" strokeDasharray="4 4" />
        {bars.map((b, i) => {
          const x = 30 + i * 82
          const barH = (b.value / 100) * 100
          const y = 110 - barH
          return (
            <g key={b.label}>
              <rect x={x} y={y} width={52} height={barH} rx={4} fill={b.color} fillOpacity={0.85} />
              <text x={x + 26} y={y - 5} textAnchor="middle" fill={b.color} fontSize={13} fontWeight={700}>{b.value}%</text>
              <text x={x + 26} y={115} textAnchor="middle" fill="#6b7280" fontSize={9}>{b.label}</text>
            </g>
          )
        })}
      </svg>
      <p style={{ fontSize: '0.78rem', color: 'var(--sub)', marginTop: '0.5rem' }}>
        Bootstrap CI (2000 samples, ±20% noise). Median: <strong style={{ color: 'var(--text)' }}>{bars[1].value}%</strong>
      </p>
    </div>
  )
}
