/**
 * DataTable — tabular view of the supply-chain nodes.
 * Sortable columns, hover row, click-to-select. Rendered as a windowed list
 * so 4k+ rows stay responsive without a heavyweight virtualizer dep.
 */
import { useMemo, useState, useRef, useEffect } from 'react'
import { NODE_TYPES, colorForNode, normalizeStatusCode } from '../lib/nodeTypeConfig.js'

const ROW_HEIGHT = 40

const COLUMNS = [
  { key: 'type',     label: 'Type',     width: 120, align: 'left' },
  { key: 'name',     label: 'Name',     width: 260, align: 'left' },
  { key: 'country',  label: 'Country',  width: 160, align: 'left' },
  { key: 'status',   label: 'Status',   width: 130, align: 'left' },
  { key: 'company',  label: 'Company',  width: 220, align: 'left' },
  { key: 'resource', label: 'Resource', width: 110, align: 'right' },
  { key: 'grade',    label: 'Grade',    width: 80,  align: 'right' },
  { key: 'year',     label: 'Year',     width: 60,  align: 'right' },
  { key: 'coords',   label: 'Coords',   width: 150, align: 'right' },
]

function statusLabel(n) {
  const cfg = NODE_TYPES[n.type]
  if (!cfg) return n.status || n.status_code || ''
  if (n.type === 'deposit') {
    return (n.status || '').replace(/\s*\(\?\)\s*$/, '') || ''
  }
  const code = normalizeStatusCode(n.status_code)
  const meta = code && cfg.statuses[code]
  return meta ? `${code} · ${meta.label}` : (code || '')
}

function cellValue(n, key) {
  switch (key) {
    case 'type':     return NODE_TYPES[n.type]?.label || n.type
    case 'name':     return n.name || n.id
    case 'country':  return n.country || ''
    case 'status':   return statusLabel(n)
    case 'company':  return n.company || ''
    case 'resource': return n.resource_kt_reo != null
      ? n.resource_kt_reo.toLocaleString() + ' ×10⁴t'
      : (n.smelting_quota_t_reo_2024 != null
          ? n.smelting_quota_t_reo_2024.toLocaleString() + ' t REO'
          : '')
    case 'grade':    return n.grade_pct != null ? n.grade_pct + '%' : ''
    case 'year':     return n.data_year || ''
    case 'coords':   return n.geocoded
      ? `${n.lat.toFixed(2)}, ${n.lng.toFixed(2)}`
      : '—'
    default: return ''
  }
}

function sortKey(n, key) {
  // Sort by the underlying numeric value where possible; otherwise by display string.
  switch (key) {
    case 'resource': return n.resource_kt_reo ?? n.smelting_quota_t_reo_2024 ?? -Infinity
    case 'grade':    return n.grade_pct ?? -Infinity
    case 'year':     return n.data_year ?? 0
    case 'coords':   return n.lat ?? -Infinity
    default: return cellValue(n, key).toString().toLowerCase()
  }
}

export default function DataTable({ rows, onRowClick }) {
  const [sortBy, setSortBy] = useState('type')
  const [sortDir, setSortDir] = useState('asc')
  const scroller = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(600)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onResize = () => setViewportH(el.clientHeight)
    onResize()
    const ro = new ResizeObserver(onResize)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const sorted = useMemo(() => {
    const s = [...rows].sort((a, b) => {
      const av = sortKey(a, sortBy)
      const bv = sortKey(b, sortBy)
      if (av === bv) return 0
      return (av > bv ? 1 : -1) * (sortDir === 'asc' ? 1 : -1)
    })
    return s
  }, [rows, sortBy, sortDir])

  const totalWidth = COLUMNS.reduce((s, c) => s + c.width, 0)
  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 8)
  const last  = Math.min(sorted.length, first + Math.ceil(viewportH / ROW_HEIGHT) + 16)
  const slice = sorted.slice(first, last)

  const clickHeader = (key) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
  }

  return (
    <div className="data-table">
      <div className="data-table-header" style={{ width: totalWidth }}>
        {COLUMNS.map(c => (
          <div
            key={c.key}
            className={`th ${sortBy === c.key ? 'th-active' : ''}`}
            style={{ width: c.width, justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start' }}
            onClick={() => clickHeader(c.key)}
          >
            <span>{c.label}</span>
            {sortBy === c.key && (
              <span className="th-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>
            )}
          </div>
        ))}
      </div>
      <div
        ref={scroller}
        className="data-table-body"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <div style={{ height: sorted.length * ROW_HEIGHT, position: 'relative', width: totalWidth }}>
          {slice.map((n, i) => (
            <div
              key={n.id}
              className="tr"
              style={{
                position: 'absolute',
                top: (first + i) * ROW_HEIGHT,
                height: ROW_HEIGHT,
                width: totalWidth,
              }}
              onClick={() => onRowClick && onRowClick(n)}
            >
              {COLUMNS.map(c => {
                const isType = c.key === 'type'
                return (
                  <div
                    key={c.key}
                    className="td"
                    style={{
                      width: c.width,
                      justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
                      fontFamily: (c.key === 'resource' || c.key === 'grade' || c.key === 'year' || c.key === 'coords')
                        ? 'var(--mono)' : 'var(--font)',
                    }}
                  >
                    {isType && (
                      <span
                        className="type-pill"
                        style={{
                          color: colorForNode(n),
                          borderColor: colorForNode(n) + '55',
                          background: colorForNode(n) + '15',
                        }}
                      >
                        <span style={{ marginRight: 5 }}>{NODE_TYPES[n.type]?.icon}</span>
                        {NODE_TYPES[n.type]?.label || n.type}
                      </span>
                    )}
                    {!isType && (
                      <span className="td-text">{cellValue(n, c.key)}</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="data-table-footer">
        <span>{sorted.length.toLocaleString()} rows</span>
        <span style={{ color: 'var(--sub)' }}>sorted by {COLUMNS.find(c => c.key === sortBy).label} {sortDir === 'asc' ? '↑' : '↓'}</span>
      </div>
    </div>
  )
}
