import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MINES, REFINERIES, LAUNDERING_HUBS, TRADE_FLOWS } from '../data/mines.js'

// Fix default marker icons broken by bundlers
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

function mineIcon(mine) {
  const color = riskColor(mine.risk)
  const size = 14 + Math.round(mine.risk * 10)
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 0 8px ${color}88;
      display:flex;align-items:center;justify-content:center;
      font-size:8px;color:white;font-weight:700;
    ">${Math.round(mine.risk * 100)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function refineryIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;border-radius:4px;
      background:#8b5cf6;border:2px solid white;
      box-shadow:0 0 8px #8b5cf688;
      display:flex;align-items:center;justify-content:center;
      font-size:10px;
    ">🏭</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function hubIcon(surplus) {
  const size = 16 + Math.min(surplus / 3, 20)
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:#f97316;border:2px solid white;
      box-shadow:0 0 12px #f9731688;
      display:flex;align-items:center;justify-content:center;
      font-size:9px;
    ">⚠</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function getCoord(id) {
  const all = [...MINES, ...REFINERIES, ...LAUNDERING_HUBS]
  const node = all.find(n => n.id === id)
  return node ? [node.lat, node.lon] : null
}

// Great-circle arc points between two lat/lon pairs
function arcPoints(from, to, steps = 40) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    // Simple linear interp with a parabolic lift
    const lat = from[0] + (to[0] - from[0]) * t
    const lon = from[1] + (to[1] - from[1]) * t
    const lift = Math.sin(Math.PI * t) * 8  // arc height in degrees
    pts.push([lat + lift * 0.4, lon])
  }
  return pts
}

export default function SupplyMap({ filters, selectedYear, onNodeClick }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)
  const layersRef = useRef({ mines: [], refineries: [], hubs: [], flows: [] })

  // Init map once
  useEffect(() => {
    if (instanceRef.current) return
    const map = L.map(mapRef.current, {
      center: [15, 30],
      zoom: 3,
      zoomControl: true,
      attributionControl: true,
    })

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CartoDB',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    instanceRef.current = map
    return () => { map.remove(); instanceRef.current = null }
  }, [])

  // Re-draw markers and flows when filters/year change
  useEffect(() => {
    const map = instanceRef.current
    if (!map) return

    // Clear old layers
    Object.values(layersRef.current).flat().forEach(l => l.remove())
    layersRef.current = { mines: [], refineries: [], hubs: [], flows: [] }

    // ── Mines ──────────────────────────────────────────────────────────────
    if (filters.mines) {
      MINES.forEach(mine => {
        if (filters.riskMin !== undefined && mine.risk < filters.riskMin) return

        const marker = L.marker([mine.lat, mine.lon], { icon: mineIcon(mine) })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:200px">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px">${mine.flag} ${mine.name}</div>
              <div style="color:#9ca3af;font-size:12px;margin-bottom:8px">${mine.country} · ${mine.type}</div>
              <div style="display:flex;gap:12px;margin-bottom:8px">
                <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase">Risk</div>
                  <div style="font-weight:600;color:${riskColor(mine.risk)}">${Math.round(mine.risk * 100)}%</div></div>
                <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase">Output ${selectedYear}</div>
                  <div style="font-weight:600">${((mine.output[selectedYear] || 0) / 1000).toFixed(1)} kt</div></div>
                <div><div style="font-size:10px;color:#9ca3af;text-transform:uppercase">Certified</div>
                  <div style="font-weight:600;color:${mine.certified ? '#22c55e' : '#ef4444'}">${mine.certified ? 'Yes' : 'No'}</div></div>
              </div>
              <div style="font-size:11px;color:#d1d5db;line-height:1.4">${mine.notes}</div>
            </div>
          `, { maxWidth: 280 })
          .on('click', () => onNodeClick && onNodeClick({ type: 'mine', data: mine }))

        layersRef.current.mines.push(marker)
      })
    }

    // ── Refineries ─────────────────────────────────────────────────────────
    if (filters.refineries) {
      REFINERIES.forEach(ref => {
        const marker = L.marker([ref.lat, ref.lon], { icon: refineryIcon() })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px">${ref.flag} ${ref.name}</div>
              <div style="color:#9ca3af;font-size:12px;margin-bottom:6px">${ref.country}</div>
              <div style="font-size:11px">Processes ~<b>${Math.round(ref.processes_pct * 100)}%</b> of global Li supply</div>
            </div>
          `)
        layersRef.current.refineries.push(marker)
      })
    }

    // ── Laundering Hubs ────────────────────────────────────────────────────
    if (filters.hubs) {
      LAUNDERING_HUBS.forEach(hub => {
        const surplus = hub.surplus_kt[selectedYear] || 0
        if (surplus === 0) return
        const marker = L.marker([hub.lat, hub.lon], { icon: hubIcon(surplus) })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px">${hub.flag} ${hub.country}</div>
              <div style="color:#f97316;font-size:12px;margin-bottom:6px">⚠ Laundering Hub</div>
              <div style="display:flex;gap:12px;margin-bottom:6px">
                <div><div style="font-size:10px;color:#9ca3af">Surplus ${selectedYear}</div>
                  <div style="font-weight:700;color:#f97316">${surplus} kt</div></div>
              </div>
              <div style="font-size:11px;color:#d1d5db">${hub.note}</div>
            </div>
          `)
        layersRef.current.hubs.push(marker)

        // Pulsing circle
        const circle = L.circle([hub.lat, hub.lon], {
          radius: surplus * 12000,
          color: '#f97316',
          fillColor: '#f97316',
          fillOpacity: 0.08,
          weight: 1,
          dashArray: '6 4',
        }).addTo(map)
        layersRef.current.hubs.push(circle)
      })
    }

    // ── Trade Flow Arcs ────────────────────────────────────────────────────
    if (filters.flows) {
      TRADE_FLOWS.forEach(flow => {
        const fromCoord = getCoord(flow.from)
        const toCoord = getCoord(flow.to)
        if (!fromCoord || !toCoord) return

        if (filters.riskFlows && flow.risk === 'low') return

        const color = flow.risk === 'high' ? '#ef4444' : flow.risk === 'medium' ? '#eab308' : '#22c55e'
        const pts = arcPoints(fromCoord, toCoord)

        const line = L.polyline(pts, {
          color,
          weight: Math.max(1, Math.round(flow.volume_kt / 3)),
          opacity: 0.55,
          dashArray: flow.risk === 'high' ? '8 4' : null,
        })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif">
              <div style="font-weight:700;margin-bottom:4px">${flow.from} → ${flow.to}</div>
              <div style="font-size:12px;color:#9ca3af">Volume: <b>${flow.volume_kt} kt</b></div>
              <div style="font-size:12px;color:${color};text-transform:capitalize">${flow.risk} risk route</div>
            </div>
          `)

        layersRef.current.flows.push(line)
      })
    }
  }, [filters, selectedYear, onNodeClick])

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />
  )
}
