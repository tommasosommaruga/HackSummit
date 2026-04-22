// ─────────────────────────────────────────────────────────────────────────────
// Transportation Network: Real corridors mine → port → refinery → factory
//
// Sources:
//  - World Bank Transport corridors: https://transport.worldbank.org/
//  - UNCTAD Maritime Transport Review: https://unctad.org/topic/transport-and-trade-logistics
//  - African Development Bank transport corridor data: https://www.afdb.org/
//  - OpenStreetMap major highway/rail data
//  - Shipping route distances: sea-distances.org / marinetraffic.com
//  - TAZARA Railway: https://www.tazarasite.com/
//  - Lobito Corridor (Angola): US/EU strategic investment 2023
// ─────────────────────────────────────────────────────────────────────────────

// opacity_score: how hard is this leg to audit (0=fully documented, 1=totally opaque)
// laundering_risk: probability that origin gets obscured on this leg
export const TRANSPORT_NODES = {
  // ── Mine sites ───────────────────────────────────────────────────────────
  KOLWEZI:     { id: 'KOLWEZI',     name: 'Kolwezi Mining District', lat: -10.7, lon: 25.5,  type: 'mine_region', country: 'COD' },
  LUBUMBASHI:  { id: 'LUBUMBASHI',  name: 'Lubumbashi Hub',          lat: -11.7, lon: 27.5,  type: 'processing',  country: 'COD' },
  ATACAMA:     { id: 'ATACAMA',     name: 'Atacama Salar',           lat: -23.5, lon: -68.0, type: 'mine_region', country: 'CHL' },
  PUNA:        { id: 'PUNA',        name: 'Puna / Jujuy Province',   lat: -23.0, lon: -66.5, type: 'mine_region', country: 'ARG' },
  UYUNI:       { id: 'UYUNI',       name: 'Salar de Uyuni',          lat: -20.1, lon: -67.6, type: 'mine_region', country: 'BOL' },
  GREENBUSHES: { id: 'GREENBUSHES', name: 'Greenbushes WA',          lat: -33.85, lon: 116.05, type: 'mine_region', country: 'AUS' },
  MURRINMURRIN:{ id: 'MURRINMURRIN',name: 'Murrin Murrin WA',        lat: -28.7,  lon: 121.9,  type: 'mine_region', country: 'AUS' },
  BIKITA:      { id: 'BIKITA',      name: 'Bikita / Arcadia, Masvingo', lat: -20.1, lon: 31.7, type: 'mine_region', country: 'ZWE' },
  COPPERBELT:  { id: 'COPPERBELT',  name: 'Copperbelt, Zambia',      lat: -12.8, lon: 28.2,  type: 'mine_region', country: 'ZMB' },
  BARROSO:     { id: 'BARROSO',     name: 'Covas do Barroso',        lat: 41.7,  lon: -7.7,  type: 'mine_region', country: 'PRT' },
  NORILSK:     { id: 'NORILSK',     name: 'Norilsk, Krasnoyarsk',    lat: 69.3,  lon: 88.2,  type: 'mine_region', country: 'RUS' },
  MOROWALI:    { id: 'MOROWALI',    name: 'Morowali IMIP, Sulawesi', lat: -2.2,  lon: 121.9, type: 'mine_region', country: 'IDN' },
  BALAMA:      { id: 'BALAMA',      name: 'Balama, Cabo Delgado',    lat: -13.3, lon: 38.6,  type: 'mine_region', country: 'MOZ' },
  KALAHARI:    { id: 'KALAHARI',    name: 'Kalahari Manganese Field',lat: -27.5, lon: 22.5,  type: 'mine_region', country: 'ZAF' },

  // ── Ports ─────────────────────────────────────────────────────────────────
  DAR_ES_SALAAM: { id: 'DAR_ES_SALAAM', name: 'Dar es Salaam Port',     lat: -6.82, lon: 39.29, type: 'port', country: 'TZA', throughput_mt: 15 },
  DURBAN:        { id: 'DURBAN',        name: 'Durban Port (Transnet)', lat: -29.87, lon: 31.04, type: 'port', country: 'ZAF', throughput_mt: 81 },
  BEIRA:         { id: 'BEIRA',         name: 'Beira Port',             lat: -19.84, lon: 34.84, type: 'port', country: 'MOZ', throughput_mt: 10 },
  LOBITO:        { id: 'LOBITO',        name: 'Lobito Port',            lat: -12.35, lon: 13.55, type: 'port', country: 'AGO', throughput_mt: 8 },
  ANTOFAGASTA:   { id: 'ANTOFAGASTA',   name: 'Antofagasta Port',       lat: -23.65, lon: -70.4, type: 'port', country: 'CHL', throughput_mt: 28 },
  BUENOS_AIRES:  { id: 'BUENOS_AIRES',  name: 'Buenos Aires Port',      lat: -34.6,  lon: -58.4, type: 'port', country: 'ARG', throughput_mt: 45 },
  BUNBURY:       { id: 'BUNBURY',       name: 'Bunbury Port WA',        lat: -33.33, lon: 115.64, type: 'port', country: 'AUS', throughput_mt: 20 },
  PORT_HEDLAND:  { id: 'PORT_HEDLAND',  name: 'Port Hedland WA',        lat: -20.32, lon: 118.58, type: 'port', country: 'AUS', throughput_mt: 200 },
  NORILSK_PORT:  { id: 'NORILSK_PORT',  name: 'Dudinka Port (Arctic)',   lat: 69.4,  lon: 86.2,  type: 'port', country: 'RUS', throughput_mt: 2 },
  BELEM:         { id: 'BELEM',         name: 'Belem / Ponta da Madeira', lat: -1.5, lon: -48.5, type: 'port', country: 'BRA', throughput_mt: 145 },
  PORT_NACALA:   { id: 'PORT_NACALA',   name: 'Nacala Port, Mozambique', lat: -14.54, lon: 40.67, type: 'port', country: 'MOZ', throughput_mt: 5 },
  VIGO:          { id: 'VIGO',          name: 'Vigo Port, Spain',        lat: 42.23, lon: -8.73, type: 'port', country: 'ESP', throughput_mt: 20 },

  // ── Refineries / Processing Hubs ──────────────────────────────────────────
  GANFENG_XINYU: { id: 'GANFENG_XINYU', name: 'Ganfeng Xinyu Refinery',    lat: 28.5,  lon: 115.9, type: 'refinery', country: 'CHN', company: 'GANFENG' },
  TIANQI_SHEH:   { id: 'TIANQI_SHEH',   name: 'Tianqi Shehong Refinery',   lat: 30.7,  lon: 105.4, type: 'refinery', country: 'CHN', company: 'TIANQI' },
  HUAYOU_TONG:   { id: 'HUAYOU_TONG',   name: 'Huayou Tongxiang Plant',    lat: 30.6,  lon: 120.5, type: 'refinery', country: 'CHN', company: 'HUAYOU' },
  POSCO_GUMI:    { id: 'POSCO_GUMI',    name: 'POSCO HY Gumi Plant',       lat: 35.9,  lon: 128.6, type: 'refinery', country: 'KOR', company: 'POSCO_HY' },
  UMICORE_HOB:   { id: 'UMICORE_HOB',   name: 'Umicore Hoboken Plant',     lat: 51.18, lon: 4.35,  type: 'refinery', country: 'BEL', company: 'UMICORE' },
  FREEPORT_KOKO: { id: 'FREEPORT_KOKO', name: 'Freeport Cobalt Kokkola',   lat: 63.84, lon: 23.13, type: 'refinery', country: 'FIN', company: 'FREEPORT_COBALT' },
  SQM_ANTOFA:    { id: 'SQM_ANTOFA',    name: 'SQM Antofagasta Plant',     lat: -23.7, lon: -70.4, type: 'refinery', country: 'CHL', company: 'SQM' },

  // ── Battery Gigafactories ─────────────────────────────────────────────────
  CATL_NINGDE:   { id: 'CATL_NINGDE',   name: 'CATL Ningde Gigafactory',   lat: 26.66, lon: 119.54, type: 'gigafactory', country: 'CHN', company: 'CATL' },
  CATL_ERFURT:   { id: 'CATL_ERFURT',   name: 'CATL Erfurt Gigafactory',   lat: 50.98, lon: 11.03,  type: 'gigafactory', country: 'DEU', company: 'CATL' },
  PANASONIC_NV:  { id: 'PANASONIC_NV',  name: 'Panasonic Tesla Nevada',    lat: 39.54, lon: -118.4, type: 'gigafactory', country: 'USA', company: 'PANASONIC' },
  LG_POLAND:     { id: 'LG_POLAND',     name: 'LG Energy Solution Wroclaw', lat: 51.1, lon: 17.04,  type: 'gigafactory', country: 'POL', company: 'LG_CHEM' },
  SAMSUNG_HU:    { id: 'SAMSUNG_HU',    name: 'Samsung SDI Göd Hungary',   lat: 47.68, lon: 19.13,  type: 'gigafactory', country: 'HUN', company: 'SAMSUNG_SDI' },
  ATL_HUIZHOU:   { id: 'ATL_HUIZHOU',   name: 'ATL Huizhou Factory',       lat: 23.11, lon: 114.42, type: 'gigafactory', country: 'CHN', company: 'ATL' },
}

export const TRANSPORT_LEGS = [
  // ──────────────────────────────────────────────────────────────────────────
  // COBALT / COPPER: DRC → World
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'TL_DRC_01', from: 'KOLWEZI', to: 'LUBUMBASHI',
    mode: 'road', km: 310, element: ['Co', 'Cu'],
    corridor: 'N1 Highway, DRC',
    transit_countries: ['COD'],
    opacity_score: 0.88,  // very hard to audit — no systematic manifest system
    laundering_risk: 0.75,
    notes: 'Ore transported by artisanal miners on motorbikes, pickup trucks, to negociants (middlemen). No formal manifest. Multiple hand-offs obscure origin.',
    source: 'Global Witness "Regime of Impunity" 2022',
  },
  {
    id: 'TL_DRC_02', from: 'LUBUMBASHI', to: 'DAR_ES_SALAAM',
    mode: 'rail_road', km: 1860, element: ['Co', 'Cu'],
    corridor: 'TAZARA Railway + Great North Road',
    transit_countries: ['COD', 'ZMB', 'TZA'],
    opacity_score: 0.65,
    laundering_risk: 0.55,
    notes: 'TAZARA railway (Tanzania-Zambia) carries ore concentrate. Zambian customs records exist but DRC origin declaration often falsified. Lumped with Zambian copper at Dar es Salaam.',
    source: 'AfDB Corridor Performance Report 2022; TAZARA Annual Report',
  },
  {
    id: 'TL_DRC_03', from: 'LUBUMBASHI', to: 'DURBAN',
    mode: 'road_rail', km: 3100, element: ['Co', 'Cu'],
    corridor: 'North-South Corridor (Trans-African Highway 9)',
    transit_countries: ['COD', 'ZMB', 'ZWE', 'ZAF'],
    opacity_score: 0.58,
    laundering_risk: 0.48,
    notes: 'Passes through 4 countries. South African customs relatively robust. But intermediate blending at Zambian/Zimbabwean depots obscures DRC ASM origin.',
    source: 'World Bank North-South Corridor Study 2021',
  },
  {
    id: 'TL_DRC_04', from: 'LUBUMBASHI', to: 'LOBITO',
    mode: 'rail', km: 1840, element: ['Co', 'Cu'],
    corridor: 'Lobito Corridor (Benguela Railway)',
    transit_countries: ['COD', 'AGO'],
    opacity_score: 0.72,
    laundering_risk: 0.60,
    notes: 'US/EU strategic investment 2023 to provide DRC copper/cobalt alternative to Chinese-controlled routes. Currently partial; Lobito port capacity limited. Full corridor completion 2025.',
    source: 'US State Dept G7 Partnership for Global Infrastructure 2023',
  },
  {
    id: 'TL_SEA_DRC_CHN', from: 'DAR_ES_SALAAM', to: 'HUAYOU_TONG',
    mode: 'sea', km: 8900, element: ['Co'],
    corridor: 'Indian Ocean → Malacca Strait → South China Sea',
    transit_countries: ['TZA', 'INT_WATERS', 'CHN'],
    transit_ports: ['Singapore', 'Tianjin'],
    opacity_score: 0.40,
    laundering_risk: 0.35,
    notes: 'Bill of lading declares "cobalt concentrate from Zambia" — Zambia origin declared even when DRC-sourced. Common practice at Dar es Salaam.',
    source: 'OECD Due Diligence Annex II report; Pact IPIS mapping',
    avg_transit_days: 22,
  },
  {
    id: 'TL_SEA_DRC_EUR', from: 'DURBAN', to: 'UMICORE_HOB',
    mode: 'sea', km: 11200, element: ['Co'],
    corridor: 'Cape of Good Hope → Atlantic → Antwerp',
    transit_countries: ['ZAF', 'INT_WATERS', 'BEL'],
    opacity_score: 0.30,
    laundering_risk: 0.20,
    notes: 'Umicore requires RMAP-verified cobalt. Glencore/OMG supplies through this route. Better documented than Asia routes.',
    source: 'Umicore Responsible Sourcing Report 2023',
    avg_transit_days: 18,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // LITHIUM: Chile / Argentina / Australia → Refineries
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'TL_CHL_01', from: 'ATACAMA', to: 'ANTOFAGASTA',
    mode: 'road', km: 295, element: ['Li'],
    corridor: 'Ruta 25 / CH-25',
    transit_countries: ['CHL'],
    opacity_score: 0.12,
    laundering_risk: 0.05,
    notes: 'Direct SQM/Albemarle plant to port. Fully documented. Chile customs electronic system.',
    source: 'SQM Annual Report 2023',
    avg_transit_days: 1,
  },
  {
    id: 'TL_CHL_02', from: 'ANTOFAGASTA', to: 'POSCO_GUMI',
    mode: 'sea', km: 19800, element: ['Li'],
    corridor: 'Pacific Ocean → Korea Strait',
    transit_countries: ['CHL', 'INT_WATERS', 'KOR'],
    transit_ports: ['Busan'],
    opacity_score: 0.15,
    laundering_risk: 0.05,
    notes: 'Direct contractual supply SQM → POSCO HY. Full bill of lading chain.',
    source: 'POSCO HY sourcing disclosure 2023',
    avg_transit_days: 28,
  },
  {
    id: 'TL_ARG_01', from: 'PUNA', to: 'BUENOS_AIRES',
    mode: 'road', km: 1350, element: ['Li'],
    corridor: 'RN 9 / RN 34 (Quebrada de Humahuaca)',
    transit_countries: ['ARG'],
    opacity_score: 0.22,
    laundering_risk: 0.08,
    notes: 'Long road haul through remote Andes. Road conditions variable. Argentina export taxes complicate documentation.',
    source: 'Livent/Ganfeng Argentina ops reports',
    avg_transit_days: 3,
  },
  {
    id: 'TL_ARG_02', from: 'BUENOS_AIRES', to: 'GANFENG_XINYU',
    mode: 'sea', km: 19200, element: ['Li'],
    corridor: 'Atlantic → Cape of Good Hope → Indian Ocean → South China Sea',
    transit_countries: ['ARG', 'INT_WATERS', 'CHN'],
    opacity_score: 0.25,
    laundering_risk: 0.12,
    notes: 'Ganfeng offtake agreement. Standard bill of lading.',
    avg_transit_days: 35,
  },
  {
    id: 'TL_AUS_01', from: 'GREENBUSHES', to: 'BUNBURY',
    mode: 'road', km: 215, element: ['Li'],
    corridor: 'Vasse Highway / South Western Highway',
    transit_countries: ['AUS'],
    opacity_score: 0.08,
    laundering_risk: 0.02,
    notes: 'Dedicated truck fleet. Full chain of custody. WA Mines dept reporting.',
    avg_transit_days: 1,
  },
  {
    id: 'TL_AUS_02', from: 'BUNBURY', to: 'TIANQI_SHEH',
    mode: 'sea', km: 8200, element: ['Li'],
    corridor: 'Indian Ocean → Malacca Strait → South China Sea',
    transit_countries: ['AUS', 'INT_WATERS', 'CHN'],
    opacity_score: 0.18,
    laundering_risk: 0.05,
    notes: 'Tianqi owns 51% of Greenbushes. Vertical integration reduces laundering risk. Full documented.',
    avg_transit_days: 18,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // LITHIUM: Zimbabwe → China (high risk corridor)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'TL_ZIM_01', from: 'BIKITA', to: 'BEIRA',
    mode: 'road', km: 590, element: ['Li'],
    corridor: 'Beira Corridor (A3/N6)',
    transit_countries: ['ZWE', 'MOZ'],
    opacity_score: 0.70,
    laundering_risk: 0.58,
    notes: 'Zimbabwe export documentation system weak. Ore passes through Mozambique (Beira) — origin sometimes re-declared as Mozambican mineral. No independent audit on this leg.',
    source: 'Global Witness Zimbabwe minerals report 2022',
    avg_transit_days: 2,
  },
  {
    id: 'TL_ZIM_02', from: 'BEIRA', to: 'GANFENG_XINYU',
    mode: 'sea', km: 7800, element: ['Li'],
    corridor: 'Mozambique Channel → Indian Ocean → South China Sea',
    transit_countries: ['MOZ', 'INT_WATERS', 'CHN'],
    opacity_score: 0.48,
    laundering_risk: 0.42,
    notes: 'Bill of lading may declare Mozambique origin. China customs accepts without upstream verification.',
    avg_transit_days: 20,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // NICKEL: Indonesia → China
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'TL_IDN_01', from: 'MOROWALI', to: 'CATL_NINGDE',
    mode: 'sea', km: 3100, element: ['Ni'],
    corridor: 'Makassar Strait → South China Sea',
    transit_countries: ['IDN', 'INT_WATERS', 'CHN'],
    opacity_score: 0.35,
    laundering_risk: 0.28,
    notes: 'IMIP is Chinese-owned industrial park. Vertical integration direct to China. But deforestation and labor rights concerns on processing side.',
    avg_transit_days: 5,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // NICKEL: Russia → Europe (pre-2022 route; now partially disrupted)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'TL_RUS_01', from: 'NORILSK', to: 'NORILSK_PORT',
    mode: 'rail_road', km: 90, element: ['Ni', 'Co', 'Cu'],
    corridor: 'Norilsk → Dudinka Arctic port',
    transit_countries: ['RUS'],
    opacity_score: 0.55,
    laundering_risk: 0.62,
    notes: 'Sanctioned post-2022. Metal flows rerouted via UAE, Turkey, India to obscure Russian origin. "Nickel laundering" documented by Reuters 2023.',
    source: 'Reuters "Russia Metal Sanctions Evasion" July 2023',
    avg_transit_days: 1,
  },
  {
    id: 'TL_RUS_02', from: 'NORILSK_PORT', to: 'FREEPORT_KOKO',
    mode: 'sea', km: 5800, element: ['Ni', 'Co'],
    corridor: 'Northern Sea Route → Norwegian Sea → Baltic',
    transit_countries: ['RUS', 'INT_WATERS', 'FIN'],
    opacity_score: 0.38,
    laundering_risk: 0.30,
    notes: 'Pre-2022 main route to European refiners. Post-2022 flow reduced but not zero — sanctions have carve-outs. Freeport Cobalt publicly stated reducing Nornickel dependency.',
    source: 'Freeport Cobalt Supplier Statement 2023',
    avg_transit_days: 12,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // GRAPHITE: China → Battery factories
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'TL_CHN_C_01', from: 'BALAMA', to: 'PORT_NACALA',
    mode: 'road', km: 320, element: ['C'],
    corridor: 'Nacala Corridor (N14)',
    transit_countries: ['MOZ'],
    opacity_score: 0.30,
    laundering_risk: 0.12,
    notes: 'Syrah Resources (ASX-listed) direct to Nacala. Well documented. Alternative to Chinese graphite.',
    avg_transit_days: 1,
  },
  {
    id: 'TL_CHN_C_02', from: 'PORT_NACALA', to: 'LG_POLAND',
    mode: 'sea', km: 14200, element: ['C'],
    corridor: 'Mozambique Channel → Cape → Atlantic → Rotterdam',
    transit_countries: ['MOZ', 'INT_WATERS', 'NLD', 'POL'],
    opacity_score: 0.22,
    laundering_risk: 0.08,
    notes: 'Syrah-LG contract 2023. Planned EU supply chain for non-Chinese graphite.',
    avg_transit_days: 28,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // REFINERIES → GIGAFACTORIES (final delivery leg)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'TL_REF_01', from: 'GANFENG_XINYU', to: 'CATL_NINGDE',
    mode: 'road_rail', km: 680, element: ['Li'],
    corridor: 'Jiangxi → Fujian (G70 / rail)',
    transit_countries: ['CHN'],
    opacity_score: 0.20,
    laundering_risk: 0.18,
    notes: 'Domestic China. Ganfeng → CATL standard supply. No customs declaration needed domestically.',
    avg_transit_days: 2,
  },
  {
    id: 'TL_REF_02', from: 'UMICORE_HOB', to: 'SAMSUNG_HU',
    mode: 'road', km: 1650, element: ['Co', 'Ni'],
    corridor: 'E19 / E75 motorway Belgium → Hungary',
    transit_countries: ['BEL', 'DEU', 'AUT', 'HUN'],
    opacity_score: 0.10,
    laundering_risk: 0.04,
    notes: 'EU internal market. Full documentation. Best-audited leg in the entire supply chain.',
    avg_transit_days: 3,
  },
  {
    id: 'TL_REF_03', from: 'HUAYOU_TONG', to: 'CATL_ERFURT',
    mode: 'sea_rail', km: 11200, element: ['Co', 'Ni'],
    corridor: 'China → Hamburg (sea) → Erfurt (rail)',
    transit_countries: ['CHN', 'INT_WATERS', 'DEU'],
    transit_ports: ['Hamburg'],
    opacity_score: 0.32,
    laundering_risk: 0.28,
    notes: 'Huayou supplies CATL European gigafactory. Origin documentation at Huayou smelter level — upstream ASM not verified.',
    avg_transit_days: 28,
  },
  {
    id: 'TL_REF_04', from: 'POSCO_GUMI', to: 'SAMSUNG_HU',
    mode: 'sea_road', km: 9800, element: ['Li', 'Ni'],
    corridor: 'Korea → Hamburg → Hungary',
    transit_countries: ['KOR', 'INT_WATERS', 'DEU', 'HUN'],
    opacity_score: 0.18,
    laundering_risk: 0.08,
    notes: 'POSCO → Samsung SDI contractual supply. South Korean origin, well audited.',
    avg_transit_days: 26,
  },
]

// Helper: get all legs for a given element
export function getLegsByElement(element) {
  return TRANSPORT_LEGS.filter(leg => leg.element.includes(element))
}

// Helper: get full route from mine to gigafactory for an element
export function getRouteChain(startNodeId, element) {
  const legs = getLegsByElement(element)
  const chain = []
  const queue = [startNodeId]
  const visited = new Set()
  while (queue.length) {
    const current = queue.shift()
    if (visited.has(current)) continue
    visited.add(current)
    const outgoing = legs.filter(l => l.from === current)
    for (const leg of outgoing) {
      chain.push(leg)
      queue.push(leg.to)
    }
  }
  return chain
}

// Overall corridor opacity: product of (1-opacity) across legs
export function corridorOpacity(legs) {
  if (!legs.length) return 0
  return 1 - legs.reduce((prod, l) => prod * (1 - l.opacity_score), 1)
}
