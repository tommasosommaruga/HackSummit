import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MINES, REFINERIES, TRADE_FLOWS, RECYCLING_FACILITIES, ELEMENTS } from '../data/mines.js'
import TransportLayer from './TransportLayer.jsx'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function riskColor(risk) {
  if (risk >= 0.6) return '#ef4444'
  if (risk >= 0.3) return '#eab308'
  return '#22c55e'
}

// sqrt-scale v ∈ [0, maxV] to a pixel size in [minPx, maxPx].
// sqrt so small producers stay visible while dominant producers stand out.
function scalePx(v, maxV, minPx, maxPx) {
  if (!maxV || v <= 0) return minPx
  const t = Math.sqrt(Math.min(v, maxV) / maxV)
  return Math.round(minPx + (maxPx - minPx) * t)
}

function mineIcon(mine, volume, maxVolume, elColor) {
  const color = riskColor(mine.risk)
  const size = scalePx(volume, maxVolume, 10, 44)
  const fontSize = Math.max(8, Math.min(12, Math.round(size * 0.35)))
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2px solid ${elColor};
      box-shadow:0 0 ${Math.round(size * 0.6)}px ${color}aa;
      display:flex;align-items:center;justify-content:center;
      font-size:${fontSize}px;color:white;font-weight:700;
    ">${size >= 20 ? Math.round(mine.risk * 100) : ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function refineryIcon(processPct, maxPct) {
  const size = scalePx(processPct, maxPct, 14, 32)
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:4px;
      background:#8b5cf6;border:2px solid white;
      box-shadow:0 0 ${Math.round(size * 0.5)}px #8b5cf6aa;
      display:flex;align-items:center;justify-content:center;
      font-size:${Math.round(size * 0.55)}px;
    ">🏭</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function recyclingIcon(capacity, maxCapacity, status) {
  // Capacity in tonnes per annum; unknown → minimum size marker.
  const size = capacity ? scalePx(capacity, maxCapacity, 14, 40) : 14
  const isOp = status === 'operational'
  const fill = isOp ? '#10b981' : '#14b8a6'
  const ring = isOp ? '#10b981' : '#f59e0b'
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${fill}33;border:2px dashed ${ring};
      box-shadow:0 0 ${Math.round(size * 0.6)}px ${fill}88;
      display:flex;align-items:center;justify-content:center;
      font-size:${Math.round(size * 0.55)}px;color:${fill};font-weight:800;
    ">♻</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function getCoord(id) {
  const all = [...MINES, ...REFINERIES, ...RECYCLING_FACILITIES]
  const node = all.find(n => n.id === id)
  return node ? [node.lat, node.lon] : null
}

function arcPoints(from, to, steps = 40) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const lat = from[0] + (to[0] - from[0]) * t
    const lon = from[1] + (to[1] - from[1]) * t
    const lift = Math.sin(Math.PI * t) * 8
    pts.push([lat + lift * 0.4, lon])
  }
  return pts
}

export default function SupplyMap({ filters, selectedYear, activeElement = 'Li', onNodeClick, showTransport = false, transportRiskFilter = 'all' }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)
  const layersRef = useRef({ mines: [], refineries: [], flows: [], recycling: [] })

  // Per-element maxima so sqrt-scaled sizing is comparable within an element
  // but cross-element differences (e.g. Mn >> Li) don't crush smaller elements.
  const scales = useMemo(() => {
    const s = {}
    Object.keys(ELEMENTS).forEach(el => {
      const mineMax = Math.max(
        1,
        ...MINES.map(m => m.output[el]?.[selectedYear] || 0),
      )
      const refMax = Math.max(
        0.01,
        ...REFINERIES.filter(r => r.elements.includes(el))
          .map(r => r.processes_pct[el] || 0),
      )
      const recMax = Math.max(
        1,
        ...RECYCLING_FACILITIES
          .filter(r => r.elements_recovered.includes(el))
          .map(r => r.capacity_tpa || 0),
      )
      s[el] = { mineMax, refMax, recMax }
    })
    return s
  }, [selectedYear])

  useEffect(() => {
    if (instanceRef.current) return
    const map = L.map(mapRef.current, {
      center: [15, 30],
      zoom: 3,
      zoomControl: true,
      attributionControl: true,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CartoDB',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)
    instanceRef.current = map
    return () => { map.remove(); instanceRef.current = null }
  }, [])

  useEffect(() => {
    const map = instanceRef.current
    if (!map) return

    Object.values(layersRef.current).flat().forEach(l => l.remove())
    layersRef.current = { mines: [], refineries: [], flows: [], recycling: [] }

    const elColor = ELEMENTS[activeElement]?.color || '#3b82f6'
    const unit = ELEMENTS[activeElement]?.unit || 'kt'
    const s = scales[activeElement] || { mineMax: 1, refMax: 1, recMax: 1 }

    // ── Mines (USGS MCS 2024) ──────────────────────────────────────────────
    if (filters.mines) {
      MINES.forEach(mine => {
        if (!mine.elements.includes(activeElement)) return
        if (filters.riskMin !== undefined && mine.risk < filters.riskMin) return
        const volume = mine.output[activeElement]?.[selectedYear] || 0
        if (volume <= 0) return

        const marker = L.marker([mine.lat, mine.lon], { icon: mineIcon(mine, volume, s.mineMax, elColor) })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:220px">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px">${mine.flag} ${mine.name}</div>
              <div style="color:#9ca3af;font-size:12px;margin-bottom:8px">${mine.country} · ${mine.type}</div>
              <div style="display:flex;gap:12px;margin-bottom:8px">
                <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase">Risk</div>
                  <div style="font-weight:600;color:${riskColor(mine.risk)}">${Math.round(mine.risk * 100)}%</div></div>
                <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase">${activeElement} · ${selectedYear}</div>
                  <div style="font-weight:600;color:${elColor}">${volume.toFixed(volume < 1 ? 2 : 1)} ${unit}</div></div>
                <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase">Certified</div>
                  <div style="font-weight:600;color:${mine.certified ? '#22c55e' : '#ef4444'}">${mine.certified ? 'Yes' : 'No'}</div></div>
              </div>
              <div style="font-size:11px;color:#d1d5db;line-height:1.4;margin-bottom:6px">${mine.notes}</div>
              <div style="font-size:9px;color:#6b7280;font-style:italic">source: ${mine.source}</div>
            </div>
          `, { maxWidth: 300 })
          .on('click', () => onNodeClick && onNodeClick({ type: 'mine', data: mine }))
        layersRef.current.mines.push(marker)
      })
    }

    // ── Refineries ─────────────────────────────────────────────────────────
    if (filters.refineries) {
      REFINERIES.forEach(ref => {
        if (!ref.elements.includes(activeElement)) return
        const pct = ref.processes_pct[activeElement] || 0
        if (pct <= 0) return
        const marker = L.marker([ref.lat, ref.lon], { icon: refineryIcon(pct, s.refMax) })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:220px">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px">${ref.flag} ${ref.name}</div>
              <div style="color:#9ca3af;font-size:12px;margin-bottom:6px">${ref.country}</div>
              <div style="font-size:11px;margin-bottom:6px">~<b>${Math.round(pct * 100)}%</b> of global ${activeElement} refining capacity</div>
              <div style="font-size:11px;color:#d1d5db;margin-bottom:6px">${ref.note}</div>
              <div style="font-size:9px;color:#6b7280;font-style:italic">source: ${ref.source}</div>
            </div>
          `)
        layersRef.current.refineries.push(marker)
      })
    }

    // ── Refinery-feedstock links (no invented volumes) ─────────────────────
    if (filters.flows) {
      TRADE_FLOWS.forEach(flow => {
        if (flow.element !== activeElement) return
        const fromCoord = getCoord(flow.from)
        const toCoord = getCoord(flow.to)
        if (!fromCoord || !toCoord) return

        const pts = arcPoints(fromCoord, toCoord)
        const line = L.polyline(pts, {
          color: elColor,
          weight: 2,
          opacity: 0.55,
          dashArray: '4 4',
        })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:220px">
              <div style="font-weight:700;margin-bottom:4px">${flow.from} → ${flow.to}</div>
              <div style="font-size:11px;color:#d1d5db;line-height:1.4">${flow.relation}</div>
              <div style="font-size:10px;color:#9ca3af;margin-top:6px">Volume: not publicly disclosed at site level</div>
            </div>
          `)
        layersRef.current.flows.push(line)
      })
    }

    // ── Recycling Facilities (announced capacity only) ─────────────────────
    if (filters.recycling) {
      RECYCLING_FACILITIES.forEach(rec => {
        if (!rec.elements_recovered.includes(activeElement)) return
        const cap = rec.capacity_tpa
        const capStr = cap ? `${cap.toLocaleString()} t/yr input` : 'not disclosed'
        const marker = L.marker([rec.lat, rec.lon], { icon: recyclingIcon(cap, s.recMax, rec.status) })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:240px">
              <div style="font-weight:700;font-size:14px;margin-bottom:2px">${rec.flag} ${rec.name}</div>
              <div style="color:#9ca3af;font-size:12px;margin-bottom:8px">${rec.country} · ♻ ${rec.status}</div>
              <div style="display:flex;gap:12px;margin-bottom:8px">
                <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase">Announced capacity</div>
                  <div style="font-weight:700;color:#10b981">${capStr}</div></div>
              </div>
              <div style="font-size:11px;color:#d1d5db;line-height:1.4;margin-bottom:6px">${rec.note}</div>
              <div style="font-size:9px;color:#6b7280;font-style:italic">source: ${rec.source}</div>
            </div>
          `, { maxWidth: 300 })
          .on('click', () => onNodeClick && onNodeClick({ type: 'recycling', data: rec }))
        layersRef.current.recycling.push(marker)
      })
    }
  }, [filters, selectedYear, activeElement, onNodeClick, scales])

  return (
    <>
      <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />
      {showTransport && instanceRef.current && (
        <TransportLayer
          map={instanceRef.current}
          activeElement={activeElement}
          showNodes={true}
          showLegs={true}
          riskFilter={transportRiskFilter}
        />
      )}
    </>
  )
}
