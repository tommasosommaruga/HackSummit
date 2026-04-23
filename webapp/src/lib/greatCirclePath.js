/**
 * Sample a great-circle from a→b in EPSG:4326 (lng, lat), same logic as the former
 * PathLayer path in SupplyChainMap.
 */
export function greatCirclePath (a, b, steps = 32) {
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
    if (prevLon != null) {
      while (lon - prevLon > 180) lon -= 360
      while (lon - prevLon < -180) lon += 360
    }
    prevLon = lon
    pts.push([lon, (lat * 180) / Math.PI])
  }
  return pts
}
