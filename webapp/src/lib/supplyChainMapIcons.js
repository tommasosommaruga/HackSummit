/**
 * White line-art glyphs for MapLibre (canvas → addImage), matching NodeTypeIcon / nodeTypeIcons.
 * Drawn on transparent pixels; the colored disk is the circle layer below.
 * Deposits use dots only — no glyph from this file.
 */
import { drawMapGlyphOnCanvas, ICON_NODE_KEYS } from './nodeTypeIcons.js'

const SIZE = 128

/**
 * @param {import('maplibre-gl').Map} map
 */
export function addSupplyChainGlyphs (map) {
  for (const t of ICON_NODE_KEYS) {
    const id = `sc-glyph-${t}`
    if (map.hasImage(id)) {
      try { map.removeImage(id) } catch { /* */ }
    }
    const c = document.createElement('canvas')
    c.width = c.height = SIZE
    const ctx = c.getContext('2d')
    if (!ctx) continue
    const cx = SIZE / 2
    const cy = SIZE / 2
    // Crisp light glyph on the facility disk; subtle shadow reads on dark and light basemaps
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 1.5
    drawMapGlyphOnCanvas(ctx, t, cx, cy)
    ctx.shadowColor = 'transparent'
    const img = ctx.getImageData(0, 0, SIZE, SIZE)
    try {
      map.addImage(id, img, { pixelRatio: 2 })
    } catch (e) {
      console.warn('addImage', id, e)
    }
  }
}

export const TYPES = ICON_NODE_KEYS
