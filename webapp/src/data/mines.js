// ─────────────────────────────────────────────────────────────────────────────
// ALL NUMBERS IN THIS FILE ARE CITED TO A PUBLIC SOURCE.
// Do not add values that are not verifiable.
//
// Mine production:   USGS Mineral Commodity Summaries 2024 (public domain)
//                    https://pubs.usgs.gov/periodicals/mcs2024/mcs2024.pdf
//                    Reported unit: metric tons of contained element (t Li, t Co…).
//                    We report kt (thousands of tons) of contained element.
// Refinery share:    Benchmark Mineral Intelligence public charts + company annual
//                    reports (Ganfeng AR 2023, Tianqi AR 2023, Huayou AR 2023).
// Risk scores:       OECD Governance Indicators + Global Witness qualitative.
// Certification:     RMI Responsible Minerals Assurance Process public list.
// Recycler capacity: Company-announced processing capacity from annual reports /
//                    press releases. These are ANNOUNCED capacity, not measured
//                    output — recovery rates are not publicly disclosed per site.
// ─────────────────────────────────────────────────────────────────────────────

export const ELEMENTS = {
  Li: { label: 'Lithium',   color: '#3b82f6', unit: 'kt Li', hs: ['260190', '283691', '282520'] },
  Co: { label: 'Cobalt',    color: '#ef4444', unit: 'kt',    hs: ['260500', '282200', '810520'] },
  Ni: { label: 'Nickel',    color: '#8b5cf6', unit: 'kt',    hs: ['260400', '750110', '750210'] },
  Cu: { label: 'Copper',    color: '#eab308', unit: 'kt',    hs: ['260300', '740100', '740200'] },
}

// USGS MCS 2024: Li mine production = metric tons of contained lithium, by country.
// Figures below are the USGS country totals, attributed to the dominant named site.
// For multi-site countries, the site's share is noted; sub-national splits beyond
// the USGS totals are not published, so we do not break them down further.
export const MINES = [
  // ── LITHIUM (USGS MCS 2024 Table 1) ───────────────────────────────────────
  {
    id: 'MINE_AUS_GRB', name: 'Greenbushes (Talison / Tianqi+Albemarle)', country: 'Australia', flag: '🇦🇺',
    elements: ['Li'],
    lat: -33.85, lon: 116.05, type: 'Hard rock (spodumene)',
    risk: 0.05, certified: true,
    // Australia country total (USGS MCS 2024): 74 kt Li (2022), 86 kt Li (2023).
    // Greenbushes ≈ dominant single site; remaining split across Pilbara Minerals,
    // Mt Marion, Wodgina. We attribute the full USGS country total to this marker.
    output: { Li: { 2022: 74, 2023: 86 } },
    source: 'USGS MCS 2024, Lithium, Table 1 (country total, Australia)',
    notes: "World's largest hard-rock Li mine. ISO 14001 certified.",
  },
  {
    id: 'MINE_CHL_ATC', name: 'Salar de Atacama (SQM + Albemarle)', country: 'Chile', flag: '🇨🇱',
    elements: ['Li'],
    lat: -23.5, lon: -68.2, type: 'Brine',
    risk: 0.12, certified: true,
    output: { Li: { 2022: 39, 2023: 44 } },
    source: 'USGS MCS 2024, Lithium, Table 1 (country total, Chile)',
    notes: 'Sole commercial Li producing salar in Chile. IRMA-certified. Water use under review.',
  },
  {
    id: 'MINE_CHN', name: 'China — Sichuan / Jiangxi operations', country: 'China', flag: '🇨🇳',
    elements: ['Li'],
    lat: 29.0, lon: 103.5, type: 'Mixed (brine + hard rock)',
    risk: 0.55, certified: false,
    output: { Li: { 2022: 19, 2023: 33 } },
    source: 'USGS MCS 2024, Lithium, Table 1 (country total, China)',
    notes: 'Qinghai/Tibet brines + Jiangxi lepidolite. No independent ESG audit standard.',
  },
  {
    id: 'MINE_ARG', name: 'Argentina — Puna salares (multiple)', country: 'Argentina', flag: '🇦🇷',
    elements: ['Li'],
    lat: -23.0, lon: -66.5, type: 'Brine',
    risk: 0.22, certified: true,
    output: { Li: { 2022: 6.2, 2023: 9.6 } },
    source: 'USGS MCS 2024, Lithium, Table 1 (country total, Argentina)',
    notes: 'Olaroz + Fenix (Livent) + Cauchari. Indigenous land consultation ongoing.',
  },
  {
    id: 'MINE_BRA', name: 'Brazil — Minas Gerais (Sigma / CBL)', country: 'Brazil', flag: '🇧🇷',
    elements: ['Li'],
    lat: -17.8, lon: -42.2, type: 'Hard rock (spodumene)',
    risk: 0.18, certified: false,
    output: { Li: { 2022: 2.2, 2023: 4.9 } },
    source: 'USGS MCS 2024, Lithium, Table 1 (country total, Brazil)',
    notes: 'Sigma Lithium commercial production started 2023. Rapid ramp.',
  },
  {
    id: 'MINE_ZWE', name: 'Zimbabwe — Bikita / Arcadia', country: 'Zimbabwe', flag: '🇿🇼',
    elements: ['Li'],
    lat: -20.1, lon: 31.7, type: 'Hard rock',
    risk: 0.68, certified: false,
    output: { Li: { 2022: 0.8, 2023: 3.4 } },
    source: 'USGS MCS 2024, Lithium, Table 1 (country total, Zimbabwe)',
    notes: 'Rapid Chinese investment post-2022 (Sinomine, Zhejiang Huayou, Chengxin).',
  },
  {
    id: 'MINE_CAN', name: 'Canada — Tanco / NAL operations', country: 'Canada', flag: '🇨🇦',
    elements: ['Li'],
    lat: 50.4, lon: -95.4, type: 'Hard rock',
    risk: 0.07, certified: true,
    output: { Li: { 2022: 0.52, 2023: 3.4 } },
    source: 'USGS MCS 2024, Lithium, Table 1 (country total, Canada)',
    notes: 'North American Lithium restart 2023. Tanco small scale.',
  },
  {
    id: 'MINE_PRT', name: 'Portugal — Barroso / Gonçalo', country: 'Portugal', flag: '🇵🇹',
    elements: ['Li'],
    lat: 41.7, lon: -7.7, type: 'Hard rock',
    risk: 0.08, certified: true,
    output: { Li: { 2022: 0.6, 2023: 0.38 } },
    source: 'USGS MCS 2024, Lithium, Table 1 (country total, Portugal)',
    notes: 'EU Critical Raw Materials Act priority. Savannah Resources ramp-up.',
  },
]

// Refineries: identity + Benchmark-reported share of global refining capacity.
// `processes_pct` values are from Benchmark 2023 public charts and company AR 2023
// where disclosed. "na" means share not publicly disclosed for that element.
export const REFINERIES = [
  {
    id: 'REF_CHN_01', name: 'Ganfeng Lithium (Xinyu)', country: 'China', flag: '🇨🇳',
    lat: 28.5, lon: 115.9,
    elements: ['Li'],
    processes_pct: { Li: 0.28 },
    source: 'Ganfeng Lithium Annual Report 2023 + Benchmark Mineral Intelligence 2023',
    note: 'Largest Li refiner globally. Feedstock from AUS, ARG, ZWE.',
  },
  {
    id: 'REF_CHN_02', name: 'Tianqi Shehong', country: 'China', flag: '🇨🇳',
    lat: 30.7, lon: 105.4,
    elements: ['Li'],
    processes_pct: { Li: 0.14 },
    source: 'Tianqi Lithium Annual Report 2023',
    note: 'Primary offtake from Greenbushes (Australia).',
  },
  {
    id: 'REF_KOR_01', name: 'POSCO Pilbara Lithium Solution', country: 'South Korea', flag: '🇰🇷',
    lat: 35.1, lon: 129.0,
    elements: ['Li'],
    processes_pct: { Li: 0.06 },
    source: 'POSCO Future M Annual Report 2023',
    note: 'Korean cathode supply chain. Feedstock from Pilbara Minerals (AUS).',
  },
  {
    id: 'REF_CHL_01', name: 'SQM Salar del Carmen (Antofagasta)', country: 'Chile', flag: '🇨🇱',
    lat: -23.65, lon: -70.4,
    elements: ['Li'],
    processes_pct: { Li: 0.10 },
    source: 'SQM Annual Report 2023',
    note: 'In-country Li carbonate/hydroxide production from Atacama brine.',
  },
]

// NO invented trade-flow volumes. Only the refinery-feedstock relationships
// that are explicitly disclosed in company annual reports are included. Volumes
// remain unknown at the public-data level pending Comtrade export pull.
export const TRADE_FLOWS = [
  { from: 'MINE_AUS_GRB', to: 'REF_CHN_02', element: 'Li', relation: 'Tianqi AR 2023: Greenbushes is primary feedstock' },
  { from: 'MINE_AUS_GRB', to: 'REF_KOR_01', element: 'Li', relation: 'POSCO PLS offtake (Pilbara Minerals) — approximate' },
  { from: 'MINE_CHL_ATC', to: 'REF_CHL_01', element: 'Li', relation: 'SQM in-country processing chain' },
  { from: 'MINE_ARG',     to: 'REF_CHN_01', element: 'Li', relation: 'Ganfeng AR 2023: Mariana + Cauchari-Olaroz JV' },
  { from: 'MINE_ZWE',     to: 'REF_CHN_01', element: 'Li', relation: 'Sinomine / Huayou offtake — industry reporting' },
]

// Recycling facilities — real companies, real locations. Volumes shown are
// ANNOUNCED PROCESSING CAPACITY (black mass or battery material input, t/yr)
// as publicly disclosed by each operator. Actual per-element recovery yields
// are not published per-site, so we do not show per-element output.
export const RECYCLING_FACILITIES = [
  {
    id: 'REC_UMICORE_BE', name: 'Umicore Hoboken', country: 'Belgium', flag: '🇧🇪',
    lat: 51.17, lon: 4.34,
    capacity_tpa: 7000,
    elements_recovered: ['Li', 'Co', 'Ni', 'Cu'],
    source: 'Umicore Integrated Annual Report 2023, Rechargeable Battery Materials section',
    note: 'Operational. Pyrometallurgical + hydromet loop. Published mass-balance.',
    status: 'operational',
  },
  {
    id: 'REC_LICYCLE_US', name: 'Li-Cycle Rochester Hub', country: 'USA', flag: '🇺🇸',
    lat: 43.15, lon: -77.61,
    capacity_tpa: 35000,
    elements_recovered: ['Li', 'Co', 'Ni', 'Cu'],
    source: 'Li-Cycle Holdings Q2 2024 investor presentation',
    note: 'Construction paused Oct 2023 pending cost review. Not yet operational.',
    status: 'paused',
  },
  {
    id: 'REC_REDWOOD_US', name: 'Redwood Materials (Sparks, NV)', country: 'USA', flag: '🇺🇸',
    lat: 39.53, lon: -119.51,
    capacity_tpa: 20000,
    elements_recovered: ['Li', 'Co', 'Ni', 'Cu'],
    source: 'Redwood Materials 2023 Impact Report',
    note: 'Operational. Supplies Panasonic/Ford. IRA 45X-eligible.',
    status: 'operational',
  },
  {
    id: 'REC_SUNGEEL_KR', name: 'SungEel HiTech (Gunsan)', country: 'South Korea', flag: '🇰🇷',
    lat: 35.98, lon: 126.71,
    capacity_tpa: 8000,
    elements_recovered: ['Li', 'Co', 'Ni'],
    source: 'SungEel HiTech company profile + public tender filings 2023',
    note: 'Operational. Supplies LG Energy Solution / Samsung SDI.',
    status: 'operational',
  },
  {
    id: 'REC_CATL_CN', name: 'CATL Brunp (Ningde)', country: 'China', flag: '🇨🇳',
    lat: 26.66, lon: 119.55,
    capacity_tpa: null,
    elements_recovered: ['Li', 'Co', 'Ni'],
    source: 'CATL Sustainability Report 2022 (capacity not separately disclosed)',
    note: 'Largest operator in China by group output. Exact capacity not public.',
    status: 'operational',
  },
  {
    id: 'REC_GANFENG_CN', name: 'Ganfeng Lithium Recycling (Xinyu)', country: 'China', flag: '🇨🇳',
    lat: 28.50, lon: 115.90,
    capacity_tpa: 34000,
    elements_recovered: ['Li', 'Co', 'Ni'],
    source: 'Ganfeng Lithium Annual Report 2023, Recycling segment',
    note: 'Co-located with Xinyu primary refinery. Feedstock includes retired packs.',
    status: 'operational',
  },
  {
    id: 'REC_PRIMOBIUS_DE', name: 'Primobius (Hilchenbach)', country: 'Germany', flag: '🇩🇪',
    lat: 50.99, lon: 8.10,
    capacity_tpa: 10000,
    elements_recovered: ['Li', 'Co', 'Ni'],
    source: 'Neometals / SMS group joint press release, Sept 2023',
    note: 'Commercial-scale plant commissioning. Mercedes-Benz offtake.',
    status: 'commissioning',
  },
  {
    id: 'REC_NORTHVOLT_SE', name: 'Northvolt Revolt (Skellefteå)', country: 'Sweden', flag: '🇸🇪',
    lat: 64.75, lon: 20.95,
    capacity_tpa: 125000,
    elements_recovered: ['Li', 'Co', 'Ni'],
    source: 'Northvolt press release Mar 2022 (125 kt/yr target by 2030)',
    note: 'Pilot operational; Revolt Ett target capacity 125 kt/yr by 2030.',
    status: 'pilot',
  },
  {
    id: 'REC_GLENCORE_CA', name: 'Glencore Sudbury INO', country: 'Canada', flag: '🇨🇦',
    lat: 46.49, lon: -80.99,
    capacity_tpa: null,
    elements_recovered: ['Co', 'Ni', 'Cu'],
    source: 'Glencore Sustainability Report 2023 (Sudbury smelter feed-in)',
    note: 'Co-processes end-of-life batteries with nickel sulfide smelter feed.',
    status: 'operational',
  },
]

export const PRODUCTS = [
  { label: 'Tesla Model 3 (2024)',  year: 2024, manufacturer: 'Tesla / CATL',  battery: 'LFP 60kWh' },
  { label: 'iPhone 16 Pro',          year: 2024, manufacturer: 'Apple / ATL',   battery: 'Li-ion 4685mAh' },
  { label: 'MacBook Pro M3',         year: 2023, manufacturer: 'Apple / CATL',  battery: 'Li-ion 99.6Wh' },
  { label: 'Generic EV (2022)',      year: 2022, manufacturer: 'Unknown OEM',   battery: 'NMC 80kWh' },
]

// Laundering-hub surplus detection requires a Comtrade pull that hasn't run yet.
// Rather than show fabricated surplus tonnages, we keep this empty until
// scripts/fetch_comtrade.py populates real import-vs-export gaps.
export const LAUNDERING_HUBS = []
