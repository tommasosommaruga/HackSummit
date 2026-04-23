/**
 * WEEE / recycling facilities from the cleaned Excel: geocoding helpers and
 * type normalization (file has "Type" column; "Normalized Type" is derived).
 */

/** The three metallurgy / refining buckets (grouped in the filter UI). */
export const METALLURGY_COLORS = {
  Hydrometallurgy: '#2563eb',
  'Mixed refining': '#16a34a',
  Pyrometallurgy: '#dc2626',
}

export const METALLURGY_ICON_KEYS = {
  Hydrometallurgy: 'refinery',
  'Mixed refining': 'magnet_maker',
  Pyrometallurgy: 'mine',
}

/** @deprecated use METALLURGY_COLORS */
export const TYPE_COLORS = { ...METALLURGY_COLORS, Other: '#6b7280' }

export const OVERVIEW_COLOR = '#1d4ed8'

export const COUNTRY_CENTROIDS = {
  GERMANY: [10.45, 51.16],
  FRANCE: [2.21, 46.22],
  NETHERLANDS: [5.29, 52.13],
  BELGIUM: [4.47, 50.5],
  LITHUANIA: [23.9, 55.17],
  'CZECH REPUBLIC': [15.47, 49.8],
  PORTUGAL: [-8.22, 39.4],
  GREECE: [21.82, 39.07],
  'UNITED KINGDOM': [-2.2, 54.0],
  SPAIN: [-3.75, 40.46],
  ROMANIA: [24.97, 45.86],
  IRELAND: [-8.24, 53.35],
  SWEDEN: [18.64, 60.13],
  SWITZERLAND: [8.23, 46.8],
  HUNGARY: [19.5, 47.16],
  POLAND: [19.15, 51.92],
  SLOVENIA: [14.99, 46.15],
  ITALY: [12.57, 42.5],
  FINLAND: [25.75, 61.92],
  SLOVAKIA: [19.7, 48.67],
  BULGARIA: [25.49, 42.73],
  'NORTH AMERICA': [-98.0, 39.0],
}

function hashCode (s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function jitterLonLat (key, lon, lat) {
  const h = hashCode(key)
  return [
    lon + ((h % 200) - 100) * 0.0008,
    lat + ((Math.floor(h / 200) % 200) - 100) * 0.0008,
  ]
}

/**
 * One canonical key per place so cache hits aren’t split across "Paris" vs "paris ".
 * Use for `cache` and feature lookup (same as geocodeKey).
 */
export function locationCacheKey (city, country) {
  const a = String(city ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
  const b = String(country ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
  return `${a}|${b}`
}

/**
 * If the spreadsheet has explicit coordinates, use them (GeoJSON order: [lon, lat]).
 * Column names are matched case-insensitively common variants.
 */
export function parseLatLngFromRow (raw) {
  if (!raw || typeof raw !== 'object') return null
  const lat = raw.Latitude ?? raw.latitude ?? raw.Lat ?? raw.lat
  const lon = raw.Longitude ?? raw.longitude ?? raw.Lon ?? raw.lon ?? raw.Lng ?? raw.lng
  if (lat === '' || lon === '' || lat == null || lon == null) return null
  const la = parseFloat(String(lat).replace(',', '.'))
  const lo = parseFloat(String(lon).replace(',', '.'))
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null
  if (Math.abs(la) > 90 || Math.abs(lo) > 180) return null
  return [lo, la]
}

/** Column names that hold a per-row source / reference (any match wins). */
const SOURCE_COLUMN_RE = /^(source|sources|reference|registry|citation|data[\s_]?source|provenance|primary[\s_]?source)(\s+\w+)?$/i

/**
 * First non-empty value from a column whose name looks like "Source" / "Reference" / etc.
 */
export function pickSourceTextFromRow (raw) {
  if (!raw || typeof raw !== 'object') return ''
  for (const k of Object.keys(raw)) {
    if (k.startsWith('__')) continue
    if (!SOURCE_COLUMN_RE.test(String(k).trim())) continue
    const v = raw[k]
    if (v == null) continue
    const t = String(v).trim()
    if (t !== '' && t !== '—') return t
  }
  return ''
}

const URL_IN_TEXT_RE = /https?:\/\/[^\s\])"'<>\u00A0]+/gi

/**
 * Unique http(s) URLs found inside free text (e.g. Details column).
 */
export function extractHttpUrlsFromText (text) {
  if (text == null || text === '') return []
  const s = String(text)
  const re = new RegExp(URL_IN_TEXT_RE.source, 'gi')
  const out = new Set()
  for (const m of s.matchAll(re)) {
    let u = m[0]
    u = u.replace(/[.,;:!?)\]}\u2019]+$/g, '')
    if (u.length > 4) out.add(u)
  }
  return [...out]
}

/** Shown on the page when the spreadsheet has no per-row source column. */
export const RECYCLING_DATASET_ATTRIBUTION =
  'Facility list and process details come from the project spreadsheet (WEEE / recycling register). '

export function normalizeRecyclingType (raw) {
  const s = String(raw || '').trim()
  const l = s.toLowerCase()
  if (l === 'hydrometallurgy') return 'Hydrometallurgy'
  if (l === 'pyrometallurgy') return 'Pyrometallurgy'
  if (l === 'mixed refining' || l.includes('mixed (pyro') || l === 'mixed (pyro + hydrometallurgy)') {
    return 'Mixed refining'
  }
  if (l.includes('pyrometallurgy') && l.includes('hydro')) return 'Mixed refining'
  if (l.includes('hydrometallurgy')) return 'Hydrometallurgy'
  if (l.includes('pyrometallurgy')) return 'Pyrometallurgy'
  return 'Other'
}

const RAW_TYPE_PALETTE = [
  '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#84cc16', '#06b6d4',
  '#d946ef', '#f97316', '#22c55e', '#e11d48', '#0ea5e9', '#a3e635',
  '#c084fc', '#fb7185', '#2dd4bf', '#fbbf24', '#4ade80', '#f43f5e',
]

const RAW_ICON_ROTATION = ['reseller', 'refinery', 'project', 'oem', 'mine', 'magnet_maker']

/** Single control for all sheet rows that start with "Multiple ("; full string stays in `Type`. */
export const RECYCLING_MULTIPLES_FILTER_ID = 'cat:multiples'

/** REE tab only; main “Facility types” list excludes these rows. */
export const REE_FILTER_ID = 'ree:recycling'

/**
 * Main sheet buckets (order matches filter UI), before refining (m:*) and other (t:*) rows.
 * `uiLabel` is the user-facing name; `typeLabel` is used on the map/legend.
 */
export const RECYCLING_SHEET_CATEGORY_DEFS = [
  { id: 'cat:collection', uiLabel: 'Collection', typeLabel: 'Collection' },
  { id: 'cat:manual', uiLabel: 'Manual treatment', typeLabel: 'Manual treatment' },
  { id: 'cat:pretreatment', uiLabel: 'Pre-treatment', typeLabel: 'Pre-treatment' },
  { id: 'cat:advanced', uiLabel: 'Advanced', typeLabel: 'Advanced treatment' },
  { id: 'cat:multiples', uiLabel: 'Multiples', typeLabel: 'Multiples' },
  { id: 'cat:reuse', uiLabel: 'Re-use', typeLabel: 'Re-use' },
]

const MAIN_CAT_STY = Object.fromEntries(
  RECYCLING_SHEET_CATEGORY_DEFS.map((d) => {
    const map = {
      'cat:collection': { color: '#0ea5e9', iconKey: 'project' },
      'cat:manual': { color: '#8b5cf6', iconKey: 'reseller' },
      'cat:pretreatment': { color: '#14b8a6', iconKey: 'refinery' },
      'cat:advanced': { color: '#f59e0b', iconKey: 'mine' },
      'cat:multiples': { color: '#ec4899', iconKey: 'oem' },
      'cat:reuse': { color: '#22c55e', iconKey: 'magnet_maker' },
    }[d.id]
    return [d.id, { ...map, typeLabel: d.typeLabel }]
  }),
)

const REE_STYLE = {
  color: '#7c3aed',
  iconKey: 'mine',
  typeLabel: 'REE recycling',
}

/**
 * Resolves a spreadsheet "Type" cell to a filter id, REE-only flag, and high-level class.
 * Priority: REE only tab → "Multiple (" merged → pyro/hydro/mixed → sheet categories → per-row `t:…`.
 */
export function resolveRecyclingFilterId (typeRaw) {
  const s0 = String(typeRaw ?? '').trim()
  if (s0 === '' || s0 === '—') {
    return { filterId: 't:—', isRee: false, sheetKind: 'other' }
  }
  const s = s0.replace(/\s+/g, ' ').trim()
  const l = s.toLowerCase()

  if (/^ree\s*recycling$/i.test(s)) {
    return { filterId: REE_FILTER_ID, isRee: true, sheetKind: 'ree' }
  }

  if (/^\s*multiple\s*\(/i.test(s)) {
    return { filterId: RECYCLING_MULTIPLES_FILTER_ID, isRee: false, sheetKind: 'multiples' }
  }

  const n = normalizeRecyclingType(typeRaw)
  if (n !== 'Other') {
    return { filterId: `m:${n}`, isRee: false, sheetKind: 'refining' }
  }

  if (l.includes('collection')) {
    return { filterId: 'cat:collection', isRee: false, sheetKind: 'collection' }
  }
  if (l === 'manual treatment') {
    return { filterId: 'cat:manual', isRee: false, sheetKind: 'manual' }
  }
  if (l === 'pre-treatment' || l === 'pre treatment') {
    return { filterId: 'cat:pretreatment', isRee: false, sheetKind: 'pretreat' }
  }
  if (l === 'advanced treatment' || l === 'advanced') {
    return { filterId: 'cat:advanced', isRee: false, sheetKind: 'advanced' }
  }
  if (l === 're-use' || l === 'reuse' || l === 're use') {
    return { filterId: 'cat:reuse', isRee: false, sheetKind: 'reuse' }
  }

  return { filterId: `t:${s0}`, isRee: false, sheetKind: 'other' }
}

/**
 * Map + filter: WEEE sheet buckets (in fixed order) + one merged Multiples; refining (m:);
 * REE rows use {@link REE_FILTER_ID} and only appear on the “REE recycling” map tab; rare
 * unknowns stay as `t:<exact sheet string>` with a stable color.
 */
export function getRecyclingTypeStyle (typeRaw) {
  const { filterId, isRee } = resolveRecyclingFilterId(typeRaw)

  if (isRee) {
    return {
      filterId: REE_FILTER_ID,
      color: REE_STYLE.color,
      iconKey: REE_STYLE.iconKey,
      typeLabel: REE_STYLE.typeLabel,
      isMetallurgy: false,
      metallurgyName: null,
      isRee: true,
    }
  }

  if (filterId.startsWith('m:')) {
    const n = filterId.slice(2)
    if (!METALLURGY_COLORS[n]) {
      return fallbackTStyle(String(typeRaw ?? '').trim() || '—')
    }
    return {
      filterId,
      color: METALLURGY_COLORS[n],
      iconKey: METALLURGY_ICON_KEYS[n],
      typeLabel: n,
      isMetallurgy: true,
      metallurgyName: n,
      isRee: false,
    }
  }

  if (MAIN_CAT_STY[filterId]) {
    const st = MAIN_CAT_STY[filterId]
    return {
      filterId,
      color: st.color,
      iconKey: st.iconKey,
      typeLabel: st.typeLabel,
      isMetallurgy: false,
      metallurgyName: null,
      isRee: false,
    }
  }

  const label = filterId.startsWith('t:') ? filterId.slice(2) : String(typeRaw || '').trim() || '—'
  return fallbackTStyle(label)
}

function fallbackTStyle (label) {
  const h = hashCode(label)
  return {
    filterId: `t:${label}`,
    color: RAW_TYPE_PALETTE[h % RAW_TYPE_PALETTE.length],
    iconKey: RAW_ICON_ROTATION[Math.floor(h / 7) % RAW_ICON_ROTATION.length],
    typeLabel: label,
    isMetallurgy: false,
    metallurgyName: null,
    isRee: false,
  }
}

function photonUrl (city, country) {
  const q = `${city}, ${country}`.replace(/\s+/g, ' ').trim()
  return `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1&lang=en`
}

function nominatimUrl (city, country) {
  const q = `${city}, ${country}`.replace(/\s+/g, ' ').trim()
  return `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
}

function delay (ms) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Resolve one (city+country) key to [lon, lat]; updates `cache` in place.
 */
export async function geocodeKey (key, city, country, cache) {
  if (cache[key]) return cache[key]
  if (!String(city).trim() && !String(country).trim()) {
    const jj = jitterLonLat(key, 10, 50)
    cache[key] = jj
    return jj
  }
  let lon
  let lat
  let ok = false
  try {
    const r = await fetch(photonUrl(city, country), { headers: { Accept: 'application/json' } })
    if (r.ok) {
      const d = await r.json()
      if (d.features?.[0]?.geometry) {
        ;[lon, lat] = d.features[0].geometry.coordinates
        ok = true
      }
    }
  } catch { /* Nominatim next */ }
  if (!ok) {
    await delay(1100)
    try {
      const r2 = await fetch(nominatimUrl(city, country), { headers: { 'Accept-Language': 'en' } })
      if (r2.ok) {
        const arr = await r2.json()
        if (arr?.[0]) {
          lon = parseFloat(String(arr[0].lon))
          lat = parseFloat(String(arr[0].lat))
          ok = !Number.isNaN(lon) && !Number.isNaN(lat)
        }
      }
    } catch { /* fallback */ }
  }
  if (!ok) {
    const C = (country || '').toUpperCase().trim()
    const cc = COUNTRY_CENTROIDS[C] || [10, 50]
    const jj = jitterLonLat(key, cc[0], cc[1])
    lon = jj[0]
    lat = jj[1]
  }
  cache[key] = [lon, lat]
  return [lon, lat]
}

export function escapeHtml (s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function escapeHtmlAttr (s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
}
