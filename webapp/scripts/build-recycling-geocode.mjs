/**
 * One-off: read recycling_facilities_cleaned.xlsx, geocode each unique
 * city+country, write public/data/recycling_facilities_locations.json ([lon, lat] per key).
 *
 *   cd webapp && npm run build:recycle-geo
 *
 * Regenerates public/data/recycling_facilities_locations.json (lon/lat per city key).
 * Uses Photon (then Nominatim) with limited concurrency. Requires network.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import { geocodeKey, locationCacheKey } from '../src/lib/recyclingData.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// webapp/scripts -> repo root
const REPO = path.join(__dirname, '../..')
const XLSX_PATH = path.join(REPO, 'data/raw/recycling_facilities_cleaned.xlsx')
const OUT = path.join(__dirname, '../public/data/recycling_facilities_locations.json')
const CONCURRENCY = 5

function uniqueKeys (rows) {
  const list = []
  const seen = new Set()
  for (const r of rows) {
    const k = locationCacheKey(r.City ?? r.city, r.Country ?? r.country)
    if (seen.has(k)) continue
    seen.add(k)
    list.push({
      key: k,
      city: String(r.City ?? r.city ?? '').trim(),
      country: String(r.Country ?? r.country ?? '').trim(),
    })
  }
  return list
}

async function main () {
  const buf = fs.readFileSync(XLSX_PATH)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
  const keyList = uniqueKeys(json)
  const cache = {}
  let i = 0
  const total = keyList.length
  async function run () {
    for (;;) {
      const idx = i++
      if (idx >= total) return
      const { key, city, country } = keyList[idx]
      if ((idx + 1) % 20 === 0 || idx === 0) {
        process.stderr.write(`\r  ${idx + 1}/${total} `)
      }
      await geocodeKey(key, city, country, cache)
    }
  }
  process.stderr.write(`Geocoding ${total} unique places…\n`)
  await Promise.all(Array.from({ length: CONCURRENCY }, () => run()))
  process.stderr.write(`\nDone.\n`)
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, `${JSON.stringify(cache, null, 0)}\n`, 'utf8')
  // eslint-disable-next-line no-console
  console.log('Wrote', OUT, Object.keys(cache).length, 'keys')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
