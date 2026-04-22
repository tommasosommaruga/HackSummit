export default function ScoreRing({ score }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 72 ? '#22c55e' : score >= 45 ? '#eab308' : '#ef4444'

  return (
    <div className="score-ring">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="ring-text">
        <span className="num" style={{ color }}>{score}</span>
        <span className="label">/ 100</span>
      </div>
    </div>
  )
}
