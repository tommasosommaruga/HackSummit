import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Color by production status — this is the single most actionable dimension
// (who is, was, or could be producing REE). Matches the reetracker scheme.
export const STATUS_COLORS = {
  'Producer':                 '#ef4444',
  'Producer(?)':              '#ef4444',
  'Past producer':            '#f97316',
  'Past producer(?)':         '#f97316',
  'Byproduct producer':       '#eab308',
  'Byproduct producer(?)':    '#eab308',
  'Past byproduct producer':  '#a16207',
  'Past byproduct producer(?)':'#a16207',
  'No production':            '#3b82f6',
  'No production(?)':         '#3b82f6',
  'No produciton(?)':         '#3b82f6',  // USGS typo preserved in source
  'No Production':            '#3b82f6',
  'Not known':                '#6b7280',
}

function colorFor(p) {
  return STATUS_COLORS[p] || '#6b7280'
}

export default function REEMap({ occurrences, onSelect }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    if (instanceRef.current) return
    // preferCanvas is critical — SVG rendering 3k+ markers chokes.
    const map = L.map(mapRef.current, {
      center: [20, 10],
      zoom: 2,
      worldCopyJump: true,
      zoomControl: true,
      preferCanvas: true,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CartoDB · data: USGS Global REE DB',
      subdomains: 'abcd',
      maxZoom: 12,
    }).addTo(map)
    instanceRef.current = map
    return () => { map.remove(); instanceRef.current = null }
  }, [])

  useEffect(() => {
    const map = instanceRef.current
    if (!map) return
    if (layerRef.current) {
      layerRef.current.clearLayers()
      layerRef.current.remove()
    }
    const canvas = L.canvas({ padding: 0.5 })
    const group = L.layerGroup()

    occurrences.forEach(o => {
      const color = colorFor(o.pstatus)
      const isProducer = o.pstatus && o.pstatus.toLowerCase().includes('producer') && !o.pstatus.toLowerCase().includes('past')
      const radius = isProducer ? 6 : (o.status === 'Deposit' ? 4 : 2.5)

      // Inferred points (USGS didn't record lat/lon — placed at state or country
      // centroid) render hollow so users can tell them apart from exact points.
      const isInferred = o.precision && o.precision !== 'exact'
      const fillColor = isInferred ? 'transparent' : color
      const stroke = isInferred ? color : '#0f172a'
      const strokeWeight = isInferred ? 1.2 : (isProducer ? 1.5 : 0.5)
      const fillOpacity = isInferred ? 0 : (o.status === 'Showing' ? 0.55 : 0.85)
      const strokeOpacity = isInferred ? 0.75 : 1

      const m = L.circleMarker([o.lat, o.lon], {
        renderer: canvas,
        radius,
        color: stroke,
        weight: strokeWeight,
        opacity: strokeOpacity,
        fillColor,
        fillOpacity,
      })
      m.on('click', () => onSelect && onSelect(o))
      const tip = isInferred
        ? `${o.name || `#${o.id}`} · inferred (${o.precision})`
        : (o.name || `#${o.id}`)
      m.bindTooltip(tip, { direction: 'top', opacity: 0.9, offset: [0, -4] })
      group.addLayer(m)
    })

    group.addTo(map)
    layerRef.current = group
  }, [occurrences, onSelect])

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
}
