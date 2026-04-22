import { useState, useCallback } from 'react'
import SupplyMap from '../components/SupplyMap.jsx'
import { MINES, LAUNDERING_HUBS, ELEMENTS } from '../data/mines.js'
import './MapPage.css'

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024]
const ALL_ELEMENTS = Object.keys(ELEMENTS)

function riskColor(r) {
  if (r >= 0.6) return '#ef4444'
  if (r >= 0.3) return '#eab308'
  return '#22c55e'
}

export default function MapPage({ onBack }) {
  const [year, setYear] = useState(2022)
  const [activeElement, setActiveElement] = useState('Li')
  const [filters, setFilters] = useState({
    mines: true,
    refineries: true,
    hubs: true,
    flows: true,
    riskFlows: false,
    riskMin: 0,
  })
  const [showTransport, setShowTransport] = useState(false)
  const [transportRisk, setTransportRisk] = useState('all')
  const [selected, setSelected] = useState(null)

  const toggle = (key) => setFilters(f => ({ ...f, [key]: !f[key] }))
  const handleNodeClick = useCallback((node) => setSelected(node), [])

  // Filter mines to those that produce the active element
  const visibleMines = MINES.filter(m =>
    m.elements.includes(activeElement) && m.risk >= filters.riskMin
  )

  const totalOutput = visibleMines.reduce((s, m) => s + (m.output[activeElement]?.[year] || 0), 0)
  const totalHighRisk = visibleMines
    .filter(m => m.risk >= 0.6)
    .reduce((s, m) => s + (m.output[activeElement]?.[year] || 0), 0)
  const totalSurplus = LAUNDERING_HUBS
    .filter(h => h.elements.includes(activeElement))
    .reduce((s, h) => s + (h.surplus_kt[year] || 0), 0)

  const elMeta = ELEMENTS[activeElement]

  return (
    <div className="map-page">
      <aside className="map-sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{ background: 'none', border: 'none', color: 'var(--sub)', cursor: 'pointer', fontSize: '1rem', padding: 0, lineHeight: 1 }}
              >←</button>
            )}
            <div className="sidebar-title">🌍 Supply Chain Map</div>
          </div>
          <div className="sidebar-sub">Lithium Truth · {year}</div>
        </div>

        {/* Element filter */}
        <div className="control-section">
          <div className="control-label">Element</div>
          <div className="element-grid">
            {ALL_ELEMENTS.map(el => (
              <button
                key={el}
                className={`el-chip ${activeElement === el ? 'active' : ''}`}
                style={{ '--el-color': ELEMENTS[el].color }}
                onClick={() => { setActiveElement(el); setSelected(null) }}
              >
                <span className="el-sym">{el}</span>
                <span className="el-name">{ELEMENTS[el].label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Year slider */}
        <div className="control-section">
          <label className="control-label">Year: <strong>{year}</strong></label>
          <input
            type="range" min={2019} max={2024} step={1}
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

        {/* Transport routes */}
        <div className="control-section">
          <div className="control-label">Transport Routes</div>
          <label className="toggle-row">
            <div className={`toggle ${showTransport ? 'on' : ''}`} onClick={() => setShowTransport(t => !t)}>
              <div className="toggle-thumb" />
            </div>
            <span style={{ fontSize: '0.82rem' }}>🚢 Show corridors</span>
          </label>
          {showTransport && (
            <div style={{ marginTop: '0.5rem' }}>
              <div className="control-label" style={{ marginBottom: '0.4rem' }}>Filter corridors</div>
              {[['all','All routes'],['high','High risk only'],['medium','Med + High']].map(([k,l]) => (
                <label key={k} className="toggle-row" style={{ marginBottom: '0.3rem' }}>
                  <input type="radio" name="transportRisk" value={k} checked={transportRisk === k}
                    onChange={() => setTransportRisk(k)}
                    style={{ accentColor: 'var(--accent)', marginRight: '0.25rem' }} />
                  <span style={{ fontSize: '0.8rem' }}>{l}</span>
                </label>
              ))}
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.4 }}>
                🔵 Sea &nbsp;🟣 Rail &nbsp;🟠 Road<br/>
                Dashed = high laundering risk
              </div>
            </div>
          )}
        </div>

        {/* Risk filter */}
        <div className="control-section">
          <label className="control-label">
            Min Risk: <strong style={{ color: riskColor(filters.riskMin) }}>{Math.round(filters.riskMin * 100)}%</strong>
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
          <div className="control-label" style={{ color: elMeta.color }}>
            {elMeta.label} · {year}
          </div>
          <div className="stat-row">
            <span>Total Output</span>
            <strong>{totalOutput.toFixed(0)} {elMeta.unit}</strong>
          </div>
          <div className="stat-row">
            <span>High-Risk Share</span>
            <strong style={{ color: '#ef4444' }}>
              {totalOutput > 0 ? Math.round(totalHighRisk / totalOutput * 100) : 0}%
            </strong>
          </div>
          <div className="stat-row">
            <span>Laundered Surplus</span>
            <strong style={{ color: '#f97316' }}>{totalSurplus} kt</strong>
          </div>
          <div className="stat-row">
            <span>Mines shown</span>
            <strong>{visibleMines.length}</strong>
          </div>
        </div>

        {/* Mine list */}
        <div className="control-section" style={{ flex: 1, overflowY: 'auto', borderBottom: 'none' }}>
          <div className="control-label">
            {elMeta.label} Mines
            <span style={{ marginLeft: '0.5rem', color: elMeta.color, fontWeight: 600 }}>
              · {visibleMines.length}
            </span>
          </div>
          {visibleMines
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
                    {(m.output[activeElement]?.[year] || 0).toFixed(0)} {elMeta.unit}
                    · risk {Math.round(m.risk * 100)}%
                    {m.elements.length > 1 && (
                      <span style={{ marginLeft: '0.3rem', color: '#6b7280' }}>
                        [{m.elements.join('+')}]
                      </span>
                    )}
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
          activeElement={activeElement}
          onNodeClick={handleNodeClick}
          showTransport={showTransport}
          transportRiskFilter={transportRisk}
        />

        {/* Element badge overlay */}
        <div className="element-badge" style={{ background: elMeta.color + '22', borderColor: elMeta.color }}>
          <span style={{ color: elMeta.color, fontWeight: 700, fontSize: '1.1rem' }}>{activeElement}</span>
          <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{elMeta.label}</span>
          <span style={{ color: '#6b7280', fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>
            HS {ELEMENTS[activeElement].hs[0]}
          </span>
        </div>

        {/* Legend */}
        <div className="map-legend">
          <div className="legend-title">Legend</div>
          {[
            { color: '#ef4444', label: 'High Risk (≥60%)' },
            { color: '#eab308', label: 'Medium (30–60%)' },
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
            <div style={{ width: 20, height: 0, borderTop: '2px dashed #ef4444' }} />
            <span>High-risk flow</span>
          </div>
          <div className="legend-row">
            <div style={{ width: 20, height: 0, borderTop: '2px solid #22c55e' }} />
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

                {/* Element tags */}
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {selected.data.elements.map(el => (
                    <span
                      key={el}
                      style={{
                        fontSize: '0.72rem', padding: '0.15rem 0.5rem',
                        borderRadius: '99px', fontWeight: 700,
                        background: ELEMENTS[el].color + '22',
                        color: ELEMENTS[el].color,
                        border: `1px solid ${ELEMENTS[el].color}44`,
                      }}
                    >{el}</span>
                  ))}
                </div>

                <div className="detail-grid">
                  <div className="detail-stat">
                    <div className="ds-label">Risk</div>
                    <div className="ds-val" style={{ color: riskColor(selected.data.risk) }}>
                      {Math.round(selected.data.risk * 100)}%
                    </div>
                  </div>
                  <div className="detail-stat">
                    <div className="ds-label">{activeElement} · {year}</div>
                    <div className="ds-val" style={{ fontSize: '0.85rem' }}>
                      {(selected.data.output[activeElement]?.[year] || 0).toFixed(0)} {elMeta.unit}
                    </div>
                  </div>
                  <div className="detail-stat">
                    <div className="ds-label">Certified</div>
                    <div className="ds-val" style={{ color: selected.data.certified ? '#22c55e' : '#ef4444' }}>
                      {selected.data.certified ? '✓ Yes' : '✗ No'}
                    </div>
                  </div>
                </div>

                <p className="detail-notes">{selected.data.notes}</p>

                {/* Sparkline — per element */}
                {selected.data.output[activeElement] && (
                  <>
                    <div className="detail-label" style={{ marginBottom: '0.4rem' }}>
                      {activeElement} output trend
                    </div>
                    <div className="spark-bars">
                      {YEARS.map(y => {
                        const val = selected.data.output[activeElement]?.[y] || 0
                        const max = Math.max(...YEARS.map(yr => selected.data.output[activeElement]?.[yr] || 0))
                        return (
                          <div key={y} className="spark-col">
                            <div
                              className="spark-bar"
                              style={{
                                height: `${max > 0 ? Math.round((val / max) * 48) : 0}px`,
                                background: y === year ? elMeta.color : '#374151',
                              }}
                            />
                            <div className="spark-label">{y.toString().slice(2)}</div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* All elements at this mine */}
                {selected.data.elements.length > 1 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div className="detail-label" style={{ marginBottom: '0.3rem' }}>All elements mined here</div>
                    {selected.data.elements.map(el => (
                      <div key={el} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.2rem 0' }}>
                        <span style={{ color: ELEMENTS[el].color }}>{ELEMENTS[el].label}</span>
                        <span style={{ color: '#9ca3af', fontFamily: 'var(--mono)' }}>
                          {(selected.data.output[el]?.[year] || 0).toFixed(0)} {ELEMENTS[el].unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
