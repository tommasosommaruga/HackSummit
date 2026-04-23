/**
 * Compact MapLibre view for the Derisk page: company HQ + optional EU REE sites.
 */
import { useCallback, useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { haversineKm } from '../lib/deriskScore.js'

const OPENFREEMAP_DARK = 'https://tiles.openfreemap.org/styles/dark'

/** Regional view around HQ (two steps wider than a tight city zoom). */
const ZOOM_HQ_START = 3.9

const SRC_ID = 'derisk-geo'

function buildFeatures (company, showReePoints, reeList, linkTarget) {
  const out = /** @type {import('geojson').Feature[]} */ ([])
  if (!company || !Number.isFinite(company.lon) || !Number.isFinite(company.lat)) {
    return { type: 'FeatureCollection', features: out }
  }

  out.push({
    type: 'Feature',
    properties: { role: 'company', label: company.name || 'HQ' },
    geometry: { type: 'Point', coordinates: [company.lon, company.lat] },
  })

  if (showReePoints && Array.isArray(reeList)) {
    reeList.forEach((f) => {
      if (!Number.isFinite(f.lon) || !Number.isFinite(f.lat)) return
      out.push({
        type: 'Feature',
        properties: { role: 'ree', label: f.operator || 'REE' },
        geometry: { type: 'Point', coordinates: [f.lon, f.lat] },
      })
    })
  }

  if (
    linkTarget
    && Number.isFinite(linkTarget.lon)
    && Number.isFinite(linkTarget.lat)
  ) {
    out.push({
      type: 'Feature',
      properties: { role: 'link' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [company.lon, company.lat],
          [linkTarget.lon, linkTarget.lat],
        ],
      },
    })
  }

  return { type: 'FeatureCollection', features: out }
}

/** Map stays centered on HQ; zoom scales with how far REE sites are (keeps local context). */
function zoomForRadiusKm (maxKm) {
  if (maxKm <= 0) return ZOOM_HQ_START
  if (maxKm < 90) return 5.5
  if (maxKm < 220) return 4.7
  if (maxKm < 500) return 3.7
  if (maxKm < 1000) return 2.8
  if (maxKm < 2000) return 2.0
  return 2
}

function fitMap (map, company, showReePoints, reeList) {
  if (!map || !map.isStyleLoaded()) return
  const center = [company.lon, company.lat]

  if (!showReePoints || !Array.isArray(reeList) || reeList.length === 0) {
    try {
      map.easeTo({
        center,
        zoom: ZOOM_HQ_START,
        duration: 550,
        essential: true,
      })
    } catch { /* */ }
    return
  }

  let maxKm = 0
  reeList.forEach((f) => {
    if (!Number.isFinite(f.lon) || !Number.isFinite(f.lat)) return
    const d = haversineKm(company.lon, company.lat, f.lon, f.lat)
    if (d > maxKm) maxKm = d
  })
  const zoom = zoomForRadiusKm(maxKm)

  try {
    map.easeTo({
      center,
      zoom,
      duration: 600,
      essential: true,
    })
  } catch { /* */ }
}

/**
 * @param {{ company: { lon: number, lat: number, name: string } | null | undefined
 *   showReePoints: boolean
 *   reeList: { id?: string, lon: number, lat: number, operator?: string }[]
 *   linkToNearestRee: { lon: number, lat: number } | null | undefined }} p
 */
export default function DeriskMap ({
  company,
  showReePoints,
  reeList,
  linkToNearestRee,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const propsRef = useRef({ company, showReePoints, reeList, linkToNearestRee })
  propsRef.current = { company, showReePoints, reeList, linkToNearestRee }

  const syncData = useCallback(() => {
    const map = mapRef.current
    const p = propsRef.current
    if (!map || !p.company) return
    if (!map.isStyleLoaded()) {
      map.once('load', () => syncData())
      return
    }
    if (!map.getSource(SRC_ID)) {
      map.once('idle', () => syncData())
      return
    }
    const fc = buildFeatures(
      p.company,
      p.showReePoints,
      p.reeList,
      p.showReePoints && p.linkToNearestRee ? p.linkToNearestRee : null,
    )
    const s = map.getSource(SRC_ID)
    if (s && 'setData' in s) s.setData(fc)
    fitMap(map, p.company, p.showReePoints, p.reeList)
  }, [])

  const onPointer = useCallback((e) => {
    const m = mapRef.current
    if (!m || e.features?.length === 0) return
    const f = e.features[0]
    const role = f.properties?.role
    if (role !== 'company' && role !== 'ree') return
    const label = f.properties?.label || ''
    const safe = String(label).replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (popupRef.current) {
      try { popupRef.current.remove() } catch { /* */ }
    }
    const title = role === 'company' ? 'Headquarters' : 'REE site'
    popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '240px' })
      .setLngLat(f.geometry.coordinates)
      .setHTML(
        `<div style="font:12px/1.4 system-ui,sans-serif;color:#0f172a;padding:2px 0;"><b>${title}</b><br/>${safe}</div>`,
      )
      .addTo(m)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_DARK,
      center: [company.lon, company.lat],
      zoom: ZOOM_HQ_START,
      minZoom: 2,
      maxZoom: 16,
      pitch: 0,
      bearing: 0,
      dragRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      try {
        map.setProjection({ type: 'mercator' })
      } catch { /* */ }

      const empty = { type: 'FeatureCollection', features: [] }
      map.addSource(SRC_ID, { type: 'geojson', data: empty })

      map.addLayer({
        id: 'derisk-line',
        type: 'line',
        source: SRC_ID,
        filter: ['==', ['get', 'role'], 'link'],
        paint: {
          'line-color': 'rgba(45, 212, 191, 0.55)',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      })
      map.addLayer({
        id: 'derisk-ree-glow',
        type: 'circle',
        source: SRC_ID,
        filter: ['==', ['get', 'role'], 'ree'],
        paint: {
          'circle-radius': 18,
          'circle-color': 'rgba(52, 211, 153, 0.12)',
          'circle-blur': 0.6,
        },
      })
      map.addLayer({
        id: 'derisk-ree-pt',
        type: 'circle',
        source: SRC_ID,
        filter: ['==', ['get', 'role'], 'ree'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#34d399',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#0f172a',
        },
      })
      map.addLayer({
        id: 'derisk-hq-glow',
        type: 'circle',
        source: SRC_ID,
        filter: ['==', ['get', 'role'], 'company'],
        paint: {
          'circle-radius': 22,
          'circle-color': 'rgba(34, 211, 238, 0.2)',
          'circle-blur': 0.45,
        },
      })
      map.addLayer({
        id: 'derisk-hq-pt',
        type: 'circle',
        source: SRC_ID,
        filter: ['==', ['get', 'role'], 'company'],
        paint: {
          'circle-radius': 12,
          'circle-color': '#22d3ee',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0f172a',
        },
      })
      map.addLayer({
        id: 'derisk-labels',
        type: 'symbol',
        source: SRC_ID,
        filter: ['any', ['==', ['get', 'role'], 'company'], ['==', ['get', 'role'], 'ree']],
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-offset': [0, 1.15],
          'text-anchor': 'top',
          'text-max-width': 14,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#e2e8f0',
          'text-halo-color': '#0a0f1a',
          'text-halo-width': 1.2,
        },
        minzoom: 4.5,
      })

      map.on('click', 'derisk-hq-pt', onPointer)
      map.on('click', 'derisk-ree-pt', onPointer)
      map.on('mouseenter', 'derisk-hq-pt', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'derisk-hq-pt', () => { map.getCanvas().style.cursor = '' })
      map.on('mouseenter', 'derisk-ree-pt', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'derisk-ree-pt', () => { map.getCanvas().style.cursor = '' })

      syncData()
    })

    mapRef.current = map

    return () => {
      if (popupRef.current) {
        try { popupRef.current.remove() } catch { /* */ }
        popupRef.current = null
      }
      try { map.remove() } catch { /* */ }
      mapRef.current = null
    }
  }, [onPointer, syncData])

  useEffect(() => {
    syncData()
  }, [company, showReePoints, reeList, linkToNearestRee, syncData])

  useEffect(() => {
    const el = containerRef.current
    const map = mapRef.current
    if (!el || !map) return
    const ro = new ResizeObserver(() => {
      try { map.resize() } catch { /* */ }
    })
    ro.observe(el)
    return () => { ro.disconnect() }
  }, [company])

  return (
    <div className="derisk-map-box">
      <div
        ref={containerRef}
        className="derisk-map-canvas"
        role="img"
        aria-label="Map: headquarters and REE sites"
      />
      {company && (
        <div className="derisk-map-legend">
          <span className="derisk-map-legend-item derisk-map-legend-item--hq">
            <i aria-hidden>●</i>
            {' '}
            HQ
          </span>
          {showReePoints && (
            <span className="derisk-map-legend-item derisk-map-legend-item--ree">
              <i aria-hidden>●</i>
              {' '}
              REE
            </span>
          )}
        </div>
      )}
    </div>
  )
}
