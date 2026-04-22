// ─────────────────────────────────────────────────────────────────────────────
// Company ownership chain: Mine → Trader → Refiner → Cell Mfg → OEM
//
// Sources:
//  - Glencore Annual Report 2023: https://www.glencore.com/investors/reports
//  - SQM Annual Report 2023: https://www.sqm.com/en/investors/financial-information/annual-report/
//  - Ganfeng Lithium 2022 Annual Report (HKEx 1772)
//  - Tianqi Lithium prospectus (HKEx 9696)
//  - Albemarle 10-K 2023: https://www.sec.gov/cgi-bin/browse-edgar (ticker ALB)
//  - CATL supplier disclosures + Bloomberg supply chain data
//  - Apple Conflict Minerals Report 2023 (SEC Form SD)
//  - Tesla Impact Report 2023
//  - Benchmark Mineral Intelligence supply chain mapping
// ─────────────────────────────────────────────────────────────────────────────

export const COMPANIES = {
  // ── Mining Companies ───────────────────────────────────────────────────
  GLENCORE: {
    id: 'GLENCORE', name: 'Glencore', type: 'miner_trader',
    hq: 'Switzerland', flag: '🇨🇭',
    listed: 'LSE: GLEN',
    owns_mines: ['KOB_DRC_01', 'ZMB_CO_01', 'AUS_CO_01'],
    elements: ['Co', 'Cu', 'Ni'],
    sells_to: ['UMICORE', 'HUAYOU', 'FREEPORT_COBALT'],
    esg_report: 'https://www.glencore.com/sustainability/reporting',
    child_labor_incidents: [
      { year: 2017, source: 'Amnesty International', detail: 'Children found at Tilwezembe ASM mine near Glencore concession, Kolwezi' },
      { year: 2021, source: 'Washington Post investigation', detail: 'ASM workers including minors documented selling ore to Glencore-adjacent depots' },
    ],
    audit_status: 'ICMM member. Third-party audit by Bureau Veritas. ASM boundary enforcement disputed.',
  },
  SQM: {
    id: 'SQM', name: 'SQM (Sociedad Química y Minera)', type: 'miner',
    hq: 'Chile', flag: '🇨🇱',
    listed: 'NYSE: SQM',
    owns_mines: ['ATL_CHL_01'],
    elements: ['Li', 'K', 'I'],
    sells_to: ['GANFENG', 'LG_CHEM', 'POSCO_HY', 'SAMSUNG_SDI'],
    esg_report: 'https://www.sqm.com/en/sustainability/',
    child_labor_incidents: [],
    audit_status: 'IRMA-certified. Water consumption flagged by Chilean regulator (SMA) 2022.',
  },
  ALBEMARLE: {
    id: 'ALBEMARLE', name: 'Albemarle', type: 'miner_refiner',
    hq: 'USA', flag: '🇺🇸',
    listed: 'NYSE: ALB',
    owns_mines: ['ATL_CHL_01', 'PIL_AUS_01'],
    elements: ['Li'],
    sells_to: ['PANASONIC', 'LG_CHEM', 'CATL'],
    esg_report: 'https://www.albemarle.com/sustainability',
    child_labor_incidents: [],
    audit_status: 'Responsible Minerals Initiative member. No child labor flags.',
  },
  TIANQI: {
    id: 'TIANQI', name: 'Tianqi Lithium', type: 'miner_refiner',
    hq: 'China', flag: '🇨🇳',
    listed: 'HKEx: 9696 / SZE: 002466',
    owns_mines: ['PIL_AUS_01'],
    elements: ['Li'],
    sells_to: ['CATL', 'BYD', 'LG_CHEM'],
    esg_report: 'https://www.tianqilithium.com/en/esg.html',
    child_labor_incidents: [],
    audit_status: 'Chinese national standard audit. Independent third-party limited.',
  },
  GANFENG: {
    id: 'GANFENG', name: 'Ganfeng Lithium', type: 'miner_refiner',
    hq: 'China', flag: '🇨🇳',
    listed: 'HKEx: 1772 / SZE: 002460',
    owns_mines: ['PIL_ARG_01'],
    elements: ['Li'],
    sells_to: ['CATL', 'BMW', 'TESLA', 'VOLKSWAGEN'],
    esg_report: 'https://www.ganfenglithium.com/esg.html',
    child_labor_incidents: [],
    audit_status: 'RMI participating. Sources from ARG (low risk) and has stake in Mali lithium (higher risk).',
  },
  ZHEDAR: {
    id: 'ZHEDAR', name: 'Zhejiang Huayou Cobalt (Arcadia/Bikita)', type: 'miner_refiner',
    hq: 'China', flag: '🇨🇳',
    listed: 'SSE: 603799',
    owns_mines: ['ZIM_LI_01'],
    elements: ['Li', 'Co'],
    sells_to: ['CATL', 'LG_CHEM', 'PANASONIC'],
    esg_report: 'https://www.huayou.com/en/esg/',
    child_labor_incidents: [
      { year: 2016, source: 'Amnesty International "This Is What We Die For"', detail: 'Huayou subsidiary Congo Dongfang Mining (CDM) sourced cobalt from Tilwezembe and Kamoto artisanal mines with documented child miners' },
      { year: 2021, source: 'International Rights Advocates lawsuit (US DC)', detail: 'Named in class action alongside Apple, Tesla, Google re: child labor cobalt. Case ongoing.' },
    ],
    audit_status: 'RMAP smelter audit passed 2022 BUT audit scope excludes upstream ASM validation.',
  },
  NORNICKEL: {
    id: 'NORNICKEL', name: 'Norilsk Nickel (Nornickel)', type: 'miner_refiner',
    hq: 'Russia', flag: '🇷🇺',
    listed: 'MOEX: GMKN / OTC: NILSY',
    owns_mines: ['RUS_NI_01'],
    elements: ['Ni', 'Co', 'Cu', 'Pd'],
    sells_to: ['UMICORE', 'JOHNSON_MATTHEY'],
    esg_report: 'https://www.nornickel.com/sustainability/',
    child_labor_incidents: [],
    forced_labor_incidents: [
      { year: 2021, source: 'Reuters / BBC', detail: 'Diesel spill 21,000 tonnes Arctic tundra. Worker safety record: 23 fatalities 2021.' },
      { year: 2022, source: 'EU/US sanctions', detail: 'Sanctioned executives. Metal flows diverted through third countries post-2022.' },
    ],
    audit_status: 'Not ICMM. Western buyers (BMW, Ford) publicly reducing Norilsk exposure post-2022.',
  },
  VALE: {
    id: 'VALE', name: 'Vale Nickel', type: 'miner',
    hq: 'Brazil', flag: '🇧🇷',
    listed: 'NYSE: VALE',
    owns_mines: ['AUS_CO_01'],
    elements: ['Ni', 'Co'],
    sells_to: ['POSCO_HY', 'SAMSUNG_SDI', 'FORD'],
    esg_report: 'https://www.vale.com/en/sustainability',
    child_labor_incidents: [],
    audit_status: 'ICMM member. Brumadinho dam collapse 2019 — safety not child labor issue.',
  },
  SAVANNAH: {
    id: 'SAVANNAH', name: 'Savannah Resources', type: 'miner',
    hq: 'UK/Portugal', flag: '🇬🇧',
    listed: 'AIM: SAV',
    owns_mines: ['POR_LI_01'],
    elements: ['Li'],
    sells_to: ['VOLKSWAGEN'],
    esg_report: 'https://www.savannahresources.com/sustainability/',
    child_labor_incidents: [],
    audit_status: 'EU regulatory framework. Pre-production. EUDR compliant by design.',
  },

  // ── Traders / Intermediaries ────────────────────────────────────────────
  FREEPORT_COBALT: {
    id: 'FREEPORT_COBALT', name: 'Freeport Cobalt (Umicore JV)', type: 'trader_refiner',
    hq: 'Finland', flag: '🇫🇮',
    listed: 'Private (Freeport-McMoRan + Umicore)',
    owns_mines: [],
    elements: ['Co'],
    buys_from: ['GLENCORE'],
    sells_to: ['UMICORE', 'PANASONIC', 'LG_CHEM'],
    esg_report: 'https://www.freeportcobalt.com/',
    child_labor_incidents: [],
    audit_status: 'RMAP active smelter. EU-based refining reduces traceability gap.',
    laundering_risk: 0.15,
    laundering_note: 'EU-based, audited — low laundering risk despite DRC feedstock.',
  },
  UMICORE: {
    id: 'UMICORE', name: 'Umicore', type: 'refiner_recycler',
    hq: 'Belgium', flag: '🇧🇪',
    listed: 'Euronext: UMI',
    owns_mines: [],
    elements: ['Co', 'Ni', 'Li'],
    buys_from: ['GLENCORE', 'FREEPORT_COBALT'],
    sells_to: ['SAMSUNG_SDI', 'LG_CHEM'],
    esg_report: 'https://www.umicore.com/en/about/sustainability/',
    recycled_content_claimed_pct: { 2021: 12, 2022: 16, 2023: 22 },
    child_labor_incidents: [],
    audit_status: 'RMAP active. Best-in-class Co sourcing transparency. Battery recycling loop established.',
    laundering_risk: 0.08,
  },
  HUAYOU: {
    id: 'HUAYOU', name: 'Zhejiang Huayou Cobalt', type: 'trader_refiner',
    hq: 'China', flag: '🇨🇳',
    listed: 'SSE: 603799',
    owns_mines: ['ZIM_LI_01'],
    elements: ['Co', 'Li', 'Ni'],
    buys_from: ['GLENCORE', 'ZHEDAR'],
    sells_to: ['CATL', 'LG_CHEM', 'PANASONIC'],
    esg_report: 'https://www.huayou.com/en/esg/',
    child_labor_incidents: [
      { year: 2016, source: 'Amnesty International', detail: 'CDM subsidiary sourced from ASM sites with child miners in DRC.' },
    ],
    audit_status: 'RMAP passed 2022. Audit covers smelter only — upstream ASM not independently verified.',
    laundering_risk: 0.72,
    laundering_note: 'High: DRC ASM cobalt enters Huayou at aggregation depots before refinery. Chain of custody breaks at depot level.',
  },

  // ── Refiners / Cell Manufacturers ──────────────────────────────────────
  CATL: {
    id: 'CATL', name: 'CATL (Contemporary Amperex)', type: 'cell_manufacturer',
    hq: 'China', flag: '🇨🇳',
    listed: 'SZSE: 300750',
    owns_mines: [],
    elements: ['Li', 'Co', 'Ni', 'Mn', 'C'],
    buys_from: ['GANFENG', 'TIANQI', 'HUAYOU', 'VALE'],
    sells_to: ['TESLA', 'BMW', 'VOLKSWAGEN', 'HYUNDAI', 'HONDA'],
    market_share_pct: 37,  // global Li-ion cell 2023 (Benchmark Mineral Intelligence)
    esg_report: 'https://www.catl.com/en/news/sustainability/',
    recycled_content_claimed_pct: { 2021: 8, 2022: 12, 2023: 18 },
    child_labor_incidents: [],
    audit_status: 'Self-reported. No independent upstream audit published. Supplier code of conduct only.',
    laundering_risk: 0.55,
    laundering_note: 'Buys from Huayou (high risk) and Ganfeng. Blended streams mean DRC cobalt risk is real.',
  },
  LG_CHEM: {
    id: 'LG_CHEM', name: 'LG Energy Solution', type: 'cell_manufacturer',
    hq: 'South Korea', flag: '🇰🇷',
    listed: 'KRX: 373220',
    owns_mines: [],
    elements: ['Li', 'Co', 'Ni'],
    buys_from: ['SQM', 'ALBEMARLE', 'UMICORE', 'HUAYOU'],
    sells_to: ['GM', 'FORD', 'VOLKSWAGEN', 'HYUNDAI', 'TESLA'],
    market_share_pct: 14,
    esg_report: 'https://www.lgensol.com/en/sustainability',
    recycled_content_claimed_pct: { 2022: 6, 2023: 10 },
    child_labor_incidents: [],
    audit_status: 'RMI member. Partial Umicore sourcing (audited). Huayou exposure flagged in 2021 Amnesty report.',
    laundering_risk: 0.38,
  },
  PANASONIC: {
    id: 'PANASONIC', name: 'Panasonic Energy', type: 'cell_manufacturer',
    hq: 'Japan', flag: '🇯🇵',
    listed: 'TSE: 6752',
    owns_mines: [],
    elements: ['Li', 'Co', 'Ni'],
    buys_from: ['ALBEMARLE', 'SUMITOMO_METAL', 'HUAYOU'],
    sells_to: ['TESLA'],
    market_share_pct: 9,
    esg_report: 'https://holdings.panasonic/global/corporate/sustainability.html',
    recycled_content_claimed_pct: { 2022: 5, 2023: 8 },
    child_labor_incidents: [],
    audit_status: 'Tesla Gigafactory Nevada supplier. Huayou cobalt exposure partially reduced post-2021.',
    laundering_risk: 0.28,
  },
  SAMSUNG_SDI: {
    id: 'SAMSUNG_SDI', name: 'Samsung SDI', type: 'cell_manufacturer',
    hq: 'South Korea', flag: '🇰🇷',
    listed: 'KRX: 006400',
    owns_mines: [],
    elements: ['Li', 'Co', 'Ni'],
    buys_from: ['SQM', 'UMICORE', 'POSCO_HY'],
    sells_to: ['BMW', 'STELLANTIS', 'RIVIAN'],
    market_share_pct: 8,
    esg_report: 'https://www.samsungsdi.com/esg/',
    recycled_content_claimed_pct: { 2022: 8, 2023: 14 },
    child_labor_incidents: [],
    audit_status: 'Strong Umicore sourcing (audited). Low cobalt battery pivot underway.',
    laundering_risk: 0.18,
  },
  POSCO_HY: {
    id: 'POSCO_HY', name: 'POSCO HY Clean Metal', type: 'refiner',
    hq: 'South Korea', flag: '🇰🇷',
    listed: 'Subsidiary of POSCO Holdings (KRX: 005490)',
    owns_mines: [],
    elements: ['Li', 'Ni'],
    buys_from: ['SQM', 'ALBEMARLE', 'VALE'],
    sells_to: ['SAMSUNG_SDI', 'LG_CHEM'],
    esg_report: 'https://www.posco.com/en/sustain/sustain_0010.html',
    child_labor_incidents: [],
    audit_status: 'Korean regulatory oversight. SQM and Albemarle inputs are low risk.',
    laundering_risk: 0.10,
  },
  ATL: {
    id: 'ATL', name: 'ATL (Amperex Technology Limited)', type: 'cell_manufacturer',
    hq: 'China (subsidiary of TDK Japan)', flag: '🇨🇳',
    listed: 'Subsidiary of TDK (TSE: 6762)',
    owns_mines: [],
    elements: ['Li', 'Co'],
    buys_from: ['GANFENG', 'HUAYOU'],
    sells_to: ['APPLE'],
    market_share_pct: 4,
    esg_report: 'https://www.atl.com.cn/en/sustainability/',
    recycled_content_claimed_pct: { 2022: 0, 2023: 0 },
    child_labor_incidents: [],
    audit_status: 'Apple supplier. Apple claims 100% recycled cobalt in Apple-designed batteries (2023). Applies to subset only.',
    laundering_risk: 0.42,
    laundering_note: 'Huayou cobalt in upstream. Apple recycled cobalt claim applies to Apple-designed chips only, not full battery.',
  },

  // ── OEMs ───────────────────────────────────────────────────────────────
  TESLA: {
    id: 'TESLA', name: 'Tesla', type: 'oem',
    hq: 'USA', flag: '🇺🇸',
    listed: 'NASDAQ: TSLA',
    owns_mines: [],
    elements: ['Li', 'Co', 'Ni'],
    buys_from: ['CATL', 'PANASONIC', 'LG_CHEM'],
    sells_to: [],
    esg_report: 'https://www.tesla.com/ns_videos/2023-tesla-impact-report.pdf',
    recycled_content_claimed_pct: { 2022: 0, 2023: 0 },
    recycling_note: 'Tesla Impact Report 2023: "working toward closed-loop recycling." No % commitment disclosed. Redwood Materials partnership for recycling.',
    child_labor_incidents: [
      { year: 2021, source: 'International Rights Advocates lawsuit', detail: 'Named in DC lawsuit re: cobalt supply chain. Tesla responded they are "committed to eliminating cobalt."' },
    ],
    audit_status: 'Conflict Minerals Report filed annually (SEC Form SD). Tier-1 suppliers audited; Tier-2+ not verified.',
    laundering_risk: 0.45,
  },
  APPLE: {
    id: 'APPLE', name: 'Apple', type: 'oem',
    hq: 'USA', flag: '🇺🇸',
    listed: 'NASDAQ: AAPL',
    owns_mines: [],
    elements: ['Li', 'Co'],
    buys_from: ['ATL'],
    sells_to: [],
    esg_report: 'https://www.apple.com/supplier-responsibility/',
    recycled_content_claimed_pct: { 2022: 13, 2023: 100 },  // 100% = cobalt in Apple-designed batteries only
    recycling_note: 'Apple claims 100% recycled cobalt in Apple-designed batteries (2023 Supplier Responsibility Report). Scope is limited to Apple-designed battery components, not full cell. Supplied by ATL which sources from Ganfeng/Huayou.',
    child_labor_incidents: [
      { year: 2016, source: 'Amnesty International', detail: 'Supply chain audit found Huayou/CDM (Apple supplier) sourcing from child-labor ASM sites. Apple implemented enhanced audit program.' },
      { year: 2021, source: 'International Rights Advocates lawsuit', detail: 'Named alongside Tesla, Google, Microsoft, Dell in DC federal lawsuit.' },
    ],
    audit_status: 'Most transparent OEM. Publishes full smelter list (100% identified). Third-party RMAP audits on all smelters. But audit scope = smelter only.',
    laundering_risk: 0.30,
    laundering_note: 'Low for Apple-designed components. But standard Li-ion batteries (MacBook, older devices) still via ATL/Huayou chain.',
  },
  BMW: {
    id: 'BMW', name: 'BMW Group', type: 'oem',
    hq: 'Germany', flag: '🇩🇪',
    listed: 'FWB: BMW',
    owns_mines: [],
    elements: ['Li', 'Co', 'Ni'],
    buys_from: ['CATL', 'SAMSUNG_SDI'],
    sells_to: [],
    esg_report: 'https://www.bmwgroup.com/en/responsibility/sustainabilityreport.html',
    recycled_content_claimed_pct: { 2022: 10, 2023: 15 },
    child_labor_incidents: [],
    audit_status: 'Published cobalt sourcing map. Reduced Nornickel exposure 2023. Uses DRIVE Sustainability framework.',
    laundering_risk: 0.32,
  },
  VOLKSWAGEN: {
    id: 'VOLKSWAGEN', name: 'Volkswagen Group', type: 'oem',
    hq: 'Germany', flag: '🇩🇪',
    listed: 'FWB: VOW3',
    owns_mines: [],
    elements: ['Li', 'Co', 'Ni'],
    buys_from: ['CATL', 'LG_CHEM', 'SAMSUNG_SDI', 'SAVANNAH'],
    sells_to: [],
    esg_report: 'https://www.volkswagenag.com/en/sustainability.html',
    recycled_content_claimed_pct: { 2022: 0, 2023: 5 },
    child_labor_incidents: [],
    audit_status: 'Invested in Northvolt (bankrupt 2024). Signed direct supply agreement with Savannah Resources Portugal.',
    laundering_risk: 0.35,
  },
}

// Flatten to array for UI
export const COMPANY_LIST = Object.values(COMPANIES)

// Get full upstream chain for an OEM
export function getUpstreamChain(companyId, depth = 0, visited = new Set()) {
  if (visited.has(companyId) || depth > 4) return []
  visited.add(companyId)
  const co = COMPANIES[companyId]
  if (!co) return []
  const chain = [{ ...co, depth }]
  const upstreams = [...(co.buys_from || []), ...(co.owns_mines ? [] : [])]
  for (const upId of upstreams) {
    chain.push(...getUpstreamChain(upId, depth + 1, visited))
  }
  return chain
}

// Aggregate child labor exposure for an OEM
export function oemChildLaborExposure(oemId) {
  const { childLaborRisk } = require('./child_labor.js')
  const chain = getUpstreamChain(oemId)
  const miners = chain.filter(c => c.type === 'miner' || c.type === 'miner_trader')
  // simplified: average risk across owned mines' countries
  return miners.length > 0
    ? miners.reduce((s, c) => s + (c.forced_labor_incidents?.length > 0 ? 0.6 : 0.2), 0) / miners.length
    : 0.1
}
