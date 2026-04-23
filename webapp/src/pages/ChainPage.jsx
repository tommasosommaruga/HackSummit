/**
 * ChainPage — clean supply-chain flow visualizer.
 *
 * Shows only the downstream chain: Refinery → Magnet maker → OEM.
 * Uses chain_xlsx edges exclusively (no mine/deposit clutter).
 * Verified (non-Chinese) and inferred (Chinese aggregate) chains are visually
 * distinguished but both available.
 */
import { useEffect, useMemo, useState } from 'react'
import SupplyChainMap from '../components/SupplyChainMap.jsx'
import { NODE_TYPES, MATERIAL_COLORS, colorForNode, normalizeStatusCode } from '../lib/nodeTypeConfig.js'
import { loadSupplyChain } from '../lib/loadSupplyChain.js'
import './MapPage.css'

const CHAIN_TYPE_VISIBLE = {
  mine:         true,
  refinery:     true,
  magnet_maker: true,
  oem:          true,
  reseller:     true,
}

// deposit/project in graph data → remapped to 'mine' for ChainPage display
const CHAIN_TYPES_DATA  = ['deposit', 'project', 'refinery', 'magnet_maker', 'oem', 'reseller']
const CHAIN_TYPES       = ['mine', 'refinery', 'magnet_maker', 'oem', 'reseller']

export default function ChainPage() {
  const [graph, setGraph]     = useState(null)
  const [err, setErr]         = useState(null)
  const [selected, setSelected] = useState(null)
  const [showInferred, setShowInferred] = useState(true)

  useEffect(() => {
    loadSupplyChain({ patchMissing: false }).then(setGraph).catch(e => setErr(e.message))
  }, [])

  const { chainNodes, chainEdges, stats } = useMemo(() => {
    if (!graph) return { chainNodes: [], chainEdges: [], stats: {} }

    const edges = graph.edges.filter(e => e.source === 'chain_xlsx')
    const filtered = showInferred ? edges : edges.filter(e => e.confidence !== 'inferred')

    const nodeIds = new Set()
    for (const e of filtered) {
      nodeIds.add(e.from_id)
      nodeIds.add(e.to_id)
    }

    const nodes = graph.nodes
      .filter(n => nodeIds.has(n.id) && n.geocoded && CHAIN_TYPES_DATA.includes(n.type))
      .map(n => (n.type === 'deposit' || n.type === 'project')
        ? { ...n, type: 'mine' }
        : n
      )

    const st = {}
    for (const t of CHAIN_TYPES) st[t] = 0
    for (const n of nodes) st[n.type] = (st[n.type] || 0) + 1

    return { chainNodes: nodes, chainEdges: filtered, stats: st }
  }, [graph, showInferred])

  if (err) return (
    <div className="page-v2">
      <div className="page-loading" style={{ color: '#ef4444' }}>Error: {err}</div>
    </div>
  )
  if (!graph) return (
    <div className="page-v2">
      <div className="page-loading"><div className="spinner" /> Loading supply-chain dataset…</div>
    </div>
  )

  const verifiedCount = chainEdges.filter(e => e.confidence !== 'inferred').length
  const inferredCount = chainEdges.filter(e => e.confidence === 'inferred').length

  return (
    <div className="page-v2">
      {/* ── top bar ──────────────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-left">
          <div>
            <div className="topbar-title">Supply Chain Flow</div>
            <div className="topbar-sub">
              Refinery → Magnet maker → OEM
              {' · '}<span className="mono">{chainNodes.length}</span> nodes
              {' · '}<span className="mono">{chainEdges.length}</span> flows
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="chain-confidence-pills">
            <span className="conf-pill verified">
              ✓ {verifiedCount} verified
            </span>
            <span className="conf-pill inferred" style={{ opacity: showInferred ? 1 : 0.4 }}>
              ⚠ {inferredCount} inferred
            </span>
          </div>

          <button
            className={`seg ${showInferred ? 'seg-on' : ''}`}
            data-kind={showInferred ? 'active' : undefined}
            onClick={() => setShowInferred(v => !v)}
            title="Toggle Chinese aggregate (inferred) data"
          >
            <span className="dot" style={{ background: '#fbbf24' }} />
            {showInferred ? 'Inferred: ON' : 'Inferred: OFF'}
          </button>

        </div>
      </header>

      {/* ── main area: full-width map ────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <SupplyChainMap
          nodes={chainNodes}
          edges={chainEdges}
          byId={graph.byId}
          typeVisible={CHAIN_TYPE_VISIBLE}
          highlighted={selected ? new Set([selected.id]) : null}
          onNodeClick={setSelected}
        />

        {/* ── legend ───────────────────────────────────────────────────── */}
        <div className="legend-v2">
          <div className="legend-title">Supply Chain</div>

          {CHAIN_TYPES.filter(k => k !== 'reseller').map(key => {
            const cfg = NODE_TYPES[key]
            const n = stats[key] || 0
            if (!n) return null
            return (
              <div key={key} className="legend-row">
                <span className="legend-icon" style={{ color: cfg.color }}>{cfg.icon}</span>
                <span>{cfg.label}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--v2-dim)', fontSize: '0.75rem' }}>{n}</span>
              </div>
            )
          })}

          <div style={{ borderTop: '1px solid #1e2d47', margin: '0.5rem 0' }} />

          <div className="legend-title" style={{ marginBottom: '0.35rem' }}>Flows</div>
          <div className="legend-row">
            <span className="legend-icon" style={{ width: 20, height: 2, background: '#9aa5b8', display: 'inline-block' }} />
            <span>Verified flow</span>
          </div>
          <div className="legend-row">
            <span className="legend-icon" style={{
              width: 20, height: 2, display: 'inline-block',
              background: 'repeating-linear-gradient(90deg,#fbbf24 0 5px,transparent 5px 8px)',
            }} />
            <span>Inferred (Chinese data)</span>
          </div>

          <div style={{ borderTop: '1px solid #1e2d47', margin: '0.5rem 0' }} />

          <div className="legend-title" style={{ marginBottom: '0.35rem' }}>Material</div>
          {[['separated_reo', 'Sep. REO'], ['metal', 'Metal'], ['magnet', 'Magnet']].map(([k, label]) => (
            <div key={k} className="legend-row">
              <span className="legend-icon" style={{
                width: 10, height: 10, borderRadius: '50%',
                background: MATERIAL_COLORS[k], display: 'inline-block',
              }} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* ── node detail panel ────────────────────────────────────────── */}
        {selected && (
          <aside className="detail-v2">
            <button className="detail-close" onClick={() => setSelected(null)}>✕</button>

            <div className="dv2-title">
              <span style={{ color: colorForNode(selected), marginRight: 8 }}>
                {NODE_TYPES[selected.type].icon}
              </span>
              {selected.name || selected.id}
            </div>
            <div className="dv2-sub">
              {NODE_TYPES[selected.type].label}
              {selected.country ? ` · ${selected.country}` : ''}
            </div>

            {selected.confidence === 'inferred' && (
              <div className="dv2-note" style={{ background: 'rgba(251,191,36,0.12)', borderColor: '#fbbf24', color: '#fbbf24' }}>
                ⚠ Inferred data — Chinese aggregate source
              </div>
            )}

            <div className="dv2-grid">
              {selected.company    && <Field k="Company"      v={selected.company}      span={3} />}
              {selected.chinese_name && <Field k="中文"       v={selected.chinese_name} span={3} />}
              {selected.ticker     && <Field k="Ticker"       v={selected.ticker}  />}
              {selected.ownership  && <Field k="Ownership"    v={selected.ownership}    span={2} />}
              {selected.pstatus    && <Field k="Status"       v={selected.pstatus}      span={3} />}
              {selected.deposit_type && <Field k="Type"       v={selected.deposit_type} span={3} />}
              {selected.commodities  && <Field k="Commodities" v={selected.commodities} span={3} />}
              {selected.ree_grade  && <Field k="REE grade"   v={selected.ree_grade}    span={3} />}
              {selected.capacity   && <Field k="Capacity"     v={selected.capacity}     span={3} />}
              {selected.products   && <Field k="Products"     v={selected.products}     span={3} />}
              {selected.smelting_quota_t_reo_2024 != null && (
                <Field k="Smelt quota 2024" v={`${selected.smelting_quota_t_reo_2024.toLocaleString()} t REO`} span={3} />
              )}
              {selected.revenue_2024_cny && <Field k="Revenue 2024" v={selected.revenue_2024_cny} span={3} />}
            </div>

            {graph.incoming.get(selected.id)?.length > 0 && (
              <ChainList
                title="Upstream"
                edges={graph.incoming.get(selected.id).filter(e => e.source === 'chain_xlsx')}
                byId={graph.byId}
                fromEnd="from_id"
                onPick={setSelected}
              />
            )}
            {graph.outgoing.get(selected.id)?.length > 0 && (
              <ChainList
                title="Downstream"
                edges={graph.outgoing.get(selected.id).filter(e => e.source === 'chain_xlsx')}
                byId={graph.byId}
                fromEnd="to_id"
                onPick={setSelected}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  )
}

function Field({ k, v, span = 1 }) {
  return (
    <div className="dv2-field" style={{ gridColumn: `span ${span}` }}>
      <div className="dv2-k">{k}</div>
      <div className="dv2-v mono">{v}</div>
    </div>
  )
}

function asDisplay(n) {
  if (!n) return n
  return (n.type === 'deposit' || n.type === 'project') ? { ...n, type: 'mine' } : n
}

function ChainList({ title, edges, byId, fromEnd, onPick }) {
  const valid = edges.filter(e => byId.get(e[fromEnd]))
  if (!valid.length) return null
  return (
    <div className="dv2-chain">
      <div className="dv2-label">{title}</div>
      {valid.map(e => {
        const raw = byId.get(e[fromEnd])
        const n = asDisplay(raw)
        return (
          <button key={e.id} className="chain-row" onClick={() => onPick(n)}>
            <span style={{ color: colorForNode(n) }}>{NODE_TYPES[n.type]?.icon}</span>
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
