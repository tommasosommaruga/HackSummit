/**
 * Single source of truth for every node type the supply-chain map understands.
 *
 * Adding a new stage (e.g. "cathode", "cell", "pack") is a one-entry change:
 * register the type here and append rows with that `type` to supply_chain.json.
 *
 * Fields per type:
 *   label       — human label shown in legend and filter toggles
 *   icon        — legacy label (not used for map; see NodeTypeIcon + map atlas)
 *   color       — default RGB (hex) for the node; overridable per-node via
 *                 a status palette below
 *   shape       — 'circle' (ScatterplotLayer) or 'icon' (IconLayer)
 *   size        — pixel size hint at baseline zoom
 *   statusKey   — name of the node field that drives status-based coloring
 *   statuses    — { code: { label, color } } palette for the statusKey values
 */

export const NODE_TYPES = {
  mine: {
    label: 'Mine / Deposit',
    icon: '⛏',
    color: '#f59e0b',
    shape: 'icon',
    size: 26,
    statusKey: 'pstatus',
    statuses: {
      'Producer':             { label: 'Active producer',  color: '#f59e0b' },
      'Past producer':        { label: 'Past producer',    color: '#d97706' },
      'Past byproduct producer': { label: 'Byproduct',    color: '#b45309' },
      'No production':        { label: 'No production',    color: '#78716c' },
    },
  },
  deposit: {
    label: 'Deposit',
    icon: '•',
    color: '#6b7280',
    shape: 'circle',
    size: 3,
    statusKey: 'status',
    statuses: {
      Occurrence: { label: 'Occurrence',       color: '#6b7280' },
      Showing:    { label: 'Showing',          color: '#eab308' },
      Deposit:    { label: 'Deposit (proven)', color: '#f97316' },
    },
  },
  /**
   * REE mine / development rows from the company sheet (stages, resource, company).
   * USGS "deposit" is raw geology; this is the commercial project side — different columns.
   */
  project: {
    label: 'REE mine project',
    icon: '⛏',
    color: '#22c55e',
    shape: 'icon',
    size: 22,
    statusKey: 'status_code',
    // File 2 status codes (numeric/alpha).
    statuses: {
      '1': { label: 'Exploration',         color: '#6b7280' },
      '2': { label: 'Feasibility',         color: '#eab308' },
      '3': { label: 'Construction',        color: '#f97316' },
      '4': { label: 'Production',          color: '#22c55e' },
      'S': { label: 'Suspended',           color: '#ef4444' },
      'T': { label: 'Metallurgical test',  color: '#06b6d4' },
      'D': { label: 'Dev. licence',        color: '#a855f7' },
      'N': { label: 'Not used',            color: '#4b5563' },
    },
  },
  refinery: {
    label: 'Refinery / plant',
    icon: '🏭',
    color: '#3b82f6',
    shape: 'icon',
    size: 22,
    statusKey: 'status_code',
    // Factory sheet status codes.
    statuses: {
      '1':  { label: 'Crushing/roughing',   color: '#9ca3af' },
      '3':  { label: 'Mixed REO',           color: '#f97316' },
      '4':  { label: 'Separated REO',       color: '#3b82f6' },
      '5':  { label: 'Metal',               color: '#06b6d4' },
      'T':  { label: 'Trial production',    color: '#eab308' },
      'P':  { label: 'Pre-feasibility',     color: '#a78bfa' },
      'PT': { label: 'Terminated',          color: '#ef4444' },
    },
  },
  magnet_maker: {
    label: 'Magnet maker',
    icon: '🧲',
    color: '#f472b6',
    shape: 'icon',
    size: 22,
    statusKey: null,
    statuses: {},
  },
  oem: {
    label: 'OEM / end product',
    icon: '🔌',
    color: '#a855f7',
    shape: 'icon',
    size: 22,
    statusKey: null,
    statuses: {},
  },
  reseller: {
    label: 'Reseller',
    icon: '🏪',
    color: '#ec4899',
    shape: 'icon',
    size: 22,
    statusKey: null,
    statuses: {},
  },
}

export const MATERIAL_COLORS = {
  ore:            '#f97316', // orange
  concentrate:    '#eab308', // yellow
  mixed_reo:      '#06b6d4', // cyan
  separated_reo:  '#3b82f6', // blue
  metal:          '#a855f7', // purple
  magnet:         '#ec4899', // pink
  recycled:       '#10b981', // green
  unknown:        '#9ca3af',
}

/**
 * Normalize a raw status code string to the canonical single token used in the
 * statuses palette. File 2's status column uses shorthand like:
 *   "4"               — simple
 *   "4.0"             — xlsx-as-float leak
 *   "T,3(2023)"       — was T, then 3 in 2023 → take the last (most recent)
 *   "P, 4(?)"         — P indicates "planned for"; actual current op is 4
 *   "Showing(?)"      — USGS deposit uncertainty marker
 * Returns the canonical code (e.g. '4', 'T', 'P') or null.
 */
export function normalizeStatusCode(raw) {
  if (raw == null) return null
  let s = String(raw).trim()
  if (!s) return null
  // '4 - Active production' → '4'  (strip explanatory tail after ' - ')
  const dashIdx = s.search(/\s+-\s+/)
  if (dashIdx >= 0) s = s.slice(0, dashIdx).trim()
  s = s.replace(/\s*\(\?\)\s*$/, '')              // '(?)' uncertainty
  s = s.replace(/\.0+$/, '')                      // '4.0' → '4'
  // Split on commas / ampersands; pick rightmost token (most recent state).
  const tokens = s.split(/\s*[,&]\s*/).filter(Boolean)
  if (tokens.length === 0) return null
  let last = tokens[tokens.length - 1]
  last = last.replace(/\s*\(.*?\)\s*$/, '')       // 'T(2021)' → 'T'
  last = last.replace(/\.0+$/, '')
  return last || null
}

/** Resolve a node to its display color given the registered palette. */
export function colorForNode(node) {
  if (node.type === 'mine') {
    if (node.pstatus) {
      const m = NODE_TYPES.mine
      const code = normalizeStatusCode(node.pstatus)
      if (code && m.statuses[code]) return m.statuses[code].color
      if (m.statuses[String(node.pstatus)]) return m.statuses[String(node.pstatus)].color
    }
    if (node.status_code != null) {
      const proj = NODE_TYPES.project
      const code = normalizeStatusCode(node.status_code)
      if (code && proj.statuses[code]) return proj.statuses[code].color
    }
  }
  const cfg = NODE_TYPES[node.type]
  if (!cfg) return '#9ca3af'
  const raw = cfg.statusKey ? node[cfg.statusKey] : null
  const code = normalizeStatusCode(raw)
  if (code && cfg.statuses[code]) return cfg.statuses[code].color
  if (raw != null && cfg.statuses[String(raw)]) return cfg.statuses[String(raw)].color
  return cfg.color
}

/** USGS deposit id when `id` is `dep_<ID_No>` from Global_REE_combined.xlsx */
export function usgsIdFromNodeId(id) {
  if (typeof id !== 'string' || !id.startsWith('dep_')) return null
  return id.slice(4)
}

/** Blend hex toward white (0–1), for disk halos that sit under white icons. */
export function mixWithWhite(hex, t) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return [
    Math.round(r * (1 - t) + 255 * t),
    Math.round(g * (1 - t) + 255 * t),
    Math.round(b * (1 - t) + 255 * t),
  ]
}

/** Convert a hex color to a [r,g,b,a] array for deck.gl. */
export function hexToRgba(hex, alpha = 255) {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
    alpha,
  ]
}
