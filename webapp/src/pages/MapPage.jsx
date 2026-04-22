/**
 * MapPage — premium-dark supply-chain explorer.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ header · title      [Active · Non-prod · All]      [Map] [Table]    │
 *   │ breadcrumb chips (active filters)                                   │
 *   ├────────────┬────────────────────────────────────────────────────────┤
 *   │ accordion  │  map  /  table                                          │
 *   │ filters    │                                                         │
 *   └────────────┴────────────────────────────────────────────────────────┘
 */
import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import SupplyChainMap from '../components/SupplyChainMap.jsx'
import DataTable from '../components/DataTable.jsx'
import { NODE_TYPES, MATERIAL_COLORS, colorForNode, normalizeStatusCode } from '../lib/nodeTypeConfig.js'
import { loadSupplyChain, connectedNodeIds } from '../lib/loadSupplyChain.js'
import './MapPage.css'

/* ── helpers ─────────────────────────────────────────────────────────────── */

// Active-Production semantics across node types.
function isActive(n) {
  if (n.type === 'deposit') {
    // USGS P_Status values: 'Producer' / 'Byproduct producer' (+ '(?)' uncertainty)
    // count as active. 'Past producer' / 'Past byproduct producer' do NOT.
    // 'No production' / 'Not known' are inactive.
    const p = (n.pstatus || '').toLowerCase()
    return p.includes('producer') && !p.includes('past') && !p.includes('no ')
  }
  const code = normalizeStatusCode(n.status_code)
  if (n.type === 'project')  return code === '4'
  if (n.type === 'refinery') return code === '4' || code === '5' || code === '3'
  if (n.type === 'oem')      return code === '5' || code === '4'
  return false
}

// Collapsible filter section — no heavy borders, subtle hover.
function Accordion({ title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="acc">
      <button className="acc-head" onClick={() => setOpen(o => !o)}>
        <span className="acc-chev" style={{ transform: open ? 'rotate(90deg)' : '' }}>▸</span>
        <span className="acc-title">{title}</span>
        {count != null && <span className="acc-count">{count}</span>}
      </button>
      {open && <div className="acc-body">{children}</div>}
    </div>
  )
}

function ChipToggle({ active, onClick, color, children }) {
  return (
    <button
      className={`chip-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      style={active && color ? { '--chip-accent': color } : undefined}
    >
      {children}
    </button>
  )
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default function MapPage({ onBack }) {
  const [graph, setGraph] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => {
    loadSupplyChain({ patchMissing: false }).then(setGraph).catch(e => setErr(e.message))
  }, [])

  // ── global filter (top bar) ────────────────────────────────────────────
  const [assetStatus, setAssetStatus] = useState('active') // 'active' | 'nonprod' | 'all'
  const [view, setView] = useState('map')                  // 'map' | 'table'

  // ── node-type visibility ───────────────────────────────────────────────
  const [typeVisible, setTypeVisible] = useState(
    Object.fromEntries(Object.keys(NODE_TYPES).map(k => [k, true])),
  )

  // ── deep-data local filters ────────────────────────────────────────────
  const [countryFilter,  setCountryFilter]  = useState(new Set())
  const [depTypeFilter,  setDepTypeFilter]  = useState(new Set())
  const [depStatusFilter, setDepStatusFilter] = useState(new Set(Object.keys(NODE_TYPES.deposit.statuses)))
  const [projStatusFilter, setProjStatusFilter] = useState(new Set(['4']))
  const [refStatusFilter, setRefStatusFilter] = useState(new Set(['3', '4', '5']))
  const [resourceMin, setResourceMin] = useState(0)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const fuse = useMemo(
    () => graph ? new Fuse(graph.nodes, { keys: ['name', 'company', 'country'], threshold: 0.3 }) : null,
    [graph],
  )
  const searchHits = useMemo(
    () => (search.trim() && fuse) ? fuse.search(search.trim()).slice(0, 8).map(r => r.item) : [],
    [search, fuse],
  )

  // ── compute filtered node set + aggregate options ──────────────────────
  const { visibleNodes, countryOptions, depTypeOptions, stats } = useMemo(() => {
    if (!graph) return { visibleNodes: [], countryOptions: [], depTypeOptions: [], stats: {} }
    const countryCount = new Map()
    const dtypeCount   = new Map()
    const statsByType  = Object.fromEntries(Object.keys(NODE_TYPES).map(k => [k, 0]))
    const visible      = []

    for (const n of graph.nodes) {
      if (n.country)      countryCount.set(n.country, (countryCount.get(n.country) || 0) + 1)
      if (n.deposit_type) dtypeCount.set(n.deposit_type, (dtypeCount.get(n.deposit_type) || 0) + 1)

      // Global asset-status gate.
      const active = isActive(n)
      if (assetStatus === 'active'  && !active) continue
      if (assetStatus === 'nonprod' &&  active) continue

      if (!typeVisible[n.type]) continue
      if (!n.geocoded && view === 'map') continue

      if (countryFilter.size && (!n.country || !countryFilter.has(n.country))) continue
      if (depTypeFilter.size && (!n.deposit_type || !depTypeFilter.has(n.deposit_type))) continue

      if (n.type === 'deposit') {
        const s = (n.status || '').replace(/\s*\(\?\)\s*$/, '')
        if (s && !depStatusFilter.has(s)) continue
      }
      if (n.type === 'project') {
        const code = normalizeStatusCode(n.status_code)
        if (code && !projStatusFilter.has(code)) continue
      }
      if (n.type === 'refinery') {
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
  }, [graph, assetStatus, typeVisible, countryFilter, depTypeFilter,
      depStatusFilter, projStatusFilter, refStatusFilter, resourceMin, view])

  const highlighted = useMemo(() => {
    if (!graph || !selected) return null
    return connectedNodeIds(selected.id, graph, 'both', 4)
  }, [graph, selected])

  // ── breadcrumb: active filter chips ────────────────────────────────────
  const activeChips = useMemo(() => {
    const chips = []
    if (assetStatus !== 'all') {
      chips.push({
        key: 'asset',
        label: assetStatus === 'active' ? 'Active production' : 'Non-production',
        clear: () => setAssetStatus('all'),
        accent: assetStatus === 'active' ? '#22d3ee' : '#fb923c',
      })
    }
    for (const [t, on] of Object.entries(typeVisible)) {
      if (!on) chips.push({
        key: `hide-${t}`, label: `Hide ${NODE_TYPES[t].label}`,
        clear: () => setTypeVisible(v => ({ ...v, [t]: true })),
      })
    }
    for (const c of countryFilter) chips.push({
      key: `c-${c}`, label: c,
      clear: () => { const next = new Set(countryFilter); next.delete(c); setCountryFilter(next) },
    })
    for (const d of depTypeFilter) chips.push({
      key: `d-${d}`, label: d,
      clear: () => { const next = new Set(depTypeFilter); next.delete(d); setDepTypeFilter(next) },
    })
    if (resourceMin > 0) chips.push({
      key: 'res', label: `≥ ${resourceMin} ×10⁴t REO`,
      clear: () => setResourceMin(0),
    })
    return chips
  }, [assetStatus, typeVisible, countryFilter, depTypeFilter, resourceMin])

  const clearAll = () => {
    setAssetStatus('active')
    setTypeVisible(Object.fromEntries(Object.keys(NODE_TYPES).map(k => [k, true])))
    setCountryFilter(new Set())
    setDepTypeFilter(new Set())
    setDepStatusFilter(new Set(Object.keys(NODE_TYPES.deposit.statuses)))
    setProjStatusFilter(new Set(['4']))
    setRefStatusFilter(new Set(['3', '4', '5']))
    setResourceMin(0)
  }

  const toggleSet = (set, key, setter) => {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    setter(next)
  }

  /* ── render states ─────────────────────────────────────────────────── */

  if (err) return (
    <div className="page-v2"><div className="page-loading" style={{ color: '#ef4444' }}>Error: {err}</div></div>
  )
  if (!graph) return (
    <div className="page-v2"><div className="page-loading">
      <div className="spinner" /> Loading supply-chain dataset…
    </div></div>
  )

  return (
    <div className="page-v2">
      {/* ── top bar ─────────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-left">
          {onBack && <button className="icon-btn" onClick={onBack} title="Back">←</button>}
          <div>
            <div className="topbar-title">Rare-earth supply chain</div>
            <div className="topbar-sub">
              Folder data · <span className="mono">{graph.meta.counts.renderable.toLocaleString()}</span> nodes
              {' · '}<span className="mono">{graph.meta.counts.edges}</span> edges
              {' · '}schema v{graph.meta.schema_version}
            </div>
          </div>
        </div>

        <div className="segmented" role="tablist" aria-label="Asset status">
          {[['active','Active production'], ['nonprod','Non-production'], ['all','All']].map(([k, l]) => (
            <button
              key={k}
              className={`seg ${assetStatus === k ? 'seg-on' : ''}`}
              onClick={() => setAssetStatus(k)}
              data-kind={k}
            >{l}</button>
          ))}
        </div>

        <div className="segmented" role="tablist" aria-label="View">
          {[['map','Map'], ['table','Table']].map(([k, l]) => (
            <button
              key={k}
              className={`seg ${view === k ? 'seg-on' : ''}`}
              onClick={() => setView(k)}
            >{l}</button>
          ))}
        </div>
      </header>

      {/* ── breadcrumb filter chips ─────────────────────────────────── */}
      <div className="breadcrumbs">
        <span className="bc-label">Filters:</span>
        {activeChips.length === 0 && (
          <span className="bc-empty">none</span>
        )}
        {activeChips.map(c => (
          <button
            key={c.key}
            className="bc-chip"
            onClick={c.clear}
            style={c.accent ? { '--bc-accent': c.accent } : undefined}
            title="Click to remove"
          >
            <span>{c.label}</span>
            <span className="bc-x">✕</span>
          </button>
        ))}
        {activeChips.length > 0 && (
          <button className="bc-clear" onClick={clearAll}>Reset</button>
        )}
        <span className="bc-spacer" />
        <span className="bc-count">
          {visibleNodes.length.toLocaleString()} / {graph.meta.counts.renderable.toLocaleString()} visible
        </span>
      </div>

      {/* ── main grid ───────────────────────────────────────────────── */}
      <div className="main-grid">
        {/* Sidebar with accordion filters */}
        <aside className="sidebar-v2">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search project, company, deposit…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {searchHits.length > 0 && (
              <div className="search-hits">
                {searchHits.map(n => (
                  <div key={n.id} className="search-hit" onClick={() => { setSelected(n); setSearch('') }}>
                    <span style={{ color: colorForNode(n) }}>{NODE_TYPES[n.type].icon}</span>
                    <span className="sh-name">{n.name}</span>
                    <span className="sh-country">{n.country || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Accordion title="Facility type" count={Object.values(stats).reduce((a,b)=>a+b, 0)}>
            {Object.entries(NODE_TYPES).map(([key, cfg]) => (
              <label key={key} className="row-toggle">
                <div
                  className={`switch ${typeVisible[key] ? 'on' : ''}`}
                  onClick={() => setTypeVisible(v => ({ ...v, [key]: !v[key] }))}
                  style={{ '--sw-accent': cfg.color }}
                />
                <span className="rt-icon" style={{ color: cfg.color }}>{cfg.icon}</span>
                <span className="rt-label">{cfg.label}</span>
                <span className="rt-count">{stats[key]?.toLocaleString() ?? 0}</span>
              </label>
            ))}
          </Accordion>

          <Accordion title="Project stage" defaultOpen={typeVisible.project}>
            <div className="chip-row">
              {Object.entries(NODE_TYPES.project.statuses).map(([k, m]) => (
                <ChipToggle
                  key={k}
                  active={projStatusFilter.has(k)}
                  onClick={() => toggleSet(projStatusFilter, k, setProjStatusFilter)}
                  color={m.color}
                >
                  <span className="chip-code">{k}</span> {m.label}
                </ChipToggle>
              ))}
            </div>
          </Accordion>

          <Accordion title="Refinery stage" defaultOpen={false}>
            <div className="chip-row">
              {Object.entries(NODE_TYPES.refinery.statuses).map(([k, m]) => (
                <ChipToggle
                  key={k}
                  active={refStatusFilter.has(k)}
                  onClick={() => toggleSet(refStatusFilter, k, setRefStatusFilter)}
                  color={m.color}
                >
                  <span className="chip-code">{k}</span> {m.label}
                </ChipToggle>
              ))}
            </div>
          </Accordion>

          <Accordion title="Deposit maturity" defaultOpen={false}>
            <div className="chip-row">
              {Object.entries(NODE_TYPES.deposit.statuses).map(([k, m]) => (
                <ChipToggle
                  key={k}
                  active={depStatusFilter.has(k)}
                  onClick={() => toggleSet(depStatusFilter, k, setDepStatusFilter)}
                  color={m.color}
                >{m.label}</ChipToggle>
              ))}
            </div>
          </Accordion>

          <Accordion title={`Country${countryFilter.size ? ` · ${countryFilter.size}` : ''}`} defaultOpen={false}>
            <div className="checklist">
              {countryOptions.slice(0, 40).map(([c, n]) => (
                <label key={c} className="ck">
                  <input
                    type="checkbox"
                    checked={countryFilter.has(c)}
                    onChange={() => toggleSet(countryFilter, c, setCountryFilter)}
                  />
                  <span className="ck-text">{c}</span>
                  <span className="ck-count">{n}</span>
                </label>
              ))}
            </div>
          </Accordion>

          <Accordion title={`Deposit type${depTypeFilter.size ? ` · ${depTypeFilter.size}` : ''}`} defaultOpen={false}>
            <div className="checklist">
              {depTypeOptions.slice(0, 30).map(([t, n]) => (
                <label key={t} className="ck">
                  <input
                    type="checkbox"
                    checked={depTypeFilter.has(t)}
                    onChange={() => toggleSet(depTypeFilter, t, setDepTypeFilter)}
                  />
                  <span className="ck-text">{t}</span>
                  <span className="ck-count">{n}</span>
                </label>
              ))}
            </div>
          </Accordion>

          <Accordion title="Resource size (projects)" defaultOpen={false}>
            <div className="slider-group">
              <div className="slider-row">
                <span className="mono">{resourceMin}</span>
                <span className="sub">×10⁴ t REO minimum</span>
              </div>
              <input
                type="range" min={0} max={500} step={10}
                value={resourceMin}
                onChange={e => setResourceMin(+e.target.value)}
                className="slider"
              />
            </div>
          </Accordion>
        </aside>

        {/* Right side: map or table */}
        <section className="viewport">
          {view === 'map' && (
            <>
              <SupplyChainMap
                nodes={visibleNodes}
                edges={graph.edges}
                byId={graph.byId}
                typeVisible={typeVisible}
                highlighted={highlighted}
                onNodeClick={setSelected}
              />
              <div className="legend-v2">
                <div className="legend-title">Legend</div>
                {Object.entries(NODE_TYPES).map(([key, cfg]) => (
                  <div key={key} className="legend-row">
                    <span className="legend-icon" style={{ color: cfg.color }}>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </div>
                ))}
                <div className="legend-row" style={{ marginTop: '0.45rem' }}>
                  <span
                    className="legend-icon"
                    style={{ width: 20, height: 2, background: '#9aa5b8', display: 'inline-block' }}
                  />
                  <span>Flow (known)</span>
                </div>
                <div className="legend-row">
                  <span
                    className="legend-icon"
                    style={{
                      width: 20,
                      background: 'repeating-linear-gradient(90deg, #9aa5b8 0 5px, transparent 5px 8px)',
                      height: 2,
                      display: 'inline-block',
                    }}
                  />
                  <span>Flow (probable — multi-site)</span>
                </div>
              </div>
            </>
          )}
          {view === 'table' && (
            <DataTable rows={visibleNodes} onRowClick={setSelected} />
          )}

          {selected && (
            <aside className="detail-v2">
              <button className="detail-close" onClick={() => setSelected(null)}>✕</button>
              <div className="dv2-title">
                <span style={{ color: colorForNode(selected), marginRight: 8 }}>{NODE_TYPES[selected.type].icon}</span>
                {selected.name || selected.id}
              </div>
              <div className="dv2-sub">
                {NODE_TYPES[selected.type].label}
                {selected.country ? ` · ${selected.country}` : ''}
                {selected.state ? `, ${selected.state}` : ''}
              </div>

              <div className="dv2-grid">
                {selected.company && <Field k="Company" v={selected.company} span={3} />}
                {selected.chinese_name && <Field k="中文" v={selected.chinese_name} span={3} />}
                {selected.ticker && <Field k="Ticker" v={selected.ticker} />}
                {selected.ownership && <Field k="Ownership" v={selected.ownership} span={2} />}
                {selected.status_code != null && (
                  <Field
                    k={selected.type === 'deposit' ? 'Status' : 'Stage'}
                    v={(() => {
                      const c = normalizeStatusCode(selected.status_code)
                      const m = c && NODE_TYPES[selected.type].statuses[c]
                      return m ? `${c} · ${m.label}` : String(selected.status_code)
                    })()}
                    color={colorForNode(selected)}
                  />
                )}
                {selected.status && <Field k="Status" v={selected.status.replace(/\s*\(\?\)\s*$/, '')} />}
                {selected.deposit_type && <Field k="Type" v={selected.deposit_type} />}
                {selected.resource_kt_reo != null && <Field k="Resource" v={`${selected.resource_kt_reo} ×10⁴t REO`} />}
                {selected.grade_pct != null && <Field k="Grade" v={`${selected.grade_pct}%`} />}
                {selected.smelting_quota_t_reo_2024 != null && (
                  <Field k="Smelt quota 2024" v={`${selected.smelting_quota_t_reo_2024.toLocaleString()} t REO`} span={2} />
                )}
                {selected.mining_quota_t_reo_2024 != null && (
                  <Field k="Mining quota 2024" v={`${selected.mining_quota_t_reo_2024.toLocaleString()} t REO`} span={2} />
                )}
                {selected.revenue_2024_cny && <Field k="Revenue 2024" v={selected.revenue_2024_cny} span={2} />}
                {selected.capacity && <Field k="Capacity" v={selected.capacity} span={3} />}
                {selected.products && <Field k="Products" v={selected.products} span={3} />}
              </div>

              {selected.classification_note && (
                <div className="dv2-note">{selected.classification_note}</div>
              )}

              {graph.incoming.get(selected.id)?.length > 0 && (
                <ChainList
                  title="Upstream"
                  edges={graph.incoming.get(selected.id)}
                  byId={graph.byId}
                  fromEnd="from_id"
                  onPick={setSelected}
                />
              )}
              {graph.outgoing.get(selected.id)?.length > 0 && (
                <ChainList
                  title="Downstream"
                  edges={graph.outgoing.get(selected.id)}
                  byId={graph.byId}
                  fromEnd="to_id"
                  onPick={setSelected}
                />
              )}

              {selected.ref_urls?.length > 0 && (
                <>
                  <div className="dv2-label">Sources</div>
                  {selected.ref_urls.map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer" className="dv2-link">{u}</a>
                  ))}
                </>
              )}
            </aside>
          )}
        </section>
      </div>
    </div>
  )
}

function Field({ k, v, span = 1, color }) {
  return (
    <div className="dv2-field" style={{ gridColumn: `span ${span}` }}>
      <div className="dv2-k">{k}</div>
      <div className="dv2-v mono" style={color ? { color } : undefined}>{v}</div>
    </div>
  )
}

function ChainList({ title, edges, byId, fromEnd, onPick }) {
  return (
    <div className="dv2-chain">
      <div className="dv2-label">{title}</div>
      {edges.map(e => {
        const n = byId.get(e[fromEnd])
        if (!n) return null
        return (
          <button key={e.id} className="chain-row" onClick={() => onPick(n)}>
            <span style={{ color: colorForNode(n) }}>{NODE_TYPES[n.type].icon}</span>
            <span className="chain-name">{n.name}</span>
            <span className="chain-mat" style={{ color: MATERIAL_COLORS[e.material] || '#9ca3af' }}>
              {e.material}
            </span>
          </button>
        )
      })}
    </div>
  )
}
