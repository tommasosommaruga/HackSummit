import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { TRANSPORT_NODES, TRANSPORT_LEGS } from '../data/transport.js'
import { ELEMENTS } from '../data/mines.js'

function modeColor(mode) {
  if (mode.includes('sea')) return '#3b82f6'
  if (mode.includes('rail')) return '#8b5cf6'
  return '#f97316'
}

function nodeIcon(node) {
  const icons = {
    mine_region: '⛏️',
    processing:  '🔩',
    port:        '⚓',
    refinery:    '🏭',
    gigafactory: '⚡',
  }
  const colors = {
    mine_region: '#ef4444',
    processing:  '#f97316',
    port:        '#3b82f6',
    refinery:    '#8b5cf6',
    gigafactory: '#22c55e',
  }
  const icon = icons[node.type] || '📍'
  const color = colors[node.type] || '#9ca3af'
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:6px;
      background:${color}22;border:2px solid ${color};
      display:flex;align-items:center;justify-content:center;
      font-size:14px;backdrop-filter:blur(4px);
      box-shadow:0 2px 8px ${color}44;
    ">${icon}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function arcPoints(fromLatLon, toLatLon, steps = 50) {
  const pts = []
  const dlat = toLatLon[0] - fromLatLon[0]
  const dlon = toLatLon[1] - fromLatLon[1]
  const dist = Math.sqrt(dlat * dlat + dlon * dlon)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const lat = fromLatLon[0] + dlat * t
    const lon = fromLatLon[1] + dlon * t
    const lift = Math.sin(Math.PI * t) * dist * 0.18
    pts.push([lat + lift, lon])
  }
  return pts
}

export default function TransportLayer({ map, activeElement, showNodes, showLegs, riskFilter }) {
  const layersRef = useRef([])

  useEffect(() => {
    if (!map) return
    layersRef.current.forEach(l => l.remove())
    layersRef.current = []

    const legs = TRANSPORT_LEGS.filter(leg =>
      leg.element.includes(activeElement) &&
      (riskFilter === 'all' || leg.laundering_risk >= (riskFilter === 'high' ? 0.5 : 0.25))
    )

    const usedNodeIds = new Set()
    legs.forEach(l => { usedNodeIds.add(l.from); usedNodeIds.add(l.to) })

    // ── Draw legs ──────────────────────────────────────────────────────────
    if (showLegs) {
      legs.forEach(leg => {
        const fromNode = TRANSPORT_NODES[leg.from]
        const toNode = TRANSPORT_NODES[leg.to]
        if (!fromNode || !toNode) return

        const color = leg.laundering_risk >= 0.5
          ? '#ef4444'
          : leg.laundering_risk >= 0.25
            ? '#eab308'
            : modeColor(leg.mode)

        const pts = arcPoints([fromNode.lat, fromNode.lon], [toNode.lat, toNode.lon])

        const line = L.polyline(pts, {
          color,
          weight: Math.max(1.5, 4 - leg.opacity_score * 3),
          opacity: 0.7,
          dashArray: leg.mode.includes('sea') ? null : '8 5',
        }).addTo(map).bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:240px">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">
              ${fromNode.name} → ${toNode.name}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
              <span style="font-size:11px;background:#1f2937;padding:2px 7px;border-radius:4px">
                ${leg.mode.replace('_',' ')}
              </span>
              <span style="font-size:11px;background:#1f2937;padding:2px 7px;border-radius:4px">
                ${leg.km.toLocaleString()} km
              </span>
              ${leg.avg_transit_days ? `<span style="font-size:11px;background:#1f2937;padding:2px 7px;border-radius:4px">~${leg.avg_transit_days}d</span>` : ''}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
              <div style="background:#111827;border-radius:6px;padding:6px">
                <div style="font-size:9px;color:#6b7280;text-transform:uppercase">Audit Opacity</div>
                <div style="font-weight:700;color:${leg.opacity_score > 0.6 ? '#ef4444' : leg.opacity_score > 0.3 ? '#eab308' : '#22c55e'}">
                  ${Math.round(leg.opacity_score * 100)}%
                </div>
              </div>
              <div style="background:#111827;border-radius:6px;padding:6px">
                <div style="font-size:9px;color:#6b7280;text-transform:uppercase">Laundering Risk</div>
                <div style="font-weight:700;color:${leg.laundering_risk > 0.5 ? '#ef4444' : leg.laundering_risk > 0.25 ? '#eab308' : '#22c55e'}">
                  ${Math.round(leg.laundering_risk * 100)}%
                </div>
              </div>
            </div>
            <div style="font-size:11px;color:#d1d5db;margin-bottom:6px;line-height:1.4">
              <b>Via:</b> ${leg.transit_countries.join(' → ')}
            </div>
            <div style="font-size:11px;color:#9ca3af;line-height:1.4">${leg.notes}</div>
            ${leg.source ? `<div style="font-size:10px;color:#6b7280;margin-top:6px;font-style:italic">Source: ${leg.source}</div>` : ''}
          </div>
        `, { maxWidth: 300 })

        layersRef.current.push(line)
      })
    }

    // ── Draw nodes ─────────────────────────────────────────────────────────
    if (showNodes) {
      usedNodeIds.forEach(id => {
        const node = TRANSPORT_NODES[id]
        if (!node) return
        const marker = L.marker([node.lat, node.lon], { icon: nodeIcon(node) })
          .addTo(map)
          .bindTooltip(`${node.name}`, { permanent: false, direction: 'top', className: 'transport-tooltip' })
        layersRef.current.push(marker)
      })
    }

    return () => {
      layersRef.current.forEach(l => l.remove())
    }
  }, [map, activeElement, showNodes, showLegs, riskFilter])

  return null
}
