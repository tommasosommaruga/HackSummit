/**
 * SupplyChainMap — deck.gl + MapLibre rendering of the unified REE graph.
 *
 * Layer composition:
 *   - ScatterplotLayer for deposits (thousands; GPU-friendly)
 *   - IconLayer for projects / refineries / oem / reseller (small N, icons)
 *   - ArcLayer for edges with animated great-circle dashes
 *   - IconLayer for cluster badges at low zoom (cluster count)
 *
 * Clustering: uses supercluster when the ScatterplotLayer gets dense. Icons
 * (projects, refineries) don't cluster — their N is small and their symbology
 * matters individually. Badge renders at count ≥ 8 and dissolves when
 * zooming in.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { MapView } from '@deck.gl/core'
import { ScatterplotLayer, IconLayer, ArcLayer, TextLayer, PathLayer } from '@deck.gl/layers'
import { PathStyleExtension } from '@deck.gl/extensions'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Supercluster from 'supercluster'
import { NODE_TYPES, MATERIAL_COLORS, colorForNode, hexToRgba } from '../lib/nodeTypeConfig.js'

const INITIAL_VIEW = { longitude: 20, latitude: 25, zoom: 2, pitch: 0, bearing: 0 }

// Build a map-style JSON that points at the same CartoDB dark tiles already in
// use. Keeps the existing visual identity; swap the source here later if the
// base-map choice changes.
const MAP_STYLE = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap © CartoDB',
    },
  },
  layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
}

// Emoji icons are rasterized once into an atlas canvas to keep the IconLayer
// GPU-friendly (no per-frame DOM work).
function buildIconAtlas(types) {
  const entries = Object.entries(types).filter(([, cfg]) => cfg.shape === 'icon')
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size * entries.length
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // Prefer the platform's native color emoji font so the atlas renders in color.
  ctx.font = `${size * 0.7}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`
  const mapping = {}
  entries.forEach(([key, cfg], i) => {
    ctx.fillText(cfg.icon, size * i + size / 2, size / 2 + 4)
    mapping[key] = { x: size * i, y: 0, width: size, height: size, mask: false }
  })
  return { image: canvas, mapping }
}

function useViewport() {
  const [view, setView] = useState(INITIAL_VIEW)
  return [view, setView]
}

export default function SupplyChainMap({
  nodes,
  edges,
  byId,
  highlighted = null,          // Set of node ids to emphasize; others dim
  onNodeClick = () => {},
  typeVisible = { deposit: true, project: true, refinery: true, magnet_maker: true, oem: true, reseller: true },
}) {
  const [viewState, setViewState] = useViewport()
  const mapRef = useRef(null)
  const [hover, setHover] = useState(null)

  // Split nodes by type for layer composition.
  const byType = useMemo(() => {
    const g = { deposit: [], project: [], refinery: [], magnet_maker: [], oem: [], reseller: [] }
    for (const n of nodes) {
      if (!n.geocoded || n.lat == null) continue
      if (!typeVisible[n.type]) continue
      if (g[n.type]) g[n.type].push(n)
    }
    return g
  }, [nodes, typeVisible])

  // Deposit clustering via supercluster (GeoJSON feature API).
  const cluster = useMemo(() => {
    const c = new Supercluster({ radius: 60, maxZoom: 9, minPoints: 8 })
    c.load(byType.deposit.map(n => ({
      type: 'Feature',
      properties: { id: n.id, node: n },
      geometry: { type: 'Point', coordinates: [n.lng, n.lat] },
    })))
    return c
  }, [byType.deposit])

  const depositClusters = useMemo(() => {
    if (byType.deposit.length === 0) return []
    const z = Math.round(viewState.zoom)
    return cluster.getClusters([-180, -85, 180, 85], z)
  }, [cluster, viewState.zoom, byType.deposit.length])

  // Split cluster features back into points vs clusters.
  const { scatterPoints, clusterPoints } = useMemo(() => {
    const pts = [], cls = []
    for (const f of depositClusters) {
      if (f.properties.cluster) cls.push(f); else pts.push(f.properties.node)
    }
    return { scatterPoints: pts, clusterPoints: cls }
  }, [depositClusters])

  const iconAtlas = useMemo(() => buildIconAtlas(NODE_TYPES), [])

  // Highlighted / dimmed helpers.
  const isHighlighted = (n) => !highlighted || highlighted.has(n.id)
  // Inferred (Chinese aggregate) nodes render at 60% opacity so the verified
  // "Western" supply chain always reads as the primary layer.
  const confAlpha = (n) => n.confidence === 'inferred' ? 0.55 : 1.0
  const nodeAlpha = (n) => Math.round((isHighlighted(n) ? 230 : 60) * confAlpha(n))
  // Neon-amber tint applied to inferred nodes overrides the type's native hue.
  const INFERRED_TINT = '#fbbf24'
  const nodeColorHex = (n) => n.confidence === 'inferred' ? INFERRED_TINT : colorForNode(n)

  // Animation tick — drives flowing-dash offset on edges. Re-renders every
  // ~40 ms; deck.gl diffing keeps this cheap.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let raf = null
    const loop = () => { setTick(t => (t + 1) % 10000); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ── Layers ───────────────────────────────────────────────────────────────
  const layers = []

  // Deposits: scatter + clusters
  if (typeVisible.deposit) {
    layers.push(new ScatterplotLayer({
      id: 'deposits-scatter',
      data: scatterPoints,
      getPosition: d => [d.lng, d.lat],
      getRadius: d => (d.precision === 'exact' ? 3.5 : 2.5),
      radiusUnits: 'pixels',
      radiusMinPixels: 2,
      radiusMaxPixels: 8,
      getFillColor: d => {
        const c = hexToRgba(nodeColorHex(d), nodeAlpha(d))
        return d.precision !== 'exact' ? [c[0], c[1], c[2], c[3] * 0.4] : c
      },
      stroked: true,
      getLineColor: [15, 23, 42, 200],
      lineWidthMinPixels: 0.5,
      pickable: true,
      onHover: info => setHover(info.object ? { kind: 'node', ...info } : null),
      onClick: info => info.object && onNodeClick(info.object),
    }))
    if (clusterPoints.length) {
      layers.push(new ScatterplotLayer({
        id: 'deposits-clusters',
        data: clusterPoints,
        getPosition: f => f.geometry.coordinates,
        getRadius: f => 8 + Math.log(f.properties.point_count + 1) * 4,
        radiusUnits: 'pixels',
        getFillColor: [107, 114, 128, 200],
        stroked: true,
        getLineColor: [229, 231, 235, 220],
        lineWidthMinPixels: 1,
        pickable: true,
        onClick: (info) => {
          if (!info.object) return
          const expansionZoom = Math.min(
            cluster.getClusterExpansionZoom(info.object.properties.cluster_id),
            14,
          )
          setViewState(v => ({
            ...v,
            longitude: info.object.geometry.coordinates[0],
            latitude:  info.object.geometry.coordinates[1],
            zoom:      expansionZoom,
            transitionDuration: 400,
          }))
        },
      }))
      layers.push(new TextLayer({
        id: 'deposits-cluster-counts',
        data: clusterPoints,
        getPosition: f => f.geometry.coordinates,
        getText: f => String(f.properties.point_count_abbreviated),
        getSize: 11,
        getColor: [243, 244, 246, 255],
        fontFamily: 'Inter, sans-serif',
        fontWeight: 600,
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
      }))
    }
  }

  // Project / refinery / oem / reseller are rendered as a two-layer stack:
  // a colored ScatterplotLayer halo (status color) + IconLayer emoji on top.
  // Masking the emoji would destroy its glyph; the halo does the status work.
  for (const typeKey of ['project', 'refinery', 'magnet_maker', 'oem', 'reseller']) {
    if (!typeVisible[typeKey] || !iconAtlas.mapping[typeKey]) continue
    const data = byType[typeKey]
    if (!data.length) continue
    const baseSize = NODE_TYPES[typeKey].size
    layers.push(new ScatterplotLayer({
      id: `halo-${typeKey}`,
      data,
      getPosition: d => [d.lng, d.lat],
      getRadius: baseSize * 0.55,
      radiusUnits: 'pixels',
      getFillColor: d => hexToRgba(nodeColorHex(d), Math.min(220, nodeAlpha(d))),
      stroked: true,
      getLineColor: d => hexToRgba(nodeColorHex(d), nodeAlpha(d)),
      lineWidthMinPixels: 1.5,
      pickable: true,
      onHover: info => setHover(info.object ? { kind: 'node', ...info } : null),
      onClick: info => info.object && onNodeClick(info.object),
    }))
    layers.push(new IconLayer({
      id: `icons-${typeKey}`,
      data,
      iconAtlas: iconAtlas.image,
      iconMapping: iconAtlas.mapping,
      getIcon: () => typeKey,
      getPosition: d => [d.lng, d.lat],
      getSize: baseSize * 0.8,
      sizeUnits: 'pixels',
      // mask:false in atlas → getColor is ignored; emoji keeps native colors.
      pickable: false, // the halo handles hover/click
    }))
  }

  // Edges — only draw when both endpoints are renderable.
  const renderableEdges = useMemo(() => edges
    .map(e => {
      const a = byId.get(e.from_id)
      const b = byId.get(e.to_id)
      if (!a || !b || a.lat == null || b.lat == null) return null
      if (!typeVisible[a.type] || !typeVisible[b.type]) return null
      if (highlighted && !(highlighted.has(a.id) && highlighted.has(b.id))) return null
      return { ...e, from: a, to: b }
    })
    .filter(Boolean),
  [edges, byId, typeVisible, highlighted])

  // ── Pulse ring on highlighted nodes (active supply chain) ─────────────────
  if (highlighted) {
    const pulsed = nodes.filter(n => highlighted.has(n.id) && n.geocoded)
    if (pulsed.length) {
      const phase = (tick % 60) / 60       // 0 → 1 every ~2.4 s
      const ringRadius = 8 + phase * 22
      const ringAlpha = Math.round((1 - phase) * 180)
      layers.push(new ScatterplotLayer({
        id: 'pulse',
        data: pulsed,
        getPosition: d => [d.lng, d.lat],
        getRadius: ringRadius,
        radiusUnits: 'pixels',
        getFillColor: [0, 0, 0, 0],
        stroked: true,
        getLineColor: d => hexToRgba(nodeColorHex(d), ringAlpha),
        lineWidthMinPixels: 1.5,
        updateTriggers: { getRadius: tick, getLineColor: tick },
        pickable: false,
      }))
    }
  }

  if (renderableEdges.length) {
    // Sample a great-circle path as N waypoints so PathLayer can render the
    // curve — this lets us dash 'probable' edges (multi-site fan-outs where
    // the exact destination is unknown) via PathStyleExtension. ArcLayer
    // doesn't support dashing, so we pre-compute the arc here.
    const greatCirclePath = (a, b, steps = 32) => {
      // Take the shorter of the two great-circle directions: if |Δlng| > 180
      // shift the destination by ±360 so the arc crosses the antimeridian
      // instead of going the long way around the globe.
      let lngB = b.lng
      if (lngB - a.lng > 180) lngB -= 360
      else if (lngB - a.lng < -180) lngB += 360
      const pts = []
      const lat1 = (a.lat * Math.PI) / 180, lon1 = (a.lng * Math.PI) / 180
      const lat2 = (b.lat * Math.PI) / 180, lon2 = (lngB * Math.PI) / 180
      const d = 2 * Math.asin(Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
      ))
      if (d === 0) return [[a.lng, a.lat], [lngB, b.lat]]
      let prevLon = null
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const A = Math.sin((1 - t) * d) / Math.sin(d)
        const B = Math.sin(t * d) / Math.sin(d)
        const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2)
        const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2)
        const z = A * Math.sin(lat1) + B * Math.sin(lat2)
        const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
        let lon = (Math.atan2(y, x) * 180) / Math.PI
        // Unwrap lon so it stays continuous with the previous sample —
        // otherwise PathLayer draws a horizontal seam across the map when
        // the arc crosses ±180°.
        if (prevLon != null) {
          while (lon - prevLon > 180) lon -= 360
          while (lon - prevLon < -180) lon += 360
        }
        prevLon = lon
        pts.push([lon, (lat * 180) / Math.PI])
      }
      return pts
    }
    const pathEdges = renderableEdges.map(e => ({ ...e, path: greatCirclePath(e.from, e.to) }))

    // Flowing-dash illusion: cycle the dash pattern each frame so the
    // dashes appear to march forward. deck.gl PathStyleExtension has no
    // offset prop, but flipping between two complementary patterns at ~8 Hz
    // is close enough to "movement" for supply-chain flow imagery.
    const phase = tick % 10
    const dashPattern = [6, 4]
    const rollingDash = [dashPattern[0], dashPattern[1] + (phase < 5 ? 0 : 2)]

    layers.push(new PathLayer({
      id: 'edges',
      data: pathEdges,
      getPath: d => d.path,
      getColor: d => {
        // Inferred flows: amber. Verified: material color.
        const base = d.confidence === 'inferred'
          ? INFERRED_TINT
          : (MATERIAL_COLORS[d.material] || MATERIAL_COLORS.unknown)
        const a = d.confidence === 'inferred' ? 140 : (d.probable ? 150 : 230)
        return hexToRgba(base, a)
      },
      getWidth: d => {
        const v = d.volume_tons_per_year
        const base = v ? Math.max(1, Math.min(6, Math.log10(v + 1) * 0.8)) : 1.4
        return (d.probable || d.confidence === 'inferred') ? base * 0.75 : base
      },
      widthUnits: 'pixels',
      widthMinPixels: 1,
      capRounded: true,
      jointRounded: true,
      getDashArray: d => (d.probable || d.confidence === 'inferred') ? rollingDash : [0, 0],
      dashJustified: true,
      dashGapPickable: false,
      extensions: [new PathStyleExtension({ dash: true, highPrecisionDash: true })],
      updateTriggers: { getDashArray: phase },
      pickable: true,
      onHover: info => setHover(info.object ? { kind: 'edge', ...info } : null),
    }))
  }

  // Attach maplibre tile map under the deck.gl canvas.
  useEffect(() => {
    if (mapRef.current) return
    const el = document.getElementById('maplibre-root')
    if (!el) return
    const map = new maplibregl.Map({
      container: el,
      style: MAP_STYLE,
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
      interactive: false,
      attributionControl: false,
    })
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const m = mapRef.current
    if (!m) return
    m.jumpTo({ center: [viewState.longitude, viewState.latitude], zoom: viewState.zoom })
  }, [viewState])

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0f1a' }}>
      <div id="maplibre-root" style={{ position: 'absolute', inset: 0 }} />
      <DeckGL
        views={new MapView({ repeat: true })}
        initialViewState={INITIAL_VIEW}
        viewState={viewState}
        onViewStateChange={e => setViewState(e.viewState)}
        controller={{ dragRotate: false }}
        layers={layers}
        getCursor={({ isHovering, isDragging }) =>
          isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'}
      />
      {hover && hover.object && (
        <div
          style={{
            position: 'absolute',
            left: hover.x + 12,
            top: hover.y + 12,
            pointerEvents: 'none',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #1f2937',
            borderRadius: 8,
            padding: '0.5rem 0.7rem',
            fontSize: '0.78rem',
            color: '#e5e7eb',
            maxWidth: 280,
            zIndex: 10,
          }}
        >
          {hover.kind === 'node' ? (
            <>
              <div style={{ fontWeight: 600 }}>{hover.object.name || hover.object.id}</div>
              <div style={{ color: '#9ca3af', marginTop: 2 }}>
                {NODE_TYPES[hover.object.type]?.label || hover.object.type}
                {hover.object.country ? ` · ${hover.object.country}` : ''}
              </div>
              {hover.object.company && (
                <div style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{hover.object.company}</div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600 }}>
                {byId.get(hover.object.from_id)?.name} → {byId.get(hover.object.to_id)?.name}
              </div>
              <div style={{ color: '#9ca3af', marginTop: 2 }}>
                {hover.object.material || 'material unknown'}
                {hover.object.volume_tons_per_year
                  ? ` · ${hover.object.volume_tons_per_year.toLocaleString()} t/y`
                  : ''}
                {hover.object.year ? ` · ${hover.object.year}` : ''}
                {hover.object.probable ? ' · probable (multi-site)' : ''}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
