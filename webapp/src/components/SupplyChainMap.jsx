/**
 * SupplyChainMap — MapLibre GL JS with native GeoJSON layers so points/lines
 * follow globe projection (see maplibre.org globe examples: data lives in the map).
 * 3D = spherical globe; 2D = Web Mercator (flat). deck.gl is not used here
 * to avoid WebMercator vs globe mismatch.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  NODE_TYPES,
  MATERIAL_COLORS,
  colorForNode,
  usgsIdFromNodeId,
} from '../lib/nodeTypeConfig.js'
import { greatCirclePath } from '../lib/greatCirclePath.js'
import { addSupplyChainGlyphs } from '../lib/supplyChainMapIcons.js'

const OPENFREEMAP_DARK = 'https://tiles.openfreemap.org/styles/dark'
const TERRAIN_ID = 'mapterhorn-dem'
const TERRAIN_URL = 'https://tiles.mapterhorn.com/tilejson.json'
const OMT = 'openmaptiles'

/** OpenFreeMap dark style: in 2D, hide all basemap names (countries, regions, cities) + transport noise. */
const CALM_BASEMAP_EXTRA_IDS = new Set([
  'waterway', 'water_name', 'boundary_state', 'landuse_residential',
])

function calmBasemapLayerHidden2D (layerId) {
  if (layerId.startsWith('sc-')) return false
  if (CALM_BASEMAP_EXTRA_IDS.has(layerId)) return true
  if (/^(highway_|road_)/.test(layerId)) return true
  if (/^railway/.test(layerId)) return true
  if (/^aeroway/.test(layerId)) return true
  if (layerId.startsWith('place_')) return true
  return false
}

/** 2D Mercator: thinner basemap so supply-chain data reads clearly. 3D globe: full OpenFreeMap detail. */
function applyCalmBasemap2D (map, calm2d) {
  // MapLibre: isStyleLoaded() is boolean | void; `!void` must not skip a valid style.
  if (map?.isStyleLoaded?.() === false) return
  try {
    const layers = map.getStyle()?.layers
    if (!layers) return
    for (const { id } of layers) {
      if (id.startsWith('sc-')) continue
      if (!map.getLayer(id)) continue
      if (!calmBasemapLayerHidden2D(id)) continue
      try {
        map.setLayoutProperty(id, 'visibility', calm2d ? 'none' : 'visible')
      } catch { /* */ }
    }
  } catch (e) {
    console.warn('applyCalmBasemap2D', e)
  }
}

const INFERRED = '#fbbf24'

/**
 * World-centered camera (0° meridian, north up) for symmetric, predictable rotation.
 * Ctrl+drag or right-drag adjusts pitch & bearing.
 */
const GLOBE_VIEW = { center: [0, 12], zoom: 1.38, pitch: 48, bearing: 0 }
const MERCATOR_VIEW = { center: [0, 12], zoom: 1.95, pitch: 0, bearing: 0 }

/** Pads the map transform so the globe sits visually centered above bottom/right overlays (legend, controls). */
const MAP_INSET = { top: 32, bottom: 96, left: 12, right: 188 }

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
  if (map.getLayer('building') && !map.getLayer('sc-building-3d')) {
    try {
      map.addLayer({
        id: 'sc-building-3d',
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

export default function SupplyChainMap ({
  nodes,
  edges,
  byId,
  highlighted = null,
  onNodeClick = () => {},
  typeVisible = {
    deposit: true, project: true, mine: true, refinery: true,
    magnet_maker: true, oem: true, reseller: true,
  },
}) {
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const byIdRef = useRef(byId)
  const onNodeClickRef = useRef(onNodeClick)
  byIdRef.current = byId
  onNodeClickRef.current = onNodeClick
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mode, setMode] = useState('2d') // '3d' = globe, '2d' = mercator (default)
  /** Cluster USGS deposit points at low zoom vs show every point (both use the same data) */
  const [depositCluster, setDepositCluster] = useState(true)
  const [hover, setHover] = useState(null)
  /** Last view we applied; null until first run so we don’t reset camera on mount. */
  const lastAppliedViewRef = useRef(null)
  const modeRef = useRef('2d')
  useEffect(() => { modeRef.current = mode }, [mode])

  const setViewMode = (next) => {
    setMode(m => (m === next ? m : next))
  }

  const resetCamera = () => {
    const m = mapRef.current
    if (!m || m.isStyleLoaded() === false) return
    try { m.stop() } catch { /* */ }
    const v = mode === '3d' ? GLOBE_VIEW : MERCATOR_VIEW
    m.easeTo({
      center: v.center,
      zoom: v.zoom,
      pitch: v.pitch,
      bearing: v.bearing,
      duration: 550,
    })
  }

  const isHi = n => !highlighted || highlighted.has(n.id)
  const confA = n => n.confidence === 'inferred' ? 0.55 : 1
  const nodeColor = n => n.confidence === 'inferred' ? INFERRED : colorForNode(n)
  const nodeOpacity = n => {
    const base = isHi(n) ? 0.95 : 0.28
    return Math.round(base * 255 * confA(n)) / 255
  }

  const edgeTypeVisible = useMemo(() => ({
    ...typeVisible,
    deposit: typeVisible.deposit ?? typeVisible.mine,
    project: typeVisible.project ?? typeVisible.mine,
  }), [typeVisible])

  const visibleNodeIds = useMemo(() => new Set(nodes.map(n => n.id)), [nodes])

  const { depositsData, facilitiesData, edgesData } = useMemo(() => {
    const dFeatures = []
    const fFeatures = []
    for (const n of nodes) {
      if (!n.geocoded || n.lat == null) continue
      if (!typeVisible[n.type]) continue
      const color = nodeColor(n)
      const op = nodeOpacity(n)
      const f = {
        type: 'Feature',
        id: n.id,
        properties: {
          id: n.id,
          t: n.type,
          name: n.name || '',
          country: n.country || '',
          color,
          op,
        },
        geometry: { type: 'Point', coordinates: [n.lng, n.lat] },
      }
      if (n.type === 'deposit') dFeatures.push(f)
      else fFeatures.push(f)
    }

    const eFeatures = []
    for (const e of edges) {
      const a = byId.get(e.from_id)
      const b = byId.get(e.to_id)
      if (!a || !b || a.lat == null || b.lat == null) continue
      if (!visibleNodeIds.has(a.id) || !visibleNodeIds.has(b.id)) continue
      const vis = t => edgeTypeVisible[t] !== false
      if (!vis(a.type) || !vis(b.type)) continue
      if (highlighted && !(highlighted.has(a.id) && highlighted.has(b.id))) continue
      const from = a
      const to = b
      const base = e.confidence === 'inferred'
        ? INFERRED
        : (MATERIAL_COLORS[e.material] || MATERIAL_COLORS.unknown)
      const alpha = e.confidence === 'inferred' ? 0.55 : (e.probable ? 0.65 : 0.9)
      const w = (() => {
        const v = e.volume_tons_per_year
        return v ? Math.max(1, Math.min(3.6, Math.log10(v + 1) * 0.72)) : 1.35
      })()
      const wFinal = (e.probable || e.confidence === 'inferred') ? w * 0.8 : w
      const path = greatCirclePath(from, to, 40)
      eFeatures.push({
        type: 'Feature',
        properties: {
          id: e.id,
          c: base,
          w: wFinal,
          a: alpha,
          dashed: !!(e.probable || e.confidence === 'inferred'),
        },
        geometry: { type: 'LineString', coordinates: path },
      })
    }
    return {
      depositsData: { type: 'FeatureCollection', features: dFeatures },
      facilitiesData: { type: 'FeatureCollection', features: fFeatures },
      edgesData: { type: 'FeatureCollection', features: eFeatures },
    }
  }, [nodes, edges, byId, typeVisible, edgeTypeVisible, highlighted, visibleNodeIds])

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: mapEl.current,
      style: OPENFREEMAP_DARK,
      center: MERCATOR_VIEW.center,
      zoom: MERCATOR_VIEW.zoom,
      minZoom: 0.4,
      maxZoom: 20,
      minPitch: 0,
      maxPitch: 85,
      pitch: MERCATOR_VIEW.pitch,
      bearing: MERCATOR_VIEW.bearing,
      /** Snap to north when you’re only a few degrees off — makes rotation feel cleaner */
      bearingSnap: 4,
      interactive: true,
      attributionControl: { compact: true },
      // Ctrl+left drag (or right mouse drag): rotate + tilt. Pan = drag without modifier.
      dragRotate: true,
      pitchWithRotate: true,
      touchZoomRotate: true,
      touchPitch: true,
      /** Smoother inertial pan */
      dragPan: {
        linearity: 0.22,
        maxSpeed: 1500,
        deceleration: 2300,
      },
    })
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }),
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
      if (!map.getSource('sc-edges')) {
        map.addSource('sc-edges', { type: 'geojson', data: empty })
        map.addLayer({
          id: 'sc-edges-solid',
          type: 'line',
          source: 'sc-edges',
          filter: ['!=', ['get', 'dashed'], true],
          paint: {
            'line-color': ['get', 'c'],
            'line-width': ['get', 'w'],
            'line-opacity': ['get', 'a'],
          },
        })
        map.addLayer({
          id: 'sc-edges-dashed',
          type: 'line',
          source: 'sc-edges',
          filter: ['==', ['get', 'dashed'], true],
          paint: {
            'line-color': ['get', 'c'],
            'line-width': ['get', 'w'],
            'line-opacity': ['get', 'a'],
            'line-dasharray': [2, 2],
          },
        })
      }
      if (!map.getSource('sc-deposits')) {
        map.addSource('sc-deposits', {
          type: 'geojson',
          data: empty,
          cluster: true,
          clusterMaxZoom: 10,
          // Slightly larger radius → fewer tiny clusters at world scale (less visual noise)
          clusterRadius: 64,
        })
        map.addLayer({
          id: 'sc-clusters',
          type: 'circle',
          source: 'sc-deposits',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': 'rgba(99, 102, 241, 0.38)',
            'circle-stroke-color': 'rgba(129, 140, 248, 0.35)',
            'circle-stroke-width': 1.2,
            'circle-radius': [
              'step', ['get', 'point_count'], 12, 10, 16, 50, 22,
            ],
          },
        })
        map.addLayer({
          id: 'sc-cluster-lbl',
          type: 'symbol',
          source: 'sc-deposits',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 10,
          },
          paint: { 'text-color': '#e0e7ff' },
        })
        /** Deposit dots: small at global zoom, slightly larger when zoomed in (readability + hit target). */
        const depositRadius = [
          'interpolate', ['linear'], ['zoom'],
          0, 1.5,
          1.2, 1.85,
          2, 2.2,
          3.5, 2.65,
          5, 2.95,
          7, 3.35,
          9, 3.7,
          11, 4,
        ]
        map.addLayer({
          id: 'sc-dep-uncl',
          type: 'circle',
          source: 'sc-deposits',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': depositRadius,
            'circle-stroke-color': 'rgba(15, 23, 42, 0.35)',
            'circle-stroke-width': 0.45,
            'circle-opacity': ['get', 'op'],
          },
        })
        map.addSource('sc-deposits-flat', { type: 'geojson', data: empty })
        map.addLayer({
          id: 'sc-dep-uncl-f',
          type: 'circle',
          source: 'sc-deposits-flat',
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': depositRadius,
            'circle-stroke-color': 'rgba(15, 23, 42, 0.35)',
            'circle-stroke-width': 0.45,
            'circle-opacity': ['get', 'op'],
          },
        })
        map.setLayoutProperty('sc-dep-uncl-f', 'visibility', 'none')
      }
      if (!map.getSource('sc-fac')) {
        map.addSource('sc-fac', { type: 'geojson', data: empty })
        map.addLayer({
          id: 'sc-fac-pt',
          type: 'circle',
          source: 'sc-fac',
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': [
              'match', ['get', 't'], 'mine', 15, 'project', 13, 'refinery', 13, 11.5,
            ],
            'circle-stroke-color': '#0f172a',
            'circle-stroke-width': 1.35,
            'circle-opacity': ['get', 'op'],
          },
        })
        map.addLayer({
          id: 'sc-fac-sym',
          type: 'symbol',
          source: 'sc-fac',
          layout: {
            'icon-image': [
              'match', ['get', 't'],
              'mine', 'sc-glyph-mine',
              'project', 'sc-glyph-project',
              'refinery', 'sc-glyph-refinery',
              'magnet_maker', 'sc-glyph-magnet_maker',
              'oem', 'sc-glyph-oem',
              'reseller', 'sc-glyph-reseller',
              'sc-glyph-mine',
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
      const hitLayers = [
        'sc-fac-sym', 'sc-fac-pt', 'sc-dep-uncl', 'sc-dep-uncl-f',
        'sc-clusters',
        'sc-edges-solid', 'sc-edges-dashed',
      ]
      for (const id of hitLayers) {
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = '' })
      }
      map.on('click', 'sc-clusters', async (e) => {
        const f = e.features[0]
        const src = map.getSource('sc-deposits')
        const z = await src.getClusterExpansionZoom(f.properties.cluster_id)
        map.easeTo({ center: f.geometry.coordinates, zoom: z + 0.5, duration: 350 })
      })
      const clickNode = (e) => {
        const f = e.features[0]
        if (!f) return
        const n = byIdRef.current.get(f.properties.id)
        if (n) onNodeClickRef.current(n)
      }
      const moveNode = (e) => {
        const f = e.features[0]
        if (!f) { setHover(null); return }
        setHover({ kind: 'node', x: e.point.x, y: e.point.y, object: byIdRef.current.get(f.properties.id) })
      }
      const leaveNode = () => setHover(null)
      // Circles have the hit target; duplicate handlers on symbol+circle would fire twice
      map.on('click', 'sc-dep-uncl', clickNode)
      map.on('click', 'sc-dep-uncl-f', clickNode)
      map.on('click', 'sc-fac-pt', clickNode)
      map.on('mousemove', 'sc-dep-uncl', moveNode)
      map.on('mouseleave', 'sc-dep-uncl', leaveNode)
      map.on('mousemove', 'sc-dep-uncl-f', moveNode)
      map.on('mouseleave', 'sc-dep-uncl-f', leaveNode)
      map.on('mousemove', 'sc-fac-pt', moveNode)
      map.on('mouseleave', 'sc-fac-pt', leaveNode)

      const reapplyCalmIf2d = () => {
        if (map.isStyleLoaded() === false) return
        applyCalmBasemap2D(map, modeRef.current === '2d')
      }
      map.on('styledata', (e) => {
        if (e.dataType !== 'style') return
        reapplyCalmIf2d()
      })
      queueMicrotask(reapplyCalmIf2d)

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
    const vCl = depositCluster ? 'visible' : 'none'
    const vFl = depositCluster ? 'none' : 'visible'
    for (const id of ['sc-clusters', 'sc-cluster-lbl', 'sc-dep-uncl']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vCl)
    }
    for (const id of ['sc-dep-uncl-f']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vFl)
    }
  }, [depositCluster, mapLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    if (map.isStyleLoaded() === false) return

    const previous = lastAppliedViewRef.current
    const userSwitched = previous != null && previous !== mode
    lastAppliedViewRef.current = mode

    const isGlobe = mode === '3d'
    try {
      map.setProjection({ type: isGlobe ? 'globe' : 'mercator' })
    } catch (e) {
      console.warn('setProjection', e)
    }
    try {
      map.setMaxPitch(isGlobe ? 85 : 0)
    } catch (e) {
      console.warn('setMaxPitch', e)
    }
    applyCalmBasemap2D(map, !isGlobe)

    if (userSwitched) {
      const v = isGlobe ? GLOBE_VIEW : MERCATOR_VIEW
      try { map.stop() } catch { /* */ }
      map.easeTo({
        center: v.center,
        zoom: v.zoom,
        pitch: v.pitch,
        bearing: v.bearing,
        duration: 550,
      })
    }
  }, [mode, mapLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    try {
      map.getSource('sc-deposits')?.setData(depositsData)
      map.getSource('sc-deposits-flat')?.setData(depositsData)
      map.getSource('sc-fac')?.setData(facilitiesData)
      map.getSource('sc-edges')?.setData(edgesData)
    } catch (e) {
      console.warn('setData', e)
    }
  }, [depositsData, facilitiesData, edgesData, mapLoaded])

  return (
    <div className="supply-chain-map">
      <div ref={mapEl} className="sc-map-canvas" />
      <div className="sc-map-toolbar" role="toolbar" aria-label="Map mode">
        <div
          className="sc-map-seg"
          role="group"
          aria-label="Map projection"
          title="2D: flat map and simplified basemap. 3D: globe with full labels and detail."
        >
          <button
            type="button"
            className={mode === '2d' ? 'sc-tb is-on' : 'sc-tb'}
            aria-pressed={mode === '2d'}
            aria-label="2D flat map (Mercator)"
            onClick={() => setViewMode('2d')}
          >2D
          </button>
          <button
            type="button"
            className={mode === '3d' ? 'sc-tb is-on' : 'sc-tb'}
            aria-pressed={mode === '3d'}
            aria-label="3D globe"
            onClick={() => setViewMode('3d')}
          >3D
          </button>
        </div>
        <div className="sc-map-seg sc-map-seg--cluster" title="USGS-style deposit points">
          <button
            type="button"
            className={depositCluster ? 'sc-tb is-on' : 'sc-tb'}
            onClick={() => setDepositCluster(true)}
          >Cluster
          </button>
          <button
            type="button"
            className={!depositCluster ? 'sc-tb is-on' : 'sc-tb'}
            onClick={() => setDepositCluster(false)}
          >Each point
          </button>
        </div>
        <button type="button" className="sc-map-reset" onClick={resetCamera} title="Reset view">
          Reset
        </button>
      </div>
      <p className="sc-map-hint">
        {mode === '3d' ? (
          <>Ctrl+drag: tilt · </>
        ) : null}
        drag: pan
        <span className="sc-map-hint-sep" aria-hidden>·</span>
        scroll: zoom
        {mode === '2d' ? (
          <><span className="sc-map-hint-sep" aria-hidden>·</span>2D: north-up, no tilt</>
        ) : null}
      </p>
      {hover && hover.object && (
        <div
          className="map-hover-tip"
          style={{ left: hover.x + 10, top: hover.y + 10 }}
        >
          <div style={{ fontWeight: 600 }}>{hover.object.name || hover.object.id}</div>
          <div style={{ color: '#9ca3af', marginTop: 2 }}>{NODE_TYPES[hover.object.type]?.label} {hover.object.country && `· ${hover.object.country}`}</div>
          {usgsIdFromNodeId(hover.object.id) && (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>USGS {usgsIdFromNodeId(hover.object.id)}</div>
          )}
        </div>
      )}
    </div>
  )
}
