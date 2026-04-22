/**
 * loadSupplyChain()
 *
 * Loads the unified REE supply-chain dataset produced by
 * `scripts/build_supply_chain.py`. The preprocessor does the heavy lifting
 * (xlsx parsing, fuzzy join, Nominatim geocoding) server-side and writes a
 * single JSON to webapp/public/supply_chain.json. This loader just fetches it
 * and adds a browser-side safety-net geocoder for any nodes still missing
 * coordinates (caches hits in localStorage so the ask is one-time).
 *
 * Return shape:
 *   {
 *     meta:  { generated_at, counts: {...}, schema_version },
 *     nodes: [ { id, type, name, lat, lng, ... } ],
 *     edges: [ { id, from_id, to_id, material, volume_tons_per_year, ... } ],
 *   }
 */

const CACHE_KEY = 'ree_geocode_cache_v1'
const UA_QUERY = 'HackSummit-REE'

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') }
  catch { return {} }
}
function saveCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch {}
}

async function nominatim(query, cache) {
  if (!query) return null
  if (query in cache) return cache[query]
  try {
    const url = 'https://nominatim.openstreetmap.org/search?'
      + new URLSearchParams({ q: query, format: 'json', limit: '1' })
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const coord = data[0] ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null
    cache[query] = coord
    saveCache(cache)
    return coord
  } catch (e) {
    console.warn(`[${UA_QUERY}] nominatim failed for`, query, e)
    cache[query] = null
    saveCache(cache)
    return null
  }
}

/**
 * Fill in coordinates for any nodes the Python preprocessor flagged
 * `geocoded: false`. Respects Nominatim's 1 req/sec policy with a simple gap.
 */
async function patchMissingCoords(nodes) {
  const missing = nodes.filter(n => !n.geocoded && n.lat == null)
  if (missing.length === 0) return nodes
  const cache = loadCache()
  let last = 0
  for (const n of missing) {
    const q = n.location_text || (n.name && n.country ? `${n.name}, ${n.country}` : n.country)
    const gap = 1050 - (performance.now() - last)
    if (gap > 0 && !(q in cache)) await new Promise(r => setTimeout(r, gap))
    const hit = await nominatim(q, cache)
    last = performance.now()
    if (hit) {
      n.lat = +hit[0].toFixed(5)
      n.lng = +hit[1].toFixed(5)
      n.precision = 'browser_geocoded'
      n.geocoded = true
    }
  }
  return nodes
}

export async function loadSupplyChain({ patchMissing = true } = {}) {
  const base = import.meta.env.BASE_URL
  const res = await fetch(base + 'supply_chain.json', { cache: 'default' })
  if (!res.ok) throw new Error(`Failed to load supply_chain.json: HTTP ${res.status}`)
  const bundle = await res.json()
  if (patchMissing) await patchMissingCoords(bundle.nodes)
  // Index for consumers that want O(1) upstream/downstream traversal.
  const byId = new Map(bundle.nodes.map(n => [n.id, n]))
  const outgoing = new Map()
  const incoming = new Map()
  for (const e of bundle.edges) {
    if (!outgoing.has(e.from_id)) outgoing.set(e.from_id, [])
    if (!incoming.has(e.to_id))   incoming.set(e.to_id, [])
    outgoing.get(e.from_id).push(e)
    incoming.get(e.to_id).push(e)
  }
  return { ...bundle, byId, outgoing, incoming }
}

/** Walk the graph collecting every node reachable upstream/downstream. */
export function connectedNodeIds(startId, graph, direction = 'both', maxHops = 4) {
  const seen = new Set([startId])
  const queue = [[startId, 0]]
  while (queue.length) {
    const [id, d] = queue.shift()
    if (d >= maxHops) continue
    if (direction !== 'downstream') {
      for (const e of graph.incoming.get(id) || []) {
        if (!seen.has(e.from_id)) { seen.add(e.from_id); queue.push([e.from_id, d + 1]) }
      }
    }
    if (direction !== 'upstream') {
      for (const e of graph.outgoing.get(id) || []) {
        if (!seen.has(e.to_id)) { seen.add(e.to_id); queue.push([e.to_id, d + 1]) }
      }
    }
  }
  return seen
}
