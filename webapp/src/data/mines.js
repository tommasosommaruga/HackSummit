// ─────────────────────────────────────────────────────────────────────────────
// Source: USGS Minerals Yearbook + Mineral Commodity Summaries (public domain)
// https://www.usgs.gov/centers/national-minerals-information-center
// Trade codes: UN Comtrade HS 2022
// Risk scores: OECD Governance indicators + Global Witness qualitative reports
// Certification: RMI Smelter Audit list (public CSV)
// ─────────────────────────────────────────────────────────────────────────────

export const ELEMENTS = {
  Li: { label: 'Lithium',   color: '#3b82f6', unit: 'kt LCE', hs: ['260190', '283691', '282520'] },
  Co: { label: 'Cobalt',    color: '#ef4444', unit: 'kt',     hs: ['260500', '282200', '810520'] },
  Ni: { label: 'Nickel',    color: '#8b5cf6', unit: 'kt',     hs: ['260400', '750110', '750210'] },
  Mn: { label: 'Manganese', color: '#f97316', unit: 'kt',     hs: ['260200', '282010'] },
  C:  { label: 'Graphite',  color: '#6b7280', unit: 'kt',     hs: ['250410'] },
  Cu: { label: 'Copper',    color: '#eab308', unit: 'kt',     hs: ['260300', '740100', '740200'] },
}

// output values: kt per year (USGS data, rounded)
export const MINES = [
  // ── LITHIUM ────────────────────────────────────────────────────────────────
  {
    id: 'ATL_CHL_01', name: 'Atacama SQM / Albemarle', country: 'Chile', flag: '🇨🇱',
    elements: ['Li'],
    risk: 0.12, lat: -23.5, lon: -68.0,
    type: 'Brine',
    output: {
      Li: { 2019: 88, 2020: 82, 2021: 100, 2022: 130, 2023: 180, 2024: 210 },
    },
    notes: 'Largest brine Li producer. IRMA-certified. Water use under regulatory review.',
    certified: true,
  },
  {
    id: 'PIL_AUS_01', name: 'Greenbushes (Tianqi/Albemarle)', country: 'Australia', flag: '🇦🇺',
    elements: ['Li'],
    risk: 0.05, lat: -33.85, lon: 116.05,
    type: 'Hard Rock',
    output: {
      Li: { 2019: 104, 2020: 95, 2021: 120, 2022: 145, 2023: 165, 2024: 180 },
    },
    notes: "World's largest hard-rock Li mine. ISO 14001 certified. JV Tianqi/Albemarle.",
    certified: true,
  },
  {
    id: 'PIL_ARG_01', name: 'Puna / Livent Fenix', country: 'Argentina', flag: '🇦🇷',
    elements: ['Li'],
    risk: 0.22, lat: -23.0, lon: -66.5,
    type: 'Brine',
    output: {
      Li: { 2019: 20, 2020: 22, 2021: 25, 2022: 30, 2023: 36, 2024: 42 },
    },
    notes: 'OECD-compliant. Indigenous land dispute (Atacameño community) pending 2023.',
    certified: true,
  },
  {
    id: 'ASM_BOL_01', name: 'Salar de Uyuni (YLB)', country: 'Bolivia', flag: '🇧🇴',
    elements: ['Li'],
    risk: 0.55, lat: -20.1, lon: -67.6,
    type: 'Brine / State',
    output: {
      Li: { 2019: 2, 2020: 2, 2021: 3, 2022: 4, 2023: 8, 2024: 15 },
    },
    notes: 'State monopoly (YLB). Rapidly scaling. Governance opacity. No independent audit.',
    certified: false,
  },
  {
    id: 'ZIM_LI_01', name: 'Bikita / Arcadia (Zhedar)', country: 'Zimbabwe', flag: '🇿🇼',
    elements: ['Li'],
    risk: 0.68, lat: -20.1, lon: 31.7,
    type: 'Hard Rock',
    output: {
      Li: { 2019: 3, 2020: 3, 2021: 5, 2022: 18, 2023: 40, 2024: 55 },
    },
    notes: 'Rapid Chinese investment post-2022. Governance concerns. Partial EITI compliance.',
    certified: false,
  },
  {
    id: 'POR_LI_01', name: 'Covas do Barroso (Savannah)', country: 'Portugal', flag: '🇵🇹',
    elements: ['Li'],
    risk: 0.08, lat: 41.7, lon: -7.7,
    type: 'Hard Rock',
    output: {
      Li: { 2019: 0, 2020: 0, 2021: 0, 2022: 1, 2023: 4, 2024: 8 },
    },
    notes: 'EU Critical Raw Materials Act priority project. High ESG standards. Ramp-up phase.',
    certified: true,
  },

  // ── COBALT ─────────────────────────────────────────────────────────────────
  {
    id: 'KOB_DRC_01', name: 'Kolwezi Basin (Glencore/ASM)', country: 'DRC', flag: '🇨🇩',
    elements: ['Co', 'Cu'],
    risk: 0.95, lat: -10.7, lon: 25.5,
    type: 'ASM + Industrial',
    output: {
      Co: { 2019: 75, 2020: 90, 2021: 108, 2022: 120, 2023: 130, 2024: 135 },
      Cu: { 2019: 1200, 2020: 1300, 2021: 1400, 2022: 1500, 2023: 1600, 2024: 1700 },
    },
    notes: 'DRC = ~70% global cobalt. Documented child labor (ASM zones). Some ICSLAs covered.',
    certified: false,
  },
  {
    id: 'ZMB_CO_01', name: 'Copperbelt Zambia', country: 'Zambia', flag: '🇿🇲',
    elements: ['Co', 'Cu'],
    risk: 0.35, lat: -12.8, lon: 28.2,
    type: 'Industrial',
    output: {
      Co: { 2019: 4, 2020: 3, 2021: 4, 2022: 5, 2023: 6, 2024: 7 },
      Cu: { 2019: 790, 2020: 800, 2021: 820, 2022: 850, 2023: 870, 2024: 890 },
    },
    notes: 'ICMM member. Better governance than DRC. Some EITI-compliant operations.',
    certified: true,
  },
  {
    id: 'AUS_CO_01', name: 'Murrin Murrin (Glencore)', country: 'Australia', flag: '🇦🇺',
    elements: ['Co', 'Ni'],
    risk: 0.06, lat: -28.7, lon: 121.9,
    type: 'Laterite Industrial',
    output: {
      Co: { 2019: 3, 2020: 3, 2021: 4, 2022: 4, 2023: 5, 2024: 5 },
      Ni: { 2019: 35, 2020: 37, 2021: 40, 2022: 42, 2023: 44, 2024: 46 },
    },
    notes: 'Fully certified, ICMM member. Low risk.',
    certified: true,
  },

  // ── NICKEL ─────────────────────────────────────────────────────────────────
  {
    id: 'IDN_NI_01', name: 'Sulawesi / Morowali (IMIP)', country: 'Indonesia', flag: '🇮🇩',
    elements: ['Ni'],
    risk: 0.62, lat: -2.2, lon: 121.9,
    type: 'Laterite Industrial',
    output: {
      Ni: { 2019: 350, 2020: 400, 2021: 600, 2022: 900, 2023: 1100, 2024: 1350 },
    },
    notes: 'Fastest growing Ni source. Chinese-owned HPAL plants. Labor rights + deforestation flags.',
    certified: false,
  },
  {
    id: 'PHL_NI_01', name: 'Palawan / Surigao Laterites', country: 'Philippines', flag: '🇵🇭',
    elements: ['Ni'],
    risk: 0.48, lat: 9.5, lon: 125.5,
    type: 'Laterite Saprolite',
    output: {
      Ni: { 2019: 280, 2020: 290, 2021: 310, 2022: 330, 2023: 340, 2024: 350 },
    },
    notes: 'Significant environmental concerns. DENR audits ongoing. Some sites suspended.',
    certified: false,
  },
  {
    id: 'RUS_NI_01', name: 'Norilsk (Nornickel)', country: 'Russia', flag: '🇷🇺',
    elements: ['Ni', 'Co', 'Cu'],
    risk: 0.72, lat: 69.3, lon: 88.2,
    type: 'Sulfide Industrial',
    output: {
      Ni: { 2019: 218, 2020: 216, 2021: 193, 2022: 207, 2023: 210, 2024: 205 },
      Co: { 2019: 6, 2020: 6, 2021: 6, 2022: 6, 2023: 6, 2024: 6 },
      Cu: { 2019: 400, 2020: 400, 2021: 370, 2022: 380, 2023: 375, 2024: 370 },
    },
    notes: 'Sanctioned post-2022. Major 2021 diesel spill. Not ICMM. Western buyers reducing exposure.',
    certified: false,
  },

  // ── GRAPHITE ───────────────────────────────────────────────────────────────
  {
    id: 'CHN_C_01', name: 'Heilongjiang / Shandong Mines', country: 'China', flag: '🇨🇳',
    elements: ['C'],
    risk: 0.55, lat: 47.0, lon: 128.0,
    type: 'Flake / Synthetic',
    output: {
      C: { 2019: 700, 2020: 700, 2021: 800, 2022: 850, 2023: 900, 2024: 950 },
    },
    notes: 'China = ~65% global graphite. No third-party ESG audit standard. Export controls 2023.',
    certified: false,
  },
  {
    id: 'MOZ_C_01', name: 'Balama (Syrah Resources)', country: 'Mozambique', flag: '🇲🇿',
    elements: ['C'],
    risk: 0.28, lat: -13.3, lon: 38.6,
    type: 'Flake',
    output: {
      C: { 2019: 15, 2020: 5, 2021: 20, 2022: 60, 2023: 100, 2024: 120 },
    },
    notes: 'ASX-listed, IRMA assessment in progress. Key alternative to Chinese graphite for EU.',
    certified: false,
  },

  // ── MANGANESE ──────────────────────────────────────────────────────────────
  {
    id: 'ZAF_MN_01', name: 'Kalahari Manganese Field', country: 'South Africa', flag: '🇿🇦',
    elements: ['Mn'],
    risk: 0.18, lat: -27.5, lon: 22.5,
    type: 'Sedimentary Industrial',
    output: {
      Mn: { 2019: 5100, 2020: 4600, 2021: 5500, 2022: 6000, 2023: 6200, 2024: 6400 },
    },
    notes: "World's largest Mn resource. Mostly ICMM-compliant operators.",
    certified: true,
  },
  {
    id: 'AUS_MN_01', name: 'Groote Eylandt (GEMCO/BHP)', country: 'Australia', flag: '🇦🇺',
    elements: ['Mn'],
    risk: 0.07, lat: -14.0, lon: 136.5,
    type: 'Surface Industrial',
    output: {
      Mn: { 2019: 2500, 2020: 2100, 2021: 2400, 2022: 2300, 2023: 2400, 2024: 2500 },
    },
    notes: 'ICMM member. High ESG transparency. Cyclone disruption 2023.',
    certified: true,
  },
]

export const REFINERIES = [
  {
    id: 'REF_CHN_01', name: 'Ganfeng Lithium (Xinyu)', country: 'China', flag: '🇨🇳',
    lat: 28.5, lon: 115.9,
    elements: ['Li', 'Co'],
    processes_pct: { Li: 0.28, Co: 0.12 },
    note: 'Largest Li refiner globally. Processes ore from AUS, ARG, ZIM.',
  },
  {
    id: 'REF_CHN_02', name: 'Tianqi Shehong', country: 'China', flag: '🇨🇳',
    lat: 30.7, lon: 105.4,
    elements: ['Li'],
    processes_pct: { Li: 0.14 },
    note: 'Primary offtake from Greenbushes AUS.',
  },
  {
    id: 'REF_CHN_03', name: 'Zhejiang Huayou Cobalt', country: 'China', flag: '🇨🇳',
    lat: 30.6, lon: 120.5,
    elements: ['Co', 'Ni'],
    processes_pct: { Co: 0.22, Ni: 0.08 },
    note: 'Dominant Co refiner. Sources from DRC Kolwezi. Under OECD scrutiny.',
  },
  {
    id: 'REF_KOR_01', name: 'POSCO HY Clean Metal', country: 'South Korea', flag: '🇰🇷',
    lat: 35.9, lon: 128.6,
    elements: ['Li', 'Ni'],
    processes_pct: { Li: 0.06, Ni: 0.05 },
    note: 'Korean battery supply chain. Sources from AUS and POR.',
  },
  {
    id: 'REF_FIN_01', name: 'Norilsk Harjavalta (Boliden)', country: 'Finland', flag: '🇫🇮',
    lat: 61.3, lon: 22.1,
    elements: ['Ni', 'Co'],
    processes_pct: { Ni: 0.04, Co: 0.03 },
    note: 'EU-based refinery. Reducing Russian feedstock post-2022.',
  },
  {
    id: 'REF_CHL_01', name: 'SQM Antofagasta', country: 'Chile', flag: '🇨🇱',
    lat: -23.65, lon: -70.4,
    elements: ['Li'],
    processes_pct: { Li: 0.10 },
    note: 'In-country Li carbonate/hydroxide production.',
  },
]

export const LAUNDERING_HUBS = [
  {
    id: 'HUB_MYS', country: 'Malaysia', flag: '🇲🇾', lat: 3.1, lon: 101.7,
    elements: ['Co', 'Li'],
    surplus_kt: { 2020: 5, 2021: 18, 2022: 42, 2023: 38, 2024: 35 },
    note: 'Re-exports exceed domestic production + legal imports. Key DRC cobalt transit point.',
  },
  {
    id: 'HUB_PHL', country: 'Philippines', flag: '🇵🇭', lat: 14.6, lon: 121.0,
    elements: ['Ni', 'Co'],
    surplus_kt: { 2020: 3, 2021: 8, 2022: 18, 2023: 22, 2024: 25 },
    note: 'Nickel processing re-export anomaly. Volume spike unmatched by domestic mine records.',
  },
  {
    id: 'HUB_IDN', country: 'Indonesia', flag: '🇮🇩', lat: -6.2, lon: 106.8,
    elements: ['Ni', 'Li'],
    surplus_kt: { 2020: 8, 2021: 12, 2022: 31, 2023: 29, 2024: 27 },
    note: 'Nickel-adjacent Li re-export. HPAL plants mixing origin streams.',
  },
  {
    id: 'HUB_ARE', country: 'UAE', flag: '🇦🇪', lat: 24.5, lon: 54.4,
    elements: ['Co', 'Li'],
    surplus_kt: { 2020: 2, 2021: 4, 2022: 9, 2023: 14, 2024: 18 },
    note: 'Emerging transit hub. Minimal domestic production. Rapid re-export growth post-2021.',
  },
]

export const TRADE_FLOWS = [
  // Cobalt — DRC to world
  { from: 'KOB_DRC_01', to: 'REF_CHN_03', element: 'Co', volume_kt: 80, risk: 'high' },
  { from: 'KOB_DRC_01', to: 'HUB_MYS',   element: 'Co', volume_kt: 12, risk: 'high' },
  { from: 'KOB_DRC_01', to: 'REF_FIN_01', element: 'Co', volume_kt: 5,  risk: 'high' },
  { from: 'ZMB_CO_01',  to: 'REF_CHN_03', element: 'Co', volume_kt: 5,  risk: 'medium' },
  { from: 'AUS_CO_01',  to: 'REF_KOR_01', element: 'Co', volume_kt: 4,  risk: 'low' },
  { from: 'HUB_MYS',   to: 'REF_CHN_03', element: 'Co', volume_kt: 11, risk: 'high' },

  // Lithium — mines to refineries
  { from: 'ATL_CHL_01', to: 'REF_CHL_01', element: 'Li', volume_kt: 60, risk: 'low' },
  { from: 'ATL_CHL_01', to: 'REF_KOR_01', element: 'Li', volume_kt: 30, risk: 'low' },
  { from: 'PIL_AUS_01', to: 'REF_CHN_02', element: 'Li', volume_kt: 90, risk: 'low' },
  { from: 'PIL_AUS_01', to: 'REF_KOR_01', element: 'Li', volume_kt: 25, risk: 'low' },
  { from: 'PIL_ARG_01', to: 'REF_CHN_01', element: 'Li', volume_kt: 20, risk: 'medium' },
  { from: 'ZIM_LI_01',  to: 'REF_CHN_01', element: 'Li', volume_kt: 35, risk: 'high' },
  { from: 'ASM_BOL_01', to: 'HUB_IDN',   element: 'Li', volume_kt: 6,  risk: 'high' },
  { from: 'HUB_IDN',   to: 'REF_CHN_01', element: 'Li', volume_kt: 5,  risk: 'high' },

  // Nickel
  { from: 'IDN_NI_01',  to: 'REF_CHN_03', element: 'Ni', volume_kt: 600, risk: 'high' },
  { from: 'PHL_NI_01',  to: 'REF_CHN_03', element: 'Ni', volume_kt: 200, risk: 'medium' },
  { from: 'AUS_CO_01',  to: 'REF_KOR_01', element: 'Ni', volume_kt: 30,  risk: 'low' },
  { from: 'RUS_NI_01',  to: 'REF_FIN_01', element: 'Ni', volume_kt: 80,  risk: 'high' },
  { from: 'HUB_PHL',   to: 'REF_CHN_03', element: 'Ni', volume_kt: 18,  risk: 'high' },

  // Graphite
  { from: 'CHN_C_01',  to: 'REF_CHN_01', element: 'C',  volume_kt: 500, risk: 'medium' },
  { from: 'MOZ_C_01',  to: 'REF_KOR_01', element: 'C',  volume_kt: 50,  risk: 'low' },

  // Manganese
  { from: 'ZAF_MN_01', to: 'REF_CHN_03', element: 'Mn', volume_kt: 3000, risk: 'low' },
  { from: 'AUS_MN_01', to: 'REF_KOR_01', element: 'Mn', volume_kt: 1200, risk: 'low' },
]

export const PRODUCTS = [
  { label: 'Tesla Model 3 (2024)', year: 2024, manufacturer: 'Tesla / CATL', battery: 'LFP 60kWh' },
  { label: 'iPhone 16 Pro', year: 2024, manufacturer: 'Apple / ATL', battery: 'Li-ion 4685mAh' },
  { label: 'MacBook Pro M3', year: 2023, manufacturer: 'Apple / CATL', battery: 'Li-ion 99.6Wh' },
  { label: 'Generic EV (2022)', year: 2022, manufacturer: 'Unknown OEM', battery: 'NMC 80kWh' },
]
