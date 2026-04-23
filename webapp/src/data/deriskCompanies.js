/**
 * Companies searchable on the Derisk page. Each `signalPreset` uses the same 15
 * keys as `PRESETS` in scoring.js; `riskScore` is always `computeEntityScore(signalPreset)`.
 * Adjustments to `eu_derisk` reflect documented “supply-mix” emphasis (e.g. trade/doc signals).
 */
import { PRESETS } from './scoring.js'

const EU = { ...PRESETS.eu_derisk }

const merge = (/** @type {Record<string, number>} */ p) => ({ ...EU, ...p })

export const DERISK_COMPANIES = [
  {
    id: 'bmw',
    name: 'BMW Group',
    aliases: ['bmw', 'bayerische motoren', 'bayerische motoren werke'],
    country: 'Germany',
    city: 'Munich',
    lon: 11.576124,
    lat: 48.137154,
    industry: 'Automotive OEM',
    details:
      'EU HQs. Supply-chain and magnet/REE exposure modelled with EU-regulated baseline plus slightly elevated trade- and compliance-documentation signals (multi-tier global suppliers).',
    signalPreset: merge({ df1: 0.4, df3: 0.34, mr1: 0.35 }),
  },
  {
    id: 'mercedes_benz',
    name: 'Mercedes-Benz Group',
    aliases: ['mercedes', 'daimler', 'mb', 'mercedes-benz'],
    country: 'Germany',
    city: 'Stuttgart',
    lon: 9.182932,
    lat: 48.775846,
    industry: 'Automotive OEM',
    details: 'EU HQs. Same signal engine as the Risk Scoring page; profile aligned with `eu_derisk` with marginally higher document-chain variance.',
    signalPreset: merge({ df1: 0.38, df2: 0.24 }),
  },
  {
    id: 'volkswagen',
    name: 'Volkswagen Group',
    aliases: ['volkswagen', 'vw', 'v w', 'vag'],
    country: 'Germany',
    city: 'Wolfsburg',
    lon: 10.787272,
    lat: 52.42265,
    industry: 'Automotive OEM',
    details: 'EU HQs. High-volume global supply chains; model uses EU baseline with moderate fraud/trade-signal weighting for documentation risk.',
    signalPreset: merge({ df1: 0.36, df4: 0.3, mr1: 0.33 }),
  },
  {
    id: 'stellantis',
    name: 'Stellantis',
    aliases: ['stellantis', 'psa', 'fiat chrysler'],
    country: 'Netherlands',
    city: 'Amsterdam (statutory)',
    lon: 4.9041389,
    lat: 52.3675734,
    industry: 'Automotive OEM',
    details: 'EU statutory seat. Multi-brand OEM; `eu_derisk` profile with import-documentation emphasis.',
    signalPreset: merge({ df1: 0.37, df3: 0.32 }),
  },
  {
    id: 'volvo_cars',
    name: 'Volvo Cars',
    aliases: ['volvo', 'volvo cars'],
    country: 'Sweden',
    city: 'Gothenburg',
    lon: 11.973036,
    lat: 57.715033,
    industry: 'Automotive OEM',
    details: 'EU/EEA production footprint; scoring uses the shared Bayesian model with European structural priors.',
    signalPreset: merge({ fl4: 0.18, df1: 0.33 }),
  },
  {
    id: 'renault',
    name: 'Renault Group',
    aliases: ['renault', 'renault group'],
    country: 'France',
    city: 'Boulogne-Billancourt',
    lon: 2.252896,
    lat: 48.829496,
    industry: 'Automotive OEM',
    details: 'France-based OEM; REE and magnet due diligence under EU context — same 15-signal engine.',
    signalPreset: merge({ df1: 0.35, df5: 0.27 }),
  },
  {
    id: 'siemens',
    name: 'Siemens',
    aliases: ['siemens', 'siemens ag'],
    country: 'Germany',
    city: 'Munich / Berlin (HQ)',
    lon: 13.377704,
    lat: 52.520008,
    industry: 'Industrial & electronics',
    details: 'Drives, turbines, and electronics — material traceability and certification complexity reflected in document/signal weighting vs pure `eu_derisk`.',
    signalPreset: merge({ df1: 0.39, df3: 0.33, mr1: 0.34 }),
  },
  {
    id: 'schneider',
    name: 'Schneider Electric',
    aliases: ['schneider', 'schneider electric'],
    country: 'France',
    city: 'Rueil-Malmaison',
    lon: 2.17028,
    lat: 48.881373,
    industry: 'Electrical equipment',
    details: 'EU HQs. Global sourcing of metals and components; same scoring API as other entries.',
    signalPreset: merge({ df1: 0.36, df2: 0.25 }),
  },
  {
    id: 'asml',
    name: 'ASML',
    aliases: ['asml'],
    country: 'Netherlands',
    city: 'Veldhoven',
    lon: 5.40435,
    lat: 51.412998,
    industry: 'Semiconductor equipment',
    details: 'Netherlands-based; supply-chain complexity and specialist materials — `eu_derisk` with modest moral-risk / ESG document signals.',
    signalPreset: merge({ mr1: 0.33, df1: 0.35 }),
  },
  {
    id: 'bosch',
    name: 'Robert Bosch',
    aliases: ['bosch', 'robert bosch'],
    country: 'Germany',
    city: 'Gerlingen (near Stuttgart)',
    lon: 9.060334,
    lat: 48.803889,
    industry: 'Automotive & industry supplier',
    details: 'Tier-1 supplier; exposure model uses EU baseline with supplier-chain documentation focus.',
    signalPreset: merge({ df1: 0.34, fl3: 0.3, mr1: 0.32 }),
  },
]

export function findDeriskCompanyMatches (query) {
  const t = String(query || '').trim().toLowerCase()
  if (t.length < 1) return []
  return DERISK_COMPANIES.filter(c => {
    if (c.name.toLowerCase().includes(t)) return true
    if (c.city.toLowerCase().includes(t)) return true
    if (c.country.toLowerCase().includes(t)) return true
    if (c.aliases?.some(a => t.includes(a) || a.includes(t))) return true
    return false
  })
}
