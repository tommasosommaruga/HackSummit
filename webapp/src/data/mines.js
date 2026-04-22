export const MINES = [
  {
    id: 'KOB_DRC_01', name: 'Kolwezi Basin', country: 'DRC', flag: '🇨🇩',
    risk: 0.95, lat: -10.7, lon: 25.5,
    type: 'ASM + Industrial',
    output: { 2019: 7000, 2020: 8000, 2021: 9500, 2022: 10000, 2023: 9000, 2024: 9200 },
    notes: 'High ASM activity, documented child labor incidents (2021–2022). No third-party audit.',
    certified: false,
  },
  {
    id: 'ATL_CHL_01', name: 'Atacama SQM', country: 'Chile', flag: '🇨🇱',
    risk: 0.12, lat: -23.5, lon: -68.0,
    type: 'Brine Industrial',
    output: { 2019: 11000, 2020: 12000, 2021: 13000, 2022: 14000, 2023: 15000, 2024: 16000 },
    notes: 'IRMA certified. Brine extraction — water usage concerns but fully audited.',
    certified: true,
  },
  {
    id: 'PIL_ARG_01', name: 'Puna Triangle', country: 'Argentina', flag: '🇦🇷',
    risk: 0.22, lat: -23.0, lon: -66.5,
    type: 'Brine Industrial',
    output: { 2019: 4500, 2020: 5000, 2021: 6000, 2022: 7500, 2023: 8000, 2024: 8500 },
    notes: 'OECD-compliant. Indigenous land dispute pending since 2023.',
    certified: true,
  },
  {
    id: 'ASM_BOL_01', name: 'Salar de Uyuni (ASM)', country: 'Bolivia', flag: '🇧🇴',
    risk: 0.78, lat: -20.1, lon: -67.6,
    type: 'ASM Informal',
    output: { 2019: 1500, 2020: 2000, 2021: 3000, 2022: 3500, 2023: 4000, 2024: 4200 },
    notes: 'Informal extraction. No third-party audit on record. Output growing rapidly.',
    certified: false,
  },
  {
    id: 'PIL_AUS_01', name: 'Greenbushes', country: 'Australia', flag: '🇦🇺',
    risk: 0.05, lat: -33.85, lon: 116.05,
    type: 'Hard Rock Industrial',
    output: { 2019: 16000, 2020: 18000, 2021: 19000, 2022: 20000, 2023: 21000, 2024: 22000 },
    notes: "World's largest hard-rock lithium mine. Fully certified. Tianqi/Albemarle JV.",
    certified: true,
  },
  {
    id: 'ZIM_01', name: 'Bikita Minerals', country: 'Zimbabwe', flag: '🇿🇼',
    risk: 0.65, lat: -20.1, lon: 31.7,
    type: 'Hard Rock Semi-formal',
    output: { 2019: 1000, 2020: 1200, 2021: 2000, 2022: 3500, 2023: 5000, 2024: 6000 },
    notes: 'Rapid Chinese investment since 2022. Governance concerns. Partial audit.',
    certified: false,
  },
  {
    id: 'POR_01', name: 'Covas do Barroso', country: 'Portugal', flag: '🇵🇹',
    risk: 0.08, lat: 41.7, lon: -7.7,
    type: 'Hard Rock Industrial',
    output: { 2019: 0, 2020: 0, 2021: 0, 2022: 500, 2023: 1500, 2024: 3000 },
    notes: 'EU Critical Raw Materials Act project. High ESG standards. Early stage.',
    certified: true,
  },
]

export const REFINERIES = [
  { id: 'REF_CHN_01', name: 'Ganfeng Lithium HQ', country: 'China', flag: '🇨🇳', lat: 28.5, lon: 115.9, processes_pct: 0.58 },
  { id: 'REF_CHN_02', name: 'Tianqi Shehong', country: 'China', flag: '🇨🇳', lat: 30.7, lon: 105.4, processes_pct: 0.14 },
  { id: 'REF_KOR_01', name: 'POSCO HY Clean Metal', country: 'South Korea', flag: '🇰🇷', lat: 35.9, lon: 128.6, processes_pct: 0.06 },
  { id: 'REF_CHL_01', name: 'SQM Antofagasta', country: 'Chile', flag: '🇨🇱', lat: -23.65, lon: -70.4, processes_pct: 0.08 },
]

export const LAUNDERING_HUBS = [
  { id: 'HUB_MYS', country: 'Malaysia', flag: '🇲🇾', lat: 3.1, lon: 101.7, surplus_kt: { 2021: 18, 2022: 42, 2023: 38 }, note: 'Re-exports exceed domestic production + legal imports' },
  { id: 'HUB_PHL', country: 'Philippines', flag: '🇵🇭', lat: 14.6, lon: 121.0, surplus_kt: { 2021: 8, 2022: 18, 2023: 22 }, note: 'Sudden volume spike 2022–2023 not matched by mining records' },
  { id: 'HUB_IDN', country: 'Indonesia', flag: '🇮🇩', lat: -6.2, lon: 106.8, surplus_kt: { 2021: 12, 2022: 31, 2023: 29 }, note: 'Nickel-adjacent processing; lithium re-export under scrutiny' },
]

// Trade flow arcs: mine → refinery (major routes)
export const TRADE_FLOWS = [
  { from: 'KOB_DRC_01', to: 'REF_CHN_01', volume_kt: 6.2, risk: 'high' },
  { from: 'KOB_DRC_01', to: 'HUB_MYS',   volume_kt: 2.1, risk: 'high' },
  { from: 'ATL_CHL_01', to: 'REF_CHL_01', volume_kt: 8.0, risk: 'low' },
  { from: 'ATL_CHL_01', to: 'REF_KOR_01', volume_kt: 3.5, risk: 'low' },
  { from: 'PIL_AUS_01', to: 'REF_CHN_02', volume_kt: 12.0, risk: 'low' },
  { from: 'PIL_AUS_01', to: 'REF_KOR_01', volume_kt: 4.0, risk: 'low' },
  { from: 'ASM_BOL_01', to: 'HUB_IDN',   volume_kt: 1.8, risk: 'high' },
  { from: 'ZIM_01',     to: 'REF_CHN_01', volume_kt: 3.5, risk: 'high' },
  { from: 'ZIM_01',     to: 'HUB_PHL',   volume_kt: 0.9, risk: 'high' },
  { from: 'PIL_ARG_01', to: 'REF_CHN_01', volume_kt: 5.0, risk: 'medium' },
  { from: 'POR_01',     to: 'REF_KOR_01', volume_kt: 1.2, risk: 'low' },
  { from: 'HUB_MYS',   to: 'REF_CHN_01', volume_kt: 2.0, risk: 'high' },  // laundered
  { from: 'HUB_IDN',   to: 'REF_CHN_02', volume_kt: 1.7, risk: 'high' },  // laundered
]

export const PRODUCTS = [
  { label: 'Tesla Model 3 (2024)', year: 2024, manufacturer: 'Tesla / CATL', battery: 'LFP 60kWh' },
  { label: 'iPhone 16 Pro', year: 2024, manufacturer: 'Apple / ATL', battery: 'Li-ion 4685mAh' },
  { label: 'MacBook Pro M3', year: 2023, manufacturer: 'Apple / CATL', battery: 'Li-ion 99.6Wh' },
  { label: 'Generic EV (2022)', year: 2022, manufacturer: 'Unknown OEM', battery: 'NMC 80kWh' },
]
