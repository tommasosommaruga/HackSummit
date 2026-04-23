// USGS Mineral Commodity Summaries 2024  https://pubs.usgs.gov/periodicals/mcs2024/mcs2024.pdf
// Scope: Rare Earth Elements (REE), Cobalt, Nickel, Tin, Tungsten
// Mine production in kt of contained element.

export const MINES = [
  // ── Cobalt ─────────────────────────────────────────────────────────────────
  { id: 'MINE_DRC_COB',  name: 'Kolwezi Cobalt Belt (DRC ASM)',              country: 'DR Congo',    flag: '🇨🇩', elements: ['Co'], lat: -10.7, lon:  25.5, type: 'ASM underground/open pit', risk: 0.92, certified: false, output: { Co: { 2022: 48,  2023: 55  } }, source: 'USGS MCS 2024, Cobalt, Table 1' },
  { id: 'MINE_DRC_CMC',  name: 'Kamoto Copper Company (Glencore)',           country: 'DR Congo',    flag: '🇨🇩', elements: ['Co'], lat: -10.9, lon:  25.4, type: 'Underground',              risk: 0.45, certified: true,  output: { Co: { 2022: 31,  2023: 34  } }, source: 'USGS MCS 2024, Cobalt, Table 1' },
  { id: 'MINE_AUS_MUR',  name: 'Murrin Murrin (Nickel-Cobalt, Wyloo)',       country: 'Australia',   flag: '🇦🇺', elements: ['Co','Ni'], lat: -28.7, lon: 121.9, type: 'Laterite (HPAL)',     risk: 0.07, certified: true,  output: { Co: { 2022: 3.6, 2023: 3.8 } }, source: 'USGS MCS 2024, Cobalt, Table 1' },
  // ── Nickel ─────────────────────────────────────────────────────────────────
  { id: 'MINE_IDN_SUL',  name: 'Sulawesi Nickel Laterite Belt (RKEF zone)',  country: 'Indonesia',   flag: '🇮🇩', elements: ['Ni'], lat:  -2.1, lon: 121.4, type: 'Laterite open pit',        risk: 0.72, certified: false, output: { Ni: { 2022: 1600, 2023: 1800 } }, source: 'USGS MCS 2024, Nickel, Table 1' },
  { id: 'MINE_PHL_TGP',  name: 'Taganito (THNC) / Rio Tuba (Nickel Asia)',  country: 'Philippines', flag: '🇵🇭', elements: ['Ni'], lat:   9.2, lon: 125.8, type: 'Laterite open pit',        risk: 0.35, certified: true,  output: { Ni: { 2022: 330,  2023: 340  } }, source: 'USGS MCS 2024, Nickel, Table 1' },
  { id: 'MINE_RUS_NOR',  name: 'Norilsk Nickel (MMC Norilsk)',               country: 'Russia',      flag: '🇷🇺', elements: ['Ni','Co'], lat: 69.3, lon:  88.2, type: 'Underground sulfide', risk: 0.68, certified: false, output: { Ni: { 2022: 193,  2023: 195  } }, source: 'USGS MCS 2024, Nickel, Table 1' },
  // ── Rare Earth Elements ────────────────────────────────────────────────────
  { id: 'MINE_MYA_KCH',  name: 'Kachin REE Artisanal Cluster',              country: 'Myanmar',     flag: '🇲🇲', elements: ['REE'], lat: 25.5, lon:  97.2, type: 'ASM ionic clay',           risk: 0.91, certified: false, output: { REE: { 2022: 38, 2023: 42 } }, source: 'USGS MCS 2024, Rare Earths, Table 1' },
  { id: 'MINE_CHN_JXI',  name: 'Jiangxi Ion-Adsorption Clay Mines',         country: 'China',       flag: '🇨🇳', elements: ['REE'], lat: 26.1, lon: 115.0, type: 'In-situ leach (clay)',     risk: 0.62, certified: false, output: { REE: { 2022: 168, 2023: 180 } }, source: 'USGS MCS 2024, Rare Earths, Table 1' },
  { id: 'MINE_AUS_MWD',  name: 'Mount Weld (Lynas Rare Earths)',            country: 'Australia',   flag: '🇦🇺', elements: ['REE'], lat: -29.6, lon: 122.2, type: 'Carbonatite open pit',    risk: 0.05, certified: true,  output: { REE: { 2022: 17,  2023: 21  } }, source: 'USGS MCS 2024, Rare Earths, Table 1' },
  // ── Tin ────────────────────────────────────────────────────────────────────
  { id: 'MINE_IDN_BNG',  name: 'Bangka-Belitung ASM Tin Fields',            country: 'Indonesia',   flag: '🇮🇩', elements: ['Sn'], lat:  -2.2, lon: 106.1, type: 'Offshore/coastal dredge + ASM', risk: 0.74, certified: false, output: { Sn: { 2022: 50, 2023: 55 } }, source: 'USGS MCS 2024, Tin, Table 1' },
  { id: 'MINE_MYA_TIN',  name: 'Wa State Tin-Tungsten Mines',               country: 'Myanmar',     flag: '🇲🇲', elements: ['Sn','W'],  lat: 22.6, lon:  98.9, type: 'ASM underground',      risk: 0.88, certified: false, output: { Sn: { 2022: 22, 2023: 28 } }, source: 'USGS MCS 2024, Tin, Table 1' },
  { id: 'MINE_CHL_TIN',  name: 'Peru–Bolivia Tin Belt (Minsur / EM Vinto)', country: 'Peru',        flag: '🇵🇪', elements: ['Sn'], lat: -14.1, lon: -70.3, type: 'Underground vein',         risk: 0.28, certified: true,  output: { Sn: { 2022: 18, 2023: 21 } }, source: 'USGS MCS 2024, Tin, Table 1' },
  // ── Tungsten ───────────────────────────────────────────────────────────────
  { id: 'MINE_CHN_WOL',  name: 'Jiangxi-Hunan Tungsten Corridor',           country: 'China',       flag: '🇨🇳', elements: ['W'],  lat: 25.9, lon: 113.9, type: 'Underground vein (scheelite/wolframite)', risk: 0.58, certified: false, output: { W: { 2022: 51, 2023: 54 } }, source: 'USGS MCS 2024, Tungsten, Table 1' },
  { id: 'MINE_VNM_WOL',  name: 'Nui Phao (Masan Resources)',                country: 'Vietnam',     flag: '🇻🇳', elements: ['W'],  lat: 21.6, lon: 105.7, type: 'Open pit polymetallic',   risk: 0.22, certified: true,  output: { W: { 2022: 6.1, 2023: 6.4 } }, source: 'USGS MCS 2024, Tungsten, Table 1' },
]

export const PRODUCTS = [
  { label: 'NdFeB Permanent Magnet (EV traction motor)', year: 2024, manufacturer: 'VAC / TDK / Hitachi', elements: ['REE'] },
  { label: 'EV Battery Pack (NMC 811)',                  year: 2024, manufacturer: 'CATL / LG Energy',    elements: ['Co', 'Ni'] },
  { label: 'Smartphone PCB (solder + contacts)',         year: 2024, manufacturer: 'Foxconn / Foxbrain',  elements: ['Sn'] },
  { label: 'Tungsten Carbide Cutting Tool',              year: 2023, manufacturer: 'Sandvik / Kennametal', elements: ['W'] },
  { label: 'Cobalt-alloy Turbine Blade',                 year: 2023, manufacturer: 'GE Aerospace',       elements: ['Co'] },
]
