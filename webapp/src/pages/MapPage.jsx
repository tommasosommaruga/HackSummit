/**
 * MapPage — supply-chain explorer.
 *
 * Left panel: filters (node type toggles, multi-select country + deposit type,
 *             status/status_code toggles per type, resource slider for projects,
 *             search with fuzzy matching).
 * Map:        deck.gl/maplibre rendering via <SupplyChainMap>.
 * Right panel: node details + upstream/downstream list when a node is selected.
 * Legend:     bottom-right, auto-generated from nodeTypeConfig.
 */
import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import SupplyChainMap from '../components/SupplyChainMap.jsx'
import { NODE_TYPES, MATERIAL_COLORS, colorForNode, normalizeStatusCode } from '../lib/nodeTypeConfig.js'
import { loadSupplyChain, connectedNodeIds } from '../lib/loadSupplyChain.js'
import './MapPage.css'

function MultiToggle({ options, selected, onToggle, render }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
      {options.map(opt => {
        const [key, meta] = Array.isArray(opt) ? opt : [opt, {}]
        const on = selected.has(key)
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className="chip"
            style={{
              fontSize: '0.72rem',
              padding: '0.25rem 0.55rem',
              background: on ? (meta.color || 'var(--accent)') + '33' : 'var(--border)',
              border: `1px solid ${on ? (meta.color || 'var(--accent)') : 'var(--muted)'}`,
              color: on ? (meta.color || 'var(--accent)') : '#9ca3af',
              borderRadius: 99,
              cursor: 'pointer',
            }}
          >
            {render ? render(key, meta) : key}
          </button>
        )
      })}
    </div>
  )
}

export default function MapPage({ onBack }) {
  const [graph, setGraph] = useState(null)  // { nodes, edges, byId, outgoing, incoming, meta }
  const [err, setErr] = useState(null)

  useEffect(() => {
    loadSupplyChain({ patchMissing: false })  // page is responsive first; patching on demand if needed
      .then(setGraph)
      .catch(e => setErr(e.message))
  }, [])

  const [typeVisible, setTypeVisible] = useState(
    Object.fromEntries(Object.keys(NODE_TYPES).map(k => [k, true])),
  )
  const [countryFilter, setCountryFilter] = useState(new Set())
  const [depTypeFilter, setDepTypeFilter] = useState(new Set())
  const [depStatusFilter, setDepStatusFilter] = useState(new Set(Object.keys(NODE_TYPES.deposit.statuses)))
  const [projStatusFilter, setProjStatusFilter] = useState(new Set(Object.keys(NODE_TYPES.project.statuses)))
  const [refStatusFilter, setRefStatusFilter] = useState(new Set(Object.keys(NODE_TYPES.refinery.statuses)))
  const [resourceMin, setResourceMin] = useState(0)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const fuse = useMemo(() => graph ? new Fuse(graph.nodes, {
    keys: ['name', 'company', 'country'],
    threshold: 0.3,
  }) : null, [graph])

  const searchHits = useMemo(
    () => (search.trim() && fuse) ? fuse.search(search.trim()).slice(0, 8).map(r => r.item) : [],
    [search, fuse],
  )

  // Compute filtered node set + aggregate stats.
  const { visibleNodes, countryOptions, depTypeOptions, stats } = useMemo(() => {
    if (!graph) return { visibleNodes: [], countryOptions: [], depTypeOptions: [], stats: {} }
    const countryCount = new Map()
    const dtypeCount = new Map()
    const statsByType = Object.fromEntries(Object.keys(NODE_TYPES).map(k => [k, 0]))
    const visible = []
    for (const n of graph.nodes) {
      if (n.country) countryCount.set(n.country, (countryCount.get(n.country) || 0) + 1)
      if (n.deposit_type) dtypeCount.set(n.deposit_type, (dtypeCount.get(n.deposit_type) || 0) + 1)

      if (!typeVisible[n.type]) continue
      if (!n.geocoded) continue
      if (countryFilter.size && (!n.country || !countryFilter.has(n.country))) continue
      if (depTypeFilter.size && (!n.deposit_type || !depTypeFilter.has(n.deposit_type))) continue

      if (n.type === 'deposit') {
        const s = (n.status || '').replace(/\s*\(\?\)\s*$/, '')
        if (s && !depStatusFilter.has(s)) continue
      }
      if (n.type === 'project' && n.status_code != null) {
        const code = normalizeStatusCode(n.status_code)
        if (code && !projStatusFilter.has(code)) continue
      }
      if (n.type === 'refinery' && n.status_code != null) {
        const code = normalizeStatusCode(n.status_code)
        if (code && !refStatusFilter.has(code)) continue
      }
      if (n.type === 'project' && resourceMin > 0) {
        if ((n.resource_kt_reo || 0) < resourceMin) continue
      }
      visible.push(n)
      statsByType[n.type] = (statsByType[n.type] || 0) + 1
    }
    return {
      visibleNodes: visible,
      countryOptions: [...countryCount.entries()].sort((a, b) => b[1] - a[1]),
      depTypeOptions: [...dtypeCount.entries()].sort((a, b) => b[1] - a[1]),
      stats: statsByType,
    }
  }, [graph, typeVisible, countryFilter, depTypeFilter, depStatusFilter,
      projStatusFilter, refStatusFilter, resourceMin])

  const highlighted = useMemo(() => {
    if (!graph || !selected) return null
    return connectedNodeIds(selected.id, graph, 'both', 4)
  }, [graph, selected])

  // ── Render ──────────────────────────────────────────────────────────────
  if (err) return <div className="map-page"><div style={{ padding: '2rem', color: '#ef4444' }}>Error: {err}</div></div>
  if (!graph) return <div className="map-page"><div style={{ padding: '2rem', color: 'var(--sub)' }}>Loading supply chain…</div></div>

  const toggleSet = (set, key, setter) => {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    setter(next)
  }

  return (
    <div className="map-page">
      <aside className="map-sidebar" style={{ width: 320 }}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 6 }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{ background: 'none', border: 'none', color: 'var(--sub)', cursor: 'pointer', fontSize: '1rem' }}
              >←</button>
            )}
            <div className="sidebar-title">🌍 Rare-earth supply chain</div>
          </div>
          <div className="sidebar-sub">
            {graph.meta.counts.deposits.toLocaleString()} deposits · {graph.meta.counts.projects} projects
            {graph.meta.counts.refineries ? ` · ${graph.meta.counts.refineries} refineries` : ''}
            {graph.meta.counts.edges ? ` · ${graph.meta.counts.edges} edges` : ''}
          </div>
        </div>

        {/* Search */}
        <div className="control-section">
          <div className="control-label">Search</div>
          <input
            type="text"
            placeholder="project, company, deposit…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.45rem 0.6rem', borderRadius: 6,
              background: 'var(--border)', border: '1px solid var(--muted)',
              color: 'inherit', fontSize: '0.82rem',
            }}
          />
          {searchHits.length > 0 && (
            <div style={{ marginTop: 6, maxHeight: 200, overflowY: 'auto' }}>
              {searchHits.map(n => (
                <div
                  key={n.id}
                  onClick={() => { setSelected(n); setSearch('') }}
                  style={{
                    padding: '0.35rem 0.5rem', borderRadius: 5, cursor: 'pointer',
                    fontSize: '0.78rem', display: 'flex', gap: '0.4rem',
                    background: 'var(--border)', marginBottom: 3,
                  }}
                >
                  <span style={{ color: colorForNode(n) }}>{NODE_TYPES[n.type].icon}</span>
                  <span style={{ flex: 1 }}>{n.name}</span>
                  <span style={{ color: '#6b7280', fontSize: '0.68rem' }}>{n.country || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Node type toggles */}
        <div className="control-section">
          <div className="control-label">Node types</div>
          {Object.entries(NODE_TYPES).map(([key, cfg]) => (
            <label key={key} className="toggle-row">
              <div
                className={`toggle ${typeVisible[key] ? 'on' : ''}`}
                onClick={() => setTypeVisible(v => ({ ...v, [key]: !v[key] }))}
              >
                <div className="toggle-thumb" />
              </div>
              <span style={{ fontSize: '0.82rem' }}>
                <span style={{ color: cfg.color, marginRight: '0.35rem' }}>{cfg.icon}</span>
                {cfg.label}
                <span style={{ marginLeft: '0.4rem', color: '#6b7280', fontSize: '0.7rem' }}>
                  ({stats[key]?.toLocaleString() ?? 0})
                </span>
              </span>
            </label>
          ))}
        </div>

        {/* Status filters */}
        {typeVisible.deposit && (
          <div className="control-section">
            <div className="control-label">Deposit status</div>
            <MultiToggle
              options={Object.entries(NODE_TYPES.deposit.statuses)}
              selected={depStatusFilter}
              onToggle={k => toggleSet(depStatusFilter, k, setDepStatusFilter)}
              render={(k, m) => <>{m.label || k}</>}
            />
          </div>
        )}
        {typeVisible.project && (
          <div className="control-section">
            <div className="control-label">Project status</div>
            <MultiToggle
              options={Object.entries(NODE_TYPES.project.statuses)}
              selected={projStatusFilter}
              onToggle={k => toggleSet(projStatusFilter, k, setProjStatusFilter)}
              render={(k, m) => <>{k} · {m.label}</>}
            />
          </div>
        )}
        {typeVisible.refinery && graph.meta.counts.refineries > 0 && (
          <div className="control-section">
            <div className="control-label">Refinery status</div>
            <MultiToggle
              options={Object.entries(NODE_TYPES.refinery.statuses)}
              selected={refStatusFilter}
              onToggle={k => toggleSet(refStatusFilter, k, setRefStatusFilter)}
              render={(k, m) => <>{k} · {m.label}</>}
            />
          </div>
        )}

        {/* Country multi-select */}
        <div className="control-section">
          <div className="control-label">Country {countryFilter.size ? `(${countryFilter.size})` : ''}</div>
          <div style={{ maxHeight: 160, overflowY: 'auto' }}>
            {countryOptions.slice(0, 40).map(([c, n]) => (
              <label key={c} style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                fontSize: '0.76rem', padding: '0.15rem 0', cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={countryFilter.has(c)}
                  onChange={() => toggleSet(countryFilter, c, setCountryFilter)}
                />
                <span style={{ flex: 1 }}>{c}</span>
                <span style={{ color: '#6b7280' }}>{n}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Deposit-type multi-select */}
        <div className="control-section">
          <div className="control-label">Deposit type {depTypeFilter.size ? `(${depTypeFilter.size})` : ''}</div>
          <div style={{ maxHeight: 140, overflowY: 'auto' }}>
            {depTypeOptions.slice(0, 20).map(([t, n]) => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', padding: '0.12rem 0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={depTypeFilter.has(t)}
                  onChange={() => toggleSet(depTypeFilter, t, setDepTypeFilter)}
                />
                <span style={{ flex: 1 }}>{t}</span>
                <span style={{ color: '#6b7280' }}>{n}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Resource slider (projects) */}
        {typeVisible.project && (
          <div className="control-section">
            <div className="control-label">
              Min resource (projects) · {resourceMin} × 10⁴ t REO
            </div>
            <input
              type="range" min={0} max={500} step={10}
              value={resourceMin}
              onChange={e => setResourceMin(+e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>
        )}
      </aside>

      <div className="map-area" style={{ position: 'relative' }}>
        <SupplyChainMap
          nodes={visibleNodes}
          edges={graph.edges}
          byId={graph.byId}
          typeVisible={typeVisible}
          highlighted={highlighted}
          onNodeClick={setSelected}
        />

        {/* Legend */}
        <div className="map-legend" style={{ maxWidth: 260 }}>
          <div className="legend-title">Legend</div>
          {Object.entries(NODE_TYPES).map(([key, cfg]) => (
            <div key={key} className="legend-row">
              <span style={{ color: cfg.color, width: 14, textAlign: 'center' }}>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </div>
          ))}
          {graph.meta.counts.edges > 0 && (
            <>
              <div className="legend-title" style={{ marginTop: '0.5rem' }}>Material (edges)</div>
              {Object.entries(MATERIAL_COLORS).filter(([k]) => k !== 'unknown').map(([k, color]) => (
                <div key={k} className="legend-row">
                  <span style={{ width: 16, height: 3, background: color, display: 'inline-block', borderRadius: 2 }} />
                  <span>{k.replace('_', ' ')}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="detail-panel" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <button className="detail-close" onClick={() => setSelected(null)}>✕</button>
            <div className="detail-title">
              <span style={{ color: colorForNode(selected), marginRight: '0.4rem' }}>
                {NODE_TYPES[selected.type].icon}
              </span>
              {selected.name || selected.id}
            </div>
            <div className="detail-sub">
              {NODE_TYPES[selected.type].label}
              {selected.country ? ` · ${selected.country}` : ''}
              {selected.state ? `, ${selected.state}` : ''}
            </div>

            <div className="detail-grid">
              {selected.company && (
                <div className="detail-stat" style={{ gridColumn: 'span 3' }}>
                  <div className="ds-label">Company</div>
                  <div className="ds-val" style={{ fontSize: '0.85rem' }}>{selected.company}</div>
                </div>
              )}
              {selected.status_code != null && (
                <div className="detail-stat">
                  <div className="ds-label">Status</div>
                  <div className="ds-val" style={{ fontSize: '0.75rem', color: colorForNode(selected) }}>
                    {selected.status_code}
                    {NODE_TYPES[selected.type].statuses[String(selected.status_code)]
                      ? ` · ${NODE_TYPES[selected.type].statuses[String(selected.status_code)].label}`
                      : ''}
                  </div>
                </div>
              )}
              {selected.status && (
                <div className="detail-stat">
                  <div className="ds-label">Status</div>
                  <div className="ds-val" style={{ fontSize: '0.75rem' }}>{selected.status}</div>
                </div>
              )}
              {selected.deposit_type && (
                <div className="detail-stat">
                  <div className="ds-label">Type</div>
                  <div className="ds-val" style={{ fontSize: '0.72rem' }}>{selected.deposit_type}</div>
                </div>
              )}
              {selected.resource_kt_reo != null && (
                <div className="detail-stat">
                  <div className="ds-label">Resource</div>
                  <div className="ds-val" style={{ fontSize: '0.78rem' }}>
                    {selected.resource_kt_reo} ×10⁴ t REO
                  </div>
                </div>
              )}
              {selected.grade_pct != null && (
                <div className="detail-stat">
                  <div className="ds-label">Grade</div>
                  <div className="ds-val" style={{ fontSize: '0.78rem' }}>{selected.grade_pct}%</div>
                </div>
              )}
              {selected.capacity && (
                <div className="detail-stat" style={{ gridColumn: 'span 3' }}>
                  <div className="ds-label">Capacity</div>
                  <div className="ds-val" style={{ fontSize: '0.75rem' }}>{selected.capacity}</div>
                </div>
              )}
            </div>

            {selected.commodities && (
              <div style={{ marginTop: '0.6rem' }}>
                <div className="detail-label">Commodities</div>
                <div style={{ fontSize: '0.78rem', color: '#d1d5db' }}>{selected.commodities}</div>
              </div>
            )}

            {/* Upstream / downstream */}
            {graph.incoming.get(selected.id)?.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div className="detail-label">Upstream</div>
                {graph.incoming.get(selected.id).map(e => {
                  const n = graph.byId.get(e.from_id)
                  return (
                    <div key={e.id} onClick={() => setSelected(n)} style={{ cursor: 'pointer', fontSize: '0.76rem', padding: '0.25rem 0.4rem', background: 'var(--border)', borderRadius: 5, marginBottom: 3, display: 'flex', gap: '0.4rem' }}>
                      <span style={{ color: colorForNode(n) }}>{NODE_TYPES[n.type].icon}</span>
                      <span style={{ flex: 1 }}>{n.name}</span>
                      <span style={{ color: MATERIAL_COLORS[e.material] || '#9ca3af', fontSize: '0.68rem' }}>
                        {e.material}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            {graph.outgoing.get(selected.id)?.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div className="detail-label">Downstream</div>
                {graph.outgoing.get(selected.id).map(e => {
                  const n = graph.byId.get(e.to_id)
                  return (
                    <div key={e.id} onClick={() => setSelected(n)} style={{ cursor: 'pointer', fontSize: '0.76rem', padding: '0.25rem 0.4rem', background: 'var(--border)', borderRadius: 5, marginBottom: 3, display: 'flex', gap: '0.4rem' }}>
                      <span style={{ color: colorForNode(n) }}>{NODE_TYPES[n.type].icon}</span>
                      <span style={{ flex: 1 }}>{n.name}</span>
                      <span style={{ color: MATERIAL_COLORS[e.material] || '#9ca3af', fontSize: '0.68rem' }}>
                        {e.material}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {selected.ref_urls && selected.ref_urls.length > 0 && (
              <div style={{ marginTop: '0.6rem', fontSize: '0.7rem', color: '#9ca3af' }}>
                <div className="detail-label">Sources</div>
                {selected.ref_urls.map((u, i) => (
                  <div key={i} style={{ wordBreak: 'break-all', marginBottom: 3 }}>
                    <a href={u} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>{u}</a>
                  </div>
                ))}
              </div>
            )}

            {selected.precision && selected.precision !== 'exact' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.66rem', color: '#f59e0b', fontStyle: 'italic' }}>
                ⚠ Location inferred ({selected.precision}) — not USGS-precise.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
