/**
 * Single source of truth for every node type the supply-chain map understands.
 *
 * Adding a new stage (e.g. "cathode", "cell", "pack") is a one-entry change:
 * register the type here and append rows with that `type` to supply_chain.json.
 *
 * Fields per type:
 *   label       — human label shown in legend and filter toggles
 *   icon        — single emoji/glyph rendered by deck.gl IconLayer
 *   color       — default RGB (hex) for the node; overridable per-node via
 *                 a status palette below
 *   shape       — 'circle' (ScatterplotLayer) or 'icon' (IconLayer)
 *   size        — pixel size hint at baseline zoom
 *   statusKey   — name of the node field that drives status-based coloring
 *   statuses    — { code: { label, color } } palette for the statusKey values
 */

export const NODE_TYPES = {
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
  project: {
    label: 'Project (operator)',
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
  oem: {
    label: 'OEM / cell maker',
    icon: '🔋',
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
  s = s.replace(/\s*\(\?\)\s*$/, '')            // drop trailing "(?)"
  s = s.replace(/\.0+$/, '')                    // '4.0' → '4'
  // Split on commas/amps; pick the rightmost token (most recent state).
  const tokens = s.split(/\s*[,&]\s*/).filter(Boolean)
  if (tokens.length === 0) return null
  let last = tokens[tokens.length - 1]
  // Strip year parens like "3(2023)".
  last = last.replace(/\s*\(.*?\)\s*$/, '')
  // Floats in compound tokens.
  last = last.replace(/\.0+$/, '')
  return last || null
}

/** Resolve a node to its display color given the registered palette. */
export function colorForNode(node) {
  const cfg = NODE_TYPES[node.type]
  if (!cfg) return '#9ca3af'
  const raw = cfg.statusKey ? node[cfg.statusKey] : null
  const code = normalizeStatusCode(raw)
  if (code && cfg.statuses[code]) return cfg.statuses[code].color
  // Fallback: try the raw value as-is.
  if (raw != null && cfg.statuses[String(raw)]) return cfg.statuses[String(raw)].color
  return cfg.color
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
