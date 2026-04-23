/**
 * WEEE recycling facilities — map from recycling_facilities_cleaned.xlsx (public).
 * Main tab: sheet categories in a fixed order (Collection … Re-use), one merged
 * “Multiples” filter, “Category refining” (pyro / hydro / mixed), then unmatched `t:…` types.
 * REE tab: map and sidebar for REE-only rows only.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import RecyclingMap from '../components/RecyclingMap.jsx'
import {
  locationCacheKey,
  getRecyclingTypeStyle,
  parseLatLngFromRow,
  pickSourceTextFromRow,
  extractHttpUrlsFromText,
  RECYCLING_DATASET_ATTRIBUTION,
  METALLURGY_COLORS,
  RECYCLING_SHEET_CATEGORY_DEFS,
  REE_FILTER_ID,
} from '../lib/recyclingData.js'
import './MapPage.css'
import './RecyclingPage.css'

const METALLURGY_ORDER = ['Hydrometallurgy', 'Mixed refining', 'Pyrometallurgy']
const METALLURGY_FILTER_IDS = METALLURGY_ORDER.map(n => `m:${n}`)

const LOCATIONS_URL = '/data/recycling_facilities_locations.json'
const EU_FALLBACK = [10, 50]

function Accordion ({ title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="acc">
      <button type="button" className="acc-head" onClick={() => setOpen(o => !o)}>
        <span className="acc-chev" style={{ transform: open ? 'rotate(90deg)' : '' }}>▸</span>
        <span className="acc-title">{title}</span>
        {count != null && <span className="acc-count">{count}</span>}
      </button>
      {open && <div className="acc-body">{children}</div>}
    </div>
  )
}

function parseRows (json) {
  return json
    .map((r, i) => {
      const lonLat = parseLatLngFromRow(r)
      const details = r.Details ?? r.details ?? '—'
      const typeRaw = r.Type ?? r.type ?? '—'
      const st = getRecyclingTypeStyle(typeRaw)
      const source = pickSourceTextFromRow(r)
      const detailUrls = extractHttpUrlsFromText(details)
      return {
        id: i,
        operator: r.Operator ?? r.operator ?? '—',
        type: typeRaw,
        country: r.Country ?? r.country ?? '—',
        city: r.City ?? r.city ?? '—',
        details,
        source,
        detailUrls,
        lonLat,
        ...st,
        isRee: Boolean(st.isRee),
      }
    })
    .filter(r => r.operator !== '—' || r.city !== '—')
}

function buildFeatureCollection (rows, locationsByKey, typeVisible) {
  const features = []
  for (const row of rows) {
    if (typeVisible[row.filterId] === false) continue
    const k = locationCacheKey(row.city, row.country)
    const c = row.lonLat || locationsByKey[k] || EU_FALLBACK
    features.push({
      type: 'Feature',
      id: row.id,
      properties: {
        id: row.id,
        operator: row.operator,
        country: row.country,
        city: row.city,
        details: row.details,
        typeRaw: row.type,
        typeLabel: row.typeLabel,
        filterId: row.filterId,
        isMetallurgy: row.isMetallurgy ? '1' : '0',
        isRee: row.isRee ? '1' : '0',
        metallurgyName: row.metallurgyName || '',
        source: row.source || '',
        detailUrlsJson: JSON.stringify(row.detailUrls || []),
        wlx: '—',
        expiry: '—',
        color: row.color,
        op: 0.95,
        iconKey: row.iconKey,
      },
      geometry: { type: 'Point', coordinates: [c[0], c[1]] },
    })
  }
  return { type: 'FeatureCollection', features }
}

export default function RecyclingPage () {
  const [phase, setPhase] = useState('loading')
  const [err, setErr] = useState(null)
  const [rows, setRows] = useState([])
  const [locationsByKey, setLocationsByKey] = useState(() => ({}))
  const [typeVisible, setTypeVisible] = useState({})
  const [mapTab, setMapTab] = useState('main')
  const [selected, setSelected] = useState(null)

  const mainRows = useMemo(() => rows.filter(r => !r.isRee), [rows])
  const reeRows = useMemo(() => rows.filter(r => r.isRee), [rows])

  const counts = useMemo(() => {
    const c = {}
    for (const r of mainRows) {
      c[r.filterId] = (c[r.filterId] || 0) + 1
    }
    return c
  }, [mainRows])

  useEffect(() => {
    if (!mainRows.length) return
    setTypeVisible(prev => {
      const next = { ...prev }
      for (const r of mainRows) {
        if (next[r.filterId] === undefined) next[r.filterId] = true
      }
      return next
    })
  }, [mainRows])

  const metallurgyKeysPresent = useMemo(
    () => METALLURGY_FILTER_IDS.filter(id => (counts[id] || 0) > 0),
    [counts],
  )

  const otherTypeKeys = useMemo(() => {
    return Object.keys(counts)
      .filter(k => k.startsWith('t:'))
      .sort((a, b) => (counts[b] - counts[a]) || a.localeCompare(b))
  }, [counts])

  const colorByFilterId = useMemo(() => {
    const m = {}
    for (const r of mainRows) m[r.filterId] = r.color
    return m
  }, [mainRows])

  const allFilterIds = useMemo(() => Object.keys(counts), [counts])

  const deselectAllFilters = useCallback(() => {
    setTypeVisible(() => {
      const next = {}
      for (const id of allFilterIds) next[id] = false
      return next
    })
  }, [allFilterIds])

  const selectAllFilters = useCallback(() => {
    setTypeVisible(() => {
      const next = {}
      for (const id of allFilterIds) next[id] = true
      return next
    })
  }, [allFilterIds])

  const mapGeo = useMemo(() => {
    if (phase !== 'ready' || !rows.length) return { type: 'FeatureCollection', features: [] }
    if (mapTab === 'ree') {
      if (!reeRows.length) return { type: 'FeatureCollection', features: [] }
      const reeOn = { [REE_FILTER_ID]: true }
      return buildFeatureCollection(reeRows, locationsByKey, reeOn)
    }
    return buildFeatureCollection(mainRows, locationsByKey, typeVisible)
  }, [rows, mainRows, reeRows, mapTab, locationsByKey, typeVisible, phase])

  const visibleCount = useMemo(
    () => mapGeo.features.length,
    [mapGeo],
  )

  const sourceSummary = useMemo(() => {
    const withSrc = rows.filter(r => r.source && String(r.source).trim())
    const uniq = [...new Set(withSrc.map(r => String(r.source).trim()))]
    const singleShared = uniq.length === 1 ? uniq[0] : null
    return { uniqueSources: uniq, singleShared }
  }, [rows])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [xlsRes, locRes] = await Promise.all([
          fetch('/recycling_facilities_cleaned.xlsx'),
          fetch(LOCATIONS_URL),
        ])
        if (!xlsRes.ok) throw new Error(`Spreadsheet HTTP ${xlsRes.status}`)
        const buf = await xlsRes.arrayBuffer()
        if (cancelled) return
        const wb = XLSX.read(buf, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        const r = parseRows(json)
        if (!r.length) {
          setErr('No data rows in spreadsheet.')
          setPhase('error')
          return
        }

        let loc = {}
        if (locRes.ok) {
          const data = await locRes.json()
          for (const [key, v] of Object.entries(data)) {
            if (Array.isArray(v) && v.length === 2 && v.every(n => Number.isFinite(n))) {
              loc[key] = v
            }
          }
        }

        if (cancelled) return
        setRows(r)
        setLocationsByKey(loc)
        setPhase('ready')
      } catch (e) {
        if (!cancelled) {
          setErr(e.message || String(e))
          setPhase('error')
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  const mapTabLabel = mapTab === 'ree' ? 'REE recycling' : 'Facility types'
  const mapTabTotal = mapTab === 'ree' ? reeRows.length : mainRows.length

  const onPointClick = useCallback((p) => {
    let detailUrls = []
    try {
      detailUrls = JSON.parse(p.detailUrlsJson || '[]')
    } catch { /* */ }
    if (!Array.isArray(detailUrls)) detailUrls = []
    setSelected({
      operator: p.operator,
      country: p.country,
      city: p.city,
      details: p.details,
      wlx: p.wlx || '—',
      expiry: p.expiry || '—',
      typeRaw: p.typeRaw,
      typeLabel: p.typeLabel,
      isMetallurgy: p.isMetallurgy === '1',
      metallurgyName: p.metallurgyName,
      source: (p.source || '').trim(),
      detailUrls,
    })
  }, [])

  if (err && phase === 'error' && !rows.length) {
    return (
      <div className="page-v2">
        <div className="page-loading" style={{ color: '#ef4444' }}>Error: {err}</div>
        <p className="p-4 text-sm text-slate-400">Place <code>recycling_facilities_cleaned.xlsx</code> in <code>public/</code> and rebuild.</p>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="page-v2 page-recycling">
        <header className="topbar">
          <div className="topbar-left">
            <div>
              <div className="topbar-title">Recycling facilities</div>
              <div className="topbar-sub">WEEE · EU registry</div>
            </div>
          </div>
        </header>
        <div className="page-loading" style={{ flex: 1 }}>
          <div className="spinner" />
          Loading data and coordinates…
        </div>
      </div>
    )
  }

  return (
    <div className="page-v2 page-recycling">
      <header className="topbar">
        <div className="topbar-left">
          <div>
            <div className="topbar-title">Recycling facilities</div>
            <div className="topbar-sub">
              <span className="recycling-topbar-mode">{mapTabLabel}</span>
              {' — '}
              <span className="mono">{visibleCount.toLocaleString()}</span>
              {' / '}
              <span className="mono">{mapTabTotal.toLocaleString()}</span>
              {' sites visible'}
            </div>
          </div>
        </div>
      </header>

      <div className="recycling-main recycling-main--grid">
        <div className="recycling-map-cell">
          <RecyclingMap
            geojson={mapGeo}
            onPointClick={onPointClick}
            commonSourceText={sourceSummary.singleShared}
            mapFooterNote={RECYCLING_DATASET_ATTRIBUTION}
          />
        </div>

        <aside className="sidebar-v2 recycling-filters" aria-label="Facility type filters">
          <div className="recycling-tab-bar" role="tablist" aria-label="Map scope">
            <button
              type="button"
              role="tab"
              className={`recycling-tab${mapTab === 'main' ? ' recycling-tab--active' : ''}`}
              aria-selected={mapTab === 'main'}
              onClick={() => setMapTab('main')}
            >
              Facility types
            </button>
            <button
              type="button"
              role="tab"
              className={`recycling-tab${mapTab === 'ree' ? ' recycling-tab--active' : ''}`}
              aria-selected={mapTab === 'ree'}
              onClick={() => setMapTab('ree')}
            >
              REE recycling
            </button>
          </div>

          {mapTab === 'main' && (
            <>
              <div className="recycling-filter-actions">
                <button
                  type="button"
                  className="recycling-filter-action"
                  onClick={deselectAllFilters}
                  disabled={allFilterIds.length === 0}
                >
                  Deselect all
                </button>
                <button
                  type="button"
                  className="recycling-filter-action"
                  onClick={selectAllFilters}
                  disabled={allFilterIds.length === 0}
                >
                  Select all
                </button>
              </div>

              {RECYCLING_SHEET_CATEGORY_DEFS.map((def) => {
                const n = counts[def.id] || 0
                if (n === 0) return null
                const fid = def.id
                const col = colorByFilterId[fid] || '#6b7280'
                return (
                  <div key={fid} className="recycling-cat-block">
                    <div className="recycling-cat-h">{def.uiLabel}</div>
                    <label className="row-toggle">
                      <div
                        className={`switch ${typeVisible[fid] ? 'on' : ''}`}
                        onClick={() => setTypeVisible(v => ({ ...v, [fid]: !v[fid] }))}
                        style={{ '--sw-accent': col }}
                      />
                      <span
                        className="recycling-swatch"
                        style={{ background: col }}
                        aria-hidden
                      />
                      <span className="rt-label" title={def.typeLabel}>{def.typeLabel}</span>
                      <span className="rt-count">{(counts[fid] || 0).toLocaleString()}</span>
                    </label>
                  </div>
                )
              })}

              <div className="recycling-cat-block recycling-cat-block--refining">
                <div className="recycling-cat-h">Category refining</div>
                {metallurgyKeysPresent.length === 0 && (
                  <p className="recycling-filter-empty">No pyro / hydro / mixed refining rows in the file.</p>
                )}
                {metallurgyKeysPresent.map((fid) => {
                  const name = fid.slice(2)
                  const col = METALLURGY_COLORS[name]
                  return (
                    <label key={fid} className="row-toggle">
                      <div
                        className={`switch ${typeVisible[fid] ? 'on' : ''}`}
                        onClick={() => setTypeVisible(v => ({ ...v, [fid]: !v[fid] }))}
                        style={{ '--sw-accent': col }}
                      />
                      <span
                        className="recycling-swatch"
                        style={{ background: col }}
                        aria-hidden
                      />
                      <span className="rt-label">{name}</span>
                      <span className="rt-count">{(counts[fid] || 0).toLocaleString()}</span>
                    </label>
                  )
                })}
              </div>

              {otherTypeKeys.length > 0 && (
                <Accordion
                  title="Other (unmatched in sheet type)"
                  count={otherTypeKeys.reduce((a, k) => a + (counts[k] || 0), 0)}
                  defaultOpen
                >
                  {otherTypeKeys.map((fid) => {
                    const label = fid.slice(2)
                    const col = colorByFilterId[fid] || '#6b7280'
                    return (
                      <label key={fid} className="row-toggle">
                        <div
                          className={`switch ${typeVisible[fid] ? 'on' : ''}`}
                          onClick={() => setTypeVisible(v => ({ ...v, [fid]: !v[fid] }))}
                          style={{ '--sw-accent': col }}
                        />
                        <span
                          className="recycling-swatch"
                          style={{ background: col }}
                          aria-hidden
                        />
                        <span className="rt-label recycling-rt-ellipsis" title={label}>{label}</span>
                        <span className="rt-count">{(counts[fid] || 0).toLocaleString()}</span>
                      </label>
                    )
                  })}
                </Accordion>
              )}
            </>
          )}

          {mapTab === 'ree' && (
            <div className="recycling-ree-panel">
              <p className="recycling-ree-lead">
                The map uses only <strong>REE recycling</strong> from the <span className="mono">Type</span> column.
                All other process categories (collection, WEEE, refining, etc.) are on the
                <button type="button" className="recycling-ree-link" onClick={() => setMapTab('main')}>
                  {' '}Facility types
                </button>
                {' '}tab.
              </p>
              {reeRows.length > 0 ? (
                <p className="recycling-ree-stat">
                  <span className="mono">{reeRows.length.toLocaleString()}</span>
                  {' site(s) in the spreadsheet.'}
                </p>
              ) : (
                <p className="recycling-filter-empty">No REE recycling rows in this file.</p>
              )}
            </div>
          )}
        </aside>
      </div>

      <footer className="recycling-sources-foot" aria-label="Data sources">
        <div className="recycling-sources-title">Data sources</div>
        <p className="recycling-sources-text">{RECYCLING_DATASET_ATTRIBUTION}</p>
        {sourceSummary.singleShared && (
          <p className="recycling-sources-common">
            <span className="recycling-sources-label">Shared source (spreadsheet):</span>
            {' '}
            {sourceSummary.singleShared}
          </p>
        )}
        {!sourceSummary.singleShared && sourceSummary.uniqueSources.length > 1 && (
          <ul className="recycling-sources-list">
            {sourceSummary.uniqueSources.map(s => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
      </footer>

      {selected && (
        <aside className="detail-v2 recycling-detail">
          <button type="button" className="detail-close" onClick={() => setSelected(null)}>✕</button>
          <div className="dv2-title">{selected.operator}</div>
          <div className="dv2-sub">{selected.country}{selected.city ? ` · ${selected.city}` : ''}</div>
          <div className="dv2-grid" style={{ marginTop: 12 }}>
            {selected.typeRaw && (
              <div className="dv2-field" style={{ gridColumn: 'span 3' }}>
                <div className="dv2-k">Type (file)</div>
                <div className="dv2-v">{selected.typeRaw}</div>
              </div>
            )}
            {selected.isMetallurgy && selected.metallurgyName && (
              <div className="dv2-field" style={{ gridColumn: 'span 3' }}>
                <div className="dv2-k">Refining</div>
                <div className="dv2-v">{selected.metallurgyName}</div>
              </div>
            )}
            <div className="dv2-field" style={{ gridColumn: 'span 3' }}>
              <div className="dv2-k">WLX certification</div>
              <div className="dv2-v">{selected.wlx}</div>
            </div>
            <div className="dv2-field" style={{ gridColumn: 'span 3' }}>
              <div className="dv2-k">Details</div>
              <div className="dv2-v" style={{ whiteSpace: 'pre-wrap' }}>{selected.details}</div>
            </div>
            {selected.source
              && !(
                sourceSummary.singleShared
                && selected.source === sourceSummary.singleShared
              ) && (
              <div className="dv2-field" style={{ gridColumn: 'span 3' }}>
                <div className="dv2-k">Source</div>
                <div className="dv2-v" style={{ whiteSpace: 'pre-wrap' }}>{selected.source}</div>
              </div>
            )}
            {selected.detailUrls && selected.detailUrls.length > 0 && (
              <div className="dv2-field" style={{ gridColumn: 'span 3' }}>
                <div className="dv2-k">Web references (from details)</div>
                <ul className="recycling-link-list">
                  {selected.detailUrls.map(u => (
                    <li key={u}>
                      <a href={u} target="_blank" rel="noopener noreferrer">
                        {u}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="dv2-field" style={{ gridColumn: 'span 3' }}>
              <div className="dv2-k">Expiry date</div>
              <div className="dv2-v">{selected.expiry}</div>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
