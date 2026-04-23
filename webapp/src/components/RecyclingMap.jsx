/**
 * Recycling facilities map — OpenFreeMap dark, Mercator only, default Europe 2D.
 * Cluster toggle: grouped markers at low zoom vs every facility + glyph.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { addSupplyChainGlyphs } from '../lib/supplyChainMapIcons.js'
import { escapeHtml, escapeHtmlAttr } from '../lib/recyclingData.js'

const OPENFREEMAP_DARK = 'https://tiles.openfreemap.org/styles/dark'
const TERRAIN_ID = 'mapterhorn-dem'
const TERRAIN_URL = 'https://tiles.mapterhorn.com/tilejson.json'
const OMT = 'openmaptiles'

/** Default camera: Western/Central Europe, 2D (recycling page only; no globe). */
const EU_RECYCLING_VIEW = { center: [10.5, 50.2], zoom: 4.2, pitch: 0, bearing: 0 }
const MAP_INSET = { top: 32, bottom: 96, left: 12, right: 200 }

const CALM_BASEMAP_EXTRA_IDS = new Set([
  'waterway', 'water_name', 'boundary_state', 'landuse_residential',
])

function calmBasemapLayerHidden2D (layerId) {
  if (layerId.startsWith('rec-')) return false
  if (CALM_BASEMAP_EXTRA_IDS.has(layerId)) return true
  if (/^(highway_|road_)/.test(layerId)) return true
  if (/^railway/.test(layerId)) return true
  if (/^aeroway/.test(layerId)) return true
  if (layerId.startsWith('place_')) return true
  return false
}

function applyCalmBasemap2D (map, calm2d) {
  if (map?.isStyleLoaded?.() === false) return
  try {
    const layers = map.getStyle()?.layers
    if (!layers) return
    for (const { id } of layers) {
      if (id.startsWith('rec-')) continue
      if (!map.getLayer(id)) continue
      if (!calmBasemapLayerHidden2D(id)) continue
      try {
        map.setLayoutProperty(id, 'visibility', calm2d ? 'none' : 'visible')
      } catch { /* */ }
    }
  } catch (e) {
    console.warn('applyCalmBasemap2D (recycling)', e)
  }
}

function applyBaseStyle (map) {
  try {
    map.setProjection({ type: 'mercator' })
  } catch (e) {
    console.warn(e)
  }
  if (!map.getSource(TERRAIN_ID)) {
    try {
      map.addSource(TERRAIN_ID, { type: 'raster-dem', url: TERRAIN_URL, tileSize: 512 })
      map.setTerrain({ source: TERRAIN_ID, exaggeration: 1 })
    } catch (e) {
      console.warn('terrain', e)
    }
  }
  try {
    map.setSky({
      'sky-color': '#0a0e18',
      'horizon-color': '#0f1525',
      'fog-color': '#04060c',
      'sky-horizon-blend': 0.08,
      'horizon-fog-blend': 0.2,
      'fog-ground-blend': 0.06,
    })
  } catch { /* */ }
  if (map.getLayer('building') && !map.getLayer('rec-building-3d')) {
    try {
      map.addLayer({
        id: 'rec-building-3d',
        type: 'fill-extrusion',
        source: OMT,
        'source-layer': 'building',
        minzoom: 12,
        filter: ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
        paint: {
          'fill-extrusion-color': '#0a0a0a',
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 8],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
          'fill-extrusion-opacity': 0.85,
        },
      }, 'aeroway-taxiway')
      map.setLayoutProperty('building', 'visibility', 'none')
    } catch (e) {
      console.warn('buildings 3d', e)
    }
  }
}

/**
 * @param {{ type: 'FeatureCollection', features: any[] }} geojson
 * @param {string | null} [commonSourceText]
 * @param {string} [mapFooterNote]
 */
export default function RecyclingMap ({
  geojson,
  onPointClick = () => {},
  commonSourceText = null,
  mapFooterNote = '',
}) {
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const onPointClickRef = useRef(onPointClick)
  onPointClickRef.current = onPointClick
  const commonSourceTextRef = useRef(commonSourceText)
  const mapFooterNoteRef = useRef(mapFooterNote)
  useEffect(() => { commonSourceTextRef.current = commonSourceText }, [commonSourceText])
  useEffect(() => { mapFooterNoteRef.current = mapFooterNote }, [mapFooterNote])

  const [mapLoaded, setMapLoaded] = useState(false)
  /** true = cluster circles at low zoom; false = every facility + icon */
  const [clusterOn, setClusterOn] = useState(true)
  const clusterOnRef = useRef(true)
  useEffect(() => { clusterOnRef.current = clusterOn }, [clusterOn])

  const setClusterMode = useCallback((on) => {
    setClusterOn(v => (v === on ? v : on))
  }, [])

  const resetCamera = () => {
    const m = mapRef.current
    if (!m || m.isStyleLoaded() === false) return
    try { m.stop() } catch { /* */ }
    m.easeTo({
      center: EU_RECYCLING_VIEW.center,
      zoom: EU_RECYCLING_VIEW.zoom,
      pitch: 0,
      bearing: 0,
      duration: 550,
    })
  }

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: mapEl.current,
      style: OPENFREEMAP_DARK,
      center: EU_RECYCLING_VIEW.center,
      zoom: EU_RECYCLING_VIEW.zoom,
      minZoom: 0.4,
      maxZoom: 20,
      minPitch: 0,
      maxPitch: 0,
      pitch: 0,
      bearing: 0,
      bearingSnap: 4,
      interactive: true,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchZoomRotate: true,
      touchPitch: false,
      dragPan: {
        linearity: 0.22,
        maxSpeed: 1500,
        deceleration: 2300,
      },
    })
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: false, showCompass: false }),
      'top-right',
    )

    map.on('load', () => {
      map.resize()
      try {
        map.setPadding(MAP_INSET)
        map.resize()
      } catch (e) {
        console.warn('setPadding', e)
      }
      applyBaseStyle(map)
      try {
        map.setProjection({ type: 'mercator' })
        map.setMaxPitch(0)
      } catch (e) {
        console.warn(e)
      }
      addSupplyChainGlyphs(map)
      const empty = { type: 'FeatureCollection', features: [] }

      if (!map.getSource('rec-fac')) {
        map.addSource('rec-fac', { type: 'geojson', data: empty })
        map.addLayer({
          id: 'rec-fac-pt',
          type: 'circle',
          source: 'rec-fac',
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 12.5,
            'circle-stroke-color': '#0f172a',
            'circle-stroke-width': 1.35,
            'circle-opacity': ['get', 'op'],
          },
        })
        map.addLayer({
          id: 'rec-fac-sym',
          type: 'symbol',
          source: 'rec-fac',
          layout: {
            'icon-image': [
              'match', ['get', 'iconKey'],
              'refinery', 'sc-glyph-refinery',
              'mine', 'sc-glyph-mine',
              'project', 'sc-glyph-project',
              'magnet_maker', 'sc-glyph-magnet_maker',
              'oem', 'sc-glyph-oem',
              'reseller', 'sc-glyph-reseller',
              'sc-glyph-refinery',
            ],
            'icon-size': 0.66,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-pitch-alignment': 'map',
            'icon-rotation-alignment': 'map',
          },
          paint: { 'icon-opacity': ['get', 'op'] },
        })
      }

      if (!map.getSource('rec-fac-cl')) {
        map.addSource('rec-fac-cl', {
          type: 'geojson',
          data: empty,
          cluster: true,
          clusterMaxZoom: 12,
          clusterRadius: 56,
        })
        map.addLayer({
          id: 'rec-clusters',
          type: 'circle',
          source: 'rec-fac-cl',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': 'rgba(99, 102, 241, 0.4)',
            'circle-stroke-color': 'rgba(129, 140, 248, 0.4)',
            'circle-stroke-width': 1.2,
            'circle-radius': [
              'step', ['get', 'point_count'], 14, 10, 18, 50, 24,
            ],
          },
        })
        map.addLayer({
          id: 'rec-cluster-lbl',
          type: 'symbol',
          source: 'rec-fac-cl',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 10,
          },
          paint: { 'text-color': '#e0e7ff' },
        })
        map.addLayer({
          id: 'rec-uc-pt',
          type: 'circle',
          source: 'rec-fac-cl',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 12.5,
            'circle-stroke-color': '#0f172a',
            'circle-stroke-width': 1.35,
            'circle-opacity': ['get', 'op'],
          },
        })
        map.addLayer({
          id: 'rec-uc-sym',
          type: 'symbol',
          source: 'rec-fac-cl',
          filter: ['!', ['has', 'point_count']],
          layout: {
            'icon-image': [
              'match', ['get', 'iconKey'],
              'refinery', 'sc-glyph-refinery',
              'mine', 'sc-glyph-mine',
              'project', 'sc-glyph-project',
              'magnet_maker', 'sc-glyph-magnet_maker',
              'oem', 'sc-glyph-oem',
              'reseller', 'sc-glyph-reseller',
              'sc-glyph-refinery',
            ],
            'icon-size': 0.66,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-pitch-alignment': 'map',
            'icon-rotation-alignment': 'map',
          },
          paint: { 'icon-opacity': ['get', 'op'] },
        })
      }

      const showPopup = (p, coords) => {
        let urls = []
        try {
          urls = JSON.parse(p.detailUrlsJson || '[]')
        } catch { /* */ }
        if (!Array.isArray(urls)) urls = []
        const src = (p.source || '').trim()
        const common = (commonSourceTextRef.current != null
          ? String(commonSourceTextRef.current).trim()
          : '')
        const hideSourceInPopup = Boolean(src && common && src === common)
        const sourceRow = src && !hideSourceInPopup
          ? `<div><dt>Source</dt><dd>${escapeHtml(src)}</dd></div>`
          : ''
        const linksBlock = urls.length
          ? `<div class="rec-popup-webref"><div class="rec-popup-dt">Web references</div><ul>${
            urls.map(u => `<li><a href="${escapeHtmlAttr(u)}" target="_blank" rel="noopener noreferrer">${escapeHtml(u)}</a></li>`).join('')
          }</ul></div>`
          : ''
        const baseNote = (mapFooterNoteRef.current && String(mapFooterNoteRef.current).trim())
          || 'From recycling_facilities_cleaned.xlsx.'
        const footText = baseNote + (hideSourceInPopup
          ? ' Shared citation: see “Data sources” under the map.'
          : '')
        const meta = p.isMetallurgy === '1' && p.metallurgyName
          ? `<div><dt>Refining</dt><dd>${escapeHtml(p.metallurgyName)}</dd></div>`
          : ''
        const html = `
          <div class="rec-popup">
            <div class="rec-popup-title">${escapeHtml(p.operator)}</div>
            <dl>
              <div><dt>Country</dt><dd>${escapeHtml(p.country)}</dd></div>
              <div><dt>City</dt><dd>${escapeHtml(p.city)}</dd></div>
              <div><dt>Type (file)</dt><dd>${escapeHtml(p.typeRaw || '—')}</dd></div>
              ${meta}
              ${sourceRow}
              <div><dt>Details</dt><dd>${escapeHtml(p.details)}</dd></div>
            </dl>
            ${linksBlock}
            <p class="rec-popup-foot">${escapeHtml(footText)}</p>
          </div>`
        new maplibregl.Popup({ maxWidth: '360px' })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map)
      }
      const clickPoint = (e) => {
        const f = e.features?.[0]
        if (!f) return
        onPointClickRef.current(f.properties)
        showPopup(f.properties, f.geometry.coordinates)
      }

      map.on('click', 'rec-fac-pt', clickPoint)
      map.on('click', 'rec-uc-pt', clickPoint)
      map.on('click', 'rec-clusters', async (e) => {
        const f = e.features?.[0]
        if (!f) return
        const clSrc = map.getSource('rec-fac-cl')
        try {
          const z = await clSrc.getClusterExpansionZoom(f.properties.cluster_id)
          map.easeTo({ center: f.geometry.coordinates, zoom: z + 0.45, duration: 360 })
        } catch (err) {
          console.warn('cluster zoom', err)
        }
      })

      for (const id of [
        'rec-fac-pt', 'rec-fac-sym', 'rec-uc-pt', 'rec-uc-sym', 'rec-clusters', 'rec-cluster-lbl',
      ]) {
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = '' })
      }

      const reapply = () => {
        if (map.isStyleLoaded() === false) return
        applyCalmBasemap2D(map, true)
      }
      map.on('styledata', (e) => {
        if (e.dataType !== 'style') return
        reapply()
      })
      queueMicrotask(reapply)

      // Initial: show clusters, hide flat (matches default state)
      const vCluster = clusterOnRef.current ? 'visible' : 'none'
      const vFlat = clusterOnRef.current ? 'none' : 'visible'
      for (const id of ['rec-clusters', 'rec-cluster-lbl', 'rec-uc-pt', 'rec-uc-sym']) {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vCluster)
      }
      for (const id of ['rec-fac-pt', 'rec-fac-sym']) {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vFlat)
      }

      mapRef.current = map
      setMapLoaded(true)
    })
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const vCluster = clusterOn ? 'visible' : 'none'
    const vFlat = clusterOn ? 'none' : 'visible'
    for (const id of ['rec-clusters', 'rec-cluster-lbl', 'rec-uc-pt', 'rec-uc-sym']) {
      try {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vCluster)
      } catch { /* */ }
    }
    for (const id of ['rec-fac-pt', 'rec-fac-sym']) {
      try {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vFlat)
      } catch { /* */ }
    }
  }, [clusterOn, mapLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const fc = geojson || { type: 'FeatureCollection', features: [] }
    try {
      map.getSource('rec-fac')?.setData(fc)
      map.getSource('rec-fac-cl')?.setData(fc)
    } catch (e) {
      console.warn('recycling setData', e)
    }
  }, [geojson, mapLoaded])

  return (
    <div className="supply-chain-map recycling-map-wrap">
      <div ref={mapEl} className="sc-map-canvas" />
      <div className="sc-map-toolbar" role="toolbar" aria-label="Map controls">
        <div
          className="sc-map-seg sc-map-seg--cluster"
          role="group"
          aria-label="Point display"
          title="Clusters: cleaner at country scale. Each facility: all icons + labels when zoomed."
        >
          <button
            type="button"
            className={clusterOn ? 'sc-tb is-on' : 'sc-tb'}
            aria-pressed={clusterOn}
            onClick={() => setClusterMode(true)}
          >Clusters
          </button>
          <button
            type="button"
            className={!clusterOn ? 'sc-tb is-on' : 'sc-tb'}
            aria-pressed={!clusterOn}
            onClick={() => setClusterMode(false)}
          >Each facility
          </button>
        </div>
        <button type="button" className="sc-map-reset" onClick={resetCamera} title="Europe · 2D view">
          Europe
        </button>
      </div>
      <p className="sc-map-hint">
        2D · drag: pan
        <span className="sc-map-hint-sep" aria-hidden>·</span>
        scroll: zoom
        <span className="sc-map-hint-sep" aria-hidden>·</span>
        <span className="recycling-hint-geo">Start: Europe</span>
      </p>
    </div>
  )
}
