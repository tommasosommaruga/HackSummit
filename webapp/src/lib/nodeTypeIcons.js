/**
 * Vector glyphs for map atlas (white on transparent) and matching SVG for UI.
 * Coordinates: 24x24 viewBox, stroke-based where possible.
 */
export const MAP_ICON_SIZE = 64

const draw = (ctx) => {
  const line = (x1, y1, x2, y2) => {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
  }
  const strokeW = (w) => {
    ctx.lineWidth = w
    ctx.stroke()
  }
  const rect = (x, y, w, h) => {
    ctx.beginPath()
    ctx.rect(x, y, w, h)
  }
  const poly = (points) => {
    ctx.beginPath()
    ctx.moveTo(points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])
  }
  return { strokeW, line, rect, poly }
}

function baseStyle(ctx) {
  ctx.strokeStyle = '#ffffff'
  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = 2.1
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx center x in cell (pixels)
 * @param {number} cy center y in cell (pixels)
 */
export function drawMapGlyphOnCanvas(ctx, typeKey, cx, cy) {
  // Slightly larger glyph in cell for clearer masked pixels on the map.
  const s = MAP_ICON_SIZE * 0.5 / 12
  const ox = cx - 12 * s
  const oy = cy - 12 * s
  ctx.save()
  ctx.translate(ox, oy)
  ctx.scale(s, s)
  baseStyle(ctx)
  const { strokeW, line, rect, poly } = draw(ctx)
  switch (typeKey) {
    case 'mine': {
      // Pickaxe: V-head up, shaft down. Single stroke, thick (stable icon-mask alpha in deck.gl).
      ctx.beginPath()
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(3, 6)
      ctx.lineTo(12, 2)
      ctx.lineTo(21, 6)
      ctx.moveTo(12, 2)
      ctx.lineTo(12, 22)
      ctx.stroke()
      break
    }
    case 'project': {
      line(12, 3, 12, 6)
      strokeW(1.6)
      ctx.beginPath()
      ctx.arc(12, 10, 3, 0, Math.PI * 2)
      strokeW(1.5)
      line(7, 19, 12, 13.5)
      line(17, 19, 12, 13.5)
      strokeW(1.6)
      break
    }
    case 'refinery': {
      rect(5, 12, 14, 8)
      strokeW(1.6)
      rect(7, 7, 3, 5)
      strokeW(1.45)
      rect(10.5, 5, 3, 7)
      strokeW(1.45)
      rect(14, 7, 3, 5)
      strokeW(1.45)
      break
    }
    case 'magnet_maker': {
      ctx.beginPath()
      ctx.moveTo(6, 8)
      ctx.lineTo(6, 14)
      ctx.arc(12, 14, 6, Math.PI, 0)
      ctx.lineTo(18, 8)
      strokeW(1.75)
      break
    }
    case 'oem': {
      // Power plug: housing + two prongs + short ground pin
      ctx.lineWidth = 2.0
      rect(5, 3, 14, 11)
      strokeW(1.65)
      line(8, 14, 8, 22)
      strokeW(1.8)
      line(16, 14, 16, 22)
      strokeW(1.8)
      line(12, 14, 12, 19)
      strokeW(1.35)
      break
    }
    case 'reseller': {
      poly([[4, 10], [20, 10], [18, 6], [6, 6]])
      ctx.closePath()
      strokeW(1.45)
      rect(5, 10, 14, 10)
      strokeW(1.45)
      line(8, 14, 8, 18)
      line(16, 14, 16, 18)
      strokeW(1.35)
      break
    }
    default:
      break
  }
  ctx.restore()
}

/** SVG path(s) for UI (24x24) — string or list of <path d> */
export const NODE_TYPE_SVG_D = {
  mine: 'M3 6 L12 2 L21 6 M12 2 L12 22',
  project: [
    'M12 3 L12 6',
    'M9 10 A3 3 0 1 0 15 10 A3 3 0 1 0 9 10',
    'M7 19 L12 13.5 L17 19',
  ],
  refinery: [
    'M5 12 H19 V20 H5 Z',
    'M7 7 H10 V12',
    'M10.5 5 H13.5 V12',
    'M14 7 H17 V12',
  ],
  magnet_maker: ['M6 8 V14 A6 6 0 0 0 18 14 V8'],
  oem: [
    'M5.5 3.5 H18.5 V13.5 H5.5 Z',
    'M8.5 13.5 V21.5',
    'M15.5 13.5 V21.5',
    'M12 13.5 V18.5',
  ],
  reseller: [
    'M4 10 L6 6 H18 L20 10',
    'M5 10 V20 H19 V10',
  ],
  deposit: null,
}

export const ICON_NODE_KEYS = [
  'mine',
  'project',
  'refinery',
  'magnet_maker',
  'oem',
  'reseller',
]
