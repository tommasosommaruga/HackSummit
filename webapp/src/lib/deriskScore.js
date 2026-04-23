/**
 * Location-only layer on top of the shared risk score baseline (PRESETS.eu_derisk + computeEntityScore).
 * Not an extra risk model — only distance to known REE recycling capacity from the spreadsheet.
 */
const EARTH_R_KM = 6371

export function haversineKm (lon1, lat1, lon2, lat2) {
  const toR = d => (d * Math.PI) / 180
  const dLat = toR(lat2 - lat1)
  const dLon = toR(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * @param {number} baseRiskScore — 0–100 from `computeEntityScore(PRESETS.eu_derisk)` in the app
 * @param {number} nearestReeKm — km to closest EU REE recycling site (from data)
 * @returns {{ deriskIndex: number, accessScore: number }} — 0–100, higher = better recycling leverage
 */
export function computeDeriskFromDistance (baseRiskScore, nearestReeKm) {
  const km = Math.max(0, Number(nearestReeKm) || 0)
  // 0 km → 100 access; ~900 km+ → very low
  const accessScore = 100 * Math.exp(-km / 420)
  const headroom = Math.max(0, Math.min(100, 100 - baseRiskScore))
  const deriskIndex = Math.round(
    0.38 * headroom + 0.62 * accessScore,
  )
  return {
    deriskIndex: Math.max(0, Math.min(100, deriskIndex)),
    accessScore: Math.max(0, Math.min(100, Math.round(accessScore))),
  }
}

/**
 * @param {Array<{id?:string,lon:number,lat:number}>} facilities
 * @param {number} lon
 * @param {number} lat
 * @param {{ excludeId?: string }} [opts] — skip this id (e.g. selected site when measuring distance to the next REE)
 */
export function nearestKm (facilities, lon, lat, opts = {}) {
  const skip = opts.excludeId
  let best = Infinity
  for (const f of facilities) {
    if (skip != null && f.id === skip) continue
    if (!Number.isFinite(f.lon) || !Number.isFinite(f.lat)) continue
    const d = haversineKm(lon, lat, f.lon, f.lat)
    if (d < best) best = d
  }
  return best === Infinity ? null : best
}

export function sortFacilitiesByDistance (facilities, lon, lat) {
  return [...facilities]
    .map(f => ({
      ...f,
      _km: Number.isFinite(f.lon) && Number.isFinite(f.lat)
        ? haversineKm(lon, lat, f.lon, f.lat)
        : null,
    }))
    .sort((a, b) => (a._km ?? 1e9) - (b._km ?? 1e9))
}
