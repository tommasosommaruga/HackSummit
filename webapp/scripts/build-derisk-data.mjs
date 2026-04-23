/**
 * Builds public/data/derisk_eu_bundle.json from data/raw/recycling_facilities_cleaned.xlsx
 * (Recycling Operators sheet) + public/data/recycling_facilities_locations.json.
 *
 *   cd webapp && npm run build:derisk-data
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import {
  locationCacheKey,
  COUNTRY_CENTROIDS,
  parseLatLngFromRow,
  jitterLonLat,
} from '../src/lib/recyclingData.js'
import { isEuropeSpreadsheetCountry } from '../src/lib/europeCountry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.join(__dirname, '../..')
const XLSX_PATH = path.join(REPO, 'data/raw/recycling_facilities_cleaned.xlsx')
const LOC_PATH = path.join(__dirname, '../public/data/recycling_facilities_locations.json')
const OUT = path.join(__dirname, '../public/data/derisk_eu_bundle.json')

function isReeType (typeRaw) {
  return /^ree\s*recycling$/i.test(String(typeRaw ?? '').trim())
}

/** Mainland / continental Europe (excludes overseas territories, Caribbean, etc.). */
function inGeographicEurope (lon, lat) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false
  return lat > 35 && lat < 72 && lon > -10.5 && lon < 40
}

function lonLatForRow (r, loc, rowIdx) {
  const p = parseLatLngFromRow(r)
  if (p) return { lon: p[0], lat: p[1] }
  const k = locationCacheKey(r.City, r.Country)
  if (loc[k]) return { lon: loc[k][0], lat: loc[k][1] }
  const c = String(r.Country ?? '').toUpperCase().trim()
  const cent = COUNTRY_CENTROIDS[c]
  if (cent) {
    const j = jitterLonLat(`${k || 'k'}|${rowIdx}`, cent[0], cent[1])
    return { lon: j[0], lat: j[1] }
  }
  return null
}

function main () {
  const buf = fs.readFileSync(XLSX_PATH)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const sheet = wb.Sheets['Recycling Operators'] ?? wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  const loc = JSON.parse(fs.readFileSync(LOC_PATH, 'utf8'))

  const reeEu = []

  rows.forEach((r, i) => {
    const country = r.Country ?? r.country
    if (!isEuropeSpreadsheetCountry(country)) return
    const type = String(r.Type ?? r.type ?? '').trim()
    if (!isReeType(type)) return
    const operator = String(r.Operator ?? r.operator ?? '').trim() || '—'
    const city = String(r.City ?? r.city ?? '').trim() || '—'
    const ll = lonLatForRow(r, loc, i)
    if (!ll) return
    if (!inGeographicEurope(ll.lon, ll.lat)) return
    reeEu.push({
      id: `eu-${i}`,
      rowIndex: i,
      operator,
      city,
      country: String(country).trim(),
      type,
      lon: ll.lon,
      lat: ll.lat,
    })
  })

  const out = {
    _meta: {
      source: 'data/raw/recycling_facilities_cleaned.xlsx (Recycling Operators)',
      generated: new Date().toISOString(),
      reeRecyclingFacilitiesEurope: reeEu.length,
    },
    reeEuFacilities: reeEu,
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 0)}\n`, 'utf8')
  // eslint-disable-next-line no-console
  console.log('Wrote', OUT, reeEu.length, 'REE-only EU sites')
}

main()
