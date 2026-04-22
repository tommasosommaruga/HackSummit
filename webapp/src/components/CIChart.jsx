import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function CIChart({ ci, pHighRisk }) {
  const data = [
    { name: 'Optimistic (P5)', value: Math.round(ci.p5 * 100) },
    { name: 'Median', value: Math.round(ci.median * 100) },
    { name: 'Pessimistic (P95)', value: Math.round(ci.p95 * 100) },
  ]

  const colors = ['#22c55e', '#eab308', '#ef4444']

  return (
    <div className="panel">
      <h3>High-Risk Origin Probability</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} domain={[0, 100]} unit="%" axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 13 }}
            formatter={v => [`${v}%`, 'P(high-risk)']}
          />
          <ReferenceLine y={50} stroke="#374151" strokeDasharray="4 4" />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={colors[i]} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={{ fontSize: '0.78rem', color: 'var(--sub)', marginTop: '0.75rem' }}>
        Bootstrap CI (2000 samples, ±20% output noise). Central estimate: <strong style={{ color: 'var(--text)' }}>{Math.round(ci.median * 100)}%</strong>.
      </p>
    </div>
  )
}
