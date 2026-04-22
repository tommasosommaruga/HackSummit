import { useState, useCallback } from 'react'
import SupplyMap from '../components/SupplyMap.jsx'
import { MINES, LAUNDERING_HUBS } from '../data/mines.js'
import './MapPage.css'

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024]

function riskColor(r) {
  if (r >= 0.6) return '#ef4444'
  if (r >= 0.3) return '#eab308'
  return '#22c55e'
}

export default function MapPage({ onBack }) {
  const [year, setYear] = useState(2022)
  const [filters, setFilters] = useState({
    mines: true,
    refineries: true,
    hubs: true,
    flows: true,
    riskFlows: false,  // show only high-risk flows
    riskMin: 0,
  })
  const [selected, setSelected] = useState(null)

  const toggle = (key) => setFilters(f => ({ ...f, [key]: !f[key] }))

  const handleNodeClick = useCallback((node) => {
    setSelected(node)
  }, [])

  const totalHighRisk = MINES
    .filter(m => m.risk >= 0.6)
    .reduce((s, m) => s + (m.output[year] || 0), 0)

  const totalOutput = MINES.reduce((s, m) => s + (m.output[year] || 0), 0)

  const totalSurplus = LAUNDERING_HUBS
    .reduce((s, h) => s + (h.surplus_kt[year] || 0), 0)

  return (
    <div className="map-page">
      {/* Left sidebar */}
      <aside className="map-sidebar">
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{ background: 'none', border: 'none', color: 'var(--sub)', cursor: 'pointer', fontSize: '1rem', padding: 0, lineHeight: 1 }}
                title="Back"
              >←</button>
            )}
            <div className="sidebar-title">🌍 Supply Chain Map</div>
          </div>
          <div className="sidebar-sub">Lithium Truth · {year}</div>
        </div>

        {/* Year slider */}
        <div className="control-section">
          <label className="control-label">Year: <strong>{year}</strong></label>
          <input
            type="range"
            min={2019} max={2024} step={1}
            value={year}
            onChange={e => setYear(+e.target.value)}
            className="year-slider"
          />
          <div className="year-ticks">
            {YEARS.map(y => <span key={y} style={{ opacity: y === year ? 1 : 0.4 }}>{y}</span>)}
          </div>
        </div>

        {/* Layer toggles */}
        <div className="control-section">
          <div className="control-label">Layers</div>
          {[
            { key: 'mines',      label: '⛏️  Mines',           color: '#ef4444' },
            { key: 'refineries', label: '🏭  Refineries',      color: '#8b5cf6' },
            { key: 'hubs',       label: '⚠️  Laundering Hubs', color: '#f97316' },
            { key: 'flows',      label: '↗  Trade Flows',      color: '#3b82f6' },
          ].map(({ key, label, color }) => (
            <label key={key} className="toggle-row">
              <div className={`toggle ${filters[key] ? 'on' : ''}`} onClick={() => toggle(key)}>
                <div className="toggle-thumb" />
              </div>
              <span>{label}</span>
              <div className="layer-dot" style={{ background: color }} />
            </label>
          ))}
        </div>

        {/* Risk filter */}
        <div className="control-section">
          <label className="control-label">
            Min Risk Shown: <strong style={{ color: riskColor(filters.riskMin) }}>{Math.round(filters.riskMin * 100)}%</strong>
          </label>
          <input
            type="range" min={0} max={0.9} step={0.05}
            value={filters.riskMin}
            onChange={e => setFilters(f => ({ ...f, riskMin: +e.target.value }))}
            className="year-slider"
          />
          <label className="toggle-row" style={{ marginTop: '0.75rem' }}>
            <div className={`toggle ${filters.riskFlows ? 'on' : ''}`} onClick={() => toggle('riskFlows')}>
              <div className="toggle-thumb" />
            </div>
            <span style={{ fontSize: '0.82rem' }}>High-risk flows only</span>
          </label>
        </div>

        {/* Stats */}
        <div className="control-section stats-section">
          <div className="control-label">Global Stats · {year}</div>
          <div className="stat-row">
            <span>Total Output</span>
            <strong>{(totalOutput / 1000).toFixed(0)} kt</strong>
          </div>
          <div className="stat-row">
            <span>High-Risk Share</span>
            <strong style={{ color: '#ef4444' }}>{Math.round(totalHighRisk / totalOutput * 100)}%</strong>
          </div>
          <div className="stat-row">
            <span>Laundered Surplus</span>
            <strong style={{ color: '#f97316' }}>{totalSurplus} kt</strong>
          </div>
        </div>

        {/* Mine list */}
        <div className="control-section" style={{ flex: 1, overflowY: 'auto' }}>
          <div className="control-label">Mines</div>
          {MINES
            .filter(m => m.risk >= filters.riskMin)
            .sort((a, b) => b.risk - a.risk)
            .map(m => (
              <div
                key={m.id}
                className={`mine-list-item ${selected?.data?.id === m.id ? 'active' : ''}`}
                onClick={() => setSelected({ type: 'mine', data: m })}
              >
                <div className="mine-list-dot" style={{ background: riskColor(m.risk) }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{m.flag} {m.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                    {((m.output[year] || 0) / 1000).toFixed(1)} kt · risk {Math.round(m.risk * 100)}%
                  </div>
                </div>
              </div>
            ))}
        </div>
      </aside>

      {/* Map */}
      <div className="map-area">
        <SupplyMap
          filters={filters}
          selectedYear={year}
          onNodeClick={handleNodeClick}
        />

        {/* Legend overlay */}
        <div className="map-legend">
          <div className="legend-title">Legend</div>
          {[
            { color: '#ef4444', label: 'High Risk Mine (≥60%)' },
            { color: '#eab308', label: 'Medium Risk (30–60%)' },
            { color: '#22c55e', label: 'Low Risk (<30%)' },
            { color: '#8b5cf6', label: 'Refinery ◼' },
            { color: '#f97316', label: 'Laundering Hub ●' },
          ].map(({ color, label }) => (
            <div key={label} className="legend-row">
              <div className="legend-dot" style={{ background: color }} />
              <span>{label}</span>
            </div>
          ))}
          <div className="legend-row" style={{ marginTop: '0.5rem' }}>
            <div style={{ width: 20, height: 2, background: '#ef4444', borderTop: '2px dashed #ef4444' }} />
            <span>High-risk flow</span>
          </div>
          <div className="legend-row">
            <div style={{ width: 20, height: 2, background: '#22c55e' }} />
            <span>Low-risk flow</span>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="detail-panel">
            <button className="detail-close" onClick={() => setSelected(null)}>✕</button>
            {selected.type === 'mine' && (
              <>
                <div className="detail-title">{selected.data.flag} {selected.data.name}</div>
                <div className="detail-sub">{selected.data.country} · {selected.data.type}</div>
                <div className="detail-grid">
                  <div className="detail-stat">
                    <div className="ds-label">Risk Level</div>
                    <div className="ds-val" style={{ color: riskColor(selected.data.risk) }}>
                      {Math.round(selected.data.risk * 100)}%
                    </div>
                  </div>
                  <div className="detail-stat">
                    <div className="ds-label">Output {year}</div>
                    <div className="ds-val">{((selected.data.output[year] || 0) / 1000).toFixed(1)} kt</div>
                  </div>
                  <div className="detail-stat">
                    <div className="ds-label">Certified</div>
                    <div className="ds-val" style={{ color: selected.data.certified ? '#22c55e' : '#ef4444' }}>
                      {selected.data.certified ? '✓ Yes' : '✗ No'}
                    </div>
                  </div>
                </div>
                <p className="detail-notes">{selected.data.notes}</p>
                {/* Output sparkline */}
                <div className="detail-label" style={{ marginBottom: '0.4rem' }}>Output trend (kt)</div>
                <div className="spark-bars">
                  {YEARS.map(y => {
                    const val = (selected.data.output[y] || 0) / 1000
                    const max = Math.max(...YEARS.map(yr => (selected.data.output[yr] || 0) / 1000))
                    return (
                      <div key={y} className="spark-col">
                        <div
                          className="spark-bar"
                          style={{
                            height: `${Math.round((val / max) * 48)}px`,
                            background: y === year ? riskColor(selected.data.risk) : '#374151',
                          }}
                        />
                        <div className="spark-label">{y.toString().slice(2)}</div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
