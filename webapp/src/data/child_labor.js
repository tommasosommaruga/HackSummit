// ─────────────────────────────────────────────────────────────────────────────
// Child Labor Risk by Country × Commodity
//
// Sources:
//  1. ILO ILOSTAT "Children in employment" (ages 5–17), latest available year
//     https://ilostat.ilo.org/topics/child-labour/
//  2. US DOL ILAB "List of Goods Produced by Child Labor or Forced Labor" (2022 ed.)
//     https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods
//  3. UNICEF "Child Labour" country profiles
//     https://data.unicef.org/topic/child-protection/child-labour/
//  4. Global Slavery Index 2023 — Walk Free Foundation
//     https://www.walkfree.org/global-slavery-index/
// ─────────────────────────────────────────────────────────────────────────────

// ILO % children 5-17 in employment (most recent survey year)
// DOL ILAB flags: which commodities are on the list for that country
// forced_labor_risk: 0–1 from Global Slavery Index prevalence score
export const COUNTRY_CHILD_LABOR = {
  // ── Central Africa ──────────────────────────────────────────────────────
  COD: {
    name: 'DR Congo', flag: '🇨🇩',
    ilo_pct: 41.4,          // World Bank SL.TLF.0714.ZS, 2014 survey (FETCHED LIVE)
    survey_year: 2014,
    dol_ilab_goods: ['cobalt', 'gold', 'cassiterite', 'wolframite', 'tantalum'],
    forced_labor_risk: 0.82,
    notes: 'Cobalt flagged since 2009. ASM zones Kolwezi/Lubumbashi have documented child miners. UNICEF estimates 40,000 children in cobalt ASM.',
  },
  ZMB: {
    name: 'Zambia', flag: '🇿🇲',
    ilo_pct: 40.4,          // 2018 ILOSTAT
    survey_year: 2018,
    dol_ilab_goods: ['tobacco', 'cotton'],  // copper/cobalt not yet formally listed
    forced_labor_risk: 0.41,
    notes: 'High child labor overall but mining sector more regulated than DRC. Copperbelt has some ASM activity.',
  },
  ZWE: {
    name: 'Zimbabwe', flag: '🇿🇼',
    ilo_pct: 34.2,          // 2019 ILOSTAT
    survey_year: 2019,
    dol_ilab_goods: ['tobacco', 'gold'],
    forced_labor_risk: 0.55,
    notes: 'Lithium mining rapid expansion post-2021 under Chinese investment. Governance weak. Mining child labor less documented but sector oversight low.',
  },
  MOZ: {
    name: 'Mozambique', flag: '🇲🇿',
    ilo_pct: 27.4,          // World Bank SL.TLF.0714.ZS, 2008 survey (FETCHED LIVE)
    survey_year: 2008,
    dol_ilab_goods: ['coal', 'sugarcane'],
    forced_labor_risk: 0.38,
    notes: 'Graphite mining (Balama) is industrial/formal. Lower child labor risk in mining vs. agriculture.',
  },

  // ── South America ───────────────────────────────────────────────────────
  BOL: {
    name: 'Bolivia', flag: '🇧🇴',
    ilo_pct: 13.9,          // World Bank SL.TLF.0714.ZS, 2015 survey (FETCHED LIVE)
    survey_year: 2015,
    dol_ilab_goods: ['silver', 'tin', 'zinc', 'sugarcane'],  // mining broadly flagged
    forced_labor_risk: 0.35,
    notes: 'Bolivia legalized child labor from age 10 (2014, partially reversed 2018). Mining cooperatives documented using minors. YLB state monopoly has limited audit.',
  },
  ARG: {
    name: 'Argentina', flag: '🇦🇷',
    ilo_pct: 5.0,           // World Bank SL.TLF.0714.ZS, 2012 survey (FETCHED LIVE)
    survey_year: 2012,
    dol_ilab_goods: [],
    forced_labor_risk: 0.12,
    notes: 'Industrial brine operations. Not on DOL ILAB list. Indigenous community dispute (Atacameño) is land rights issue, not child labor.',
  },
  CHL: {
    name: 'Chile', flag: '🇨🇱',
    ilo_pct: 4.5,           // World Bank SL.TLF.0714.ZS, 2012 survey (FETCHED LIVE)
    survey_year: 2012,
    dol_ilab_goods: [],
    forced_labor_risk: 0.06,
    notes: 'Lowest risk in Li triangle. IRMA-certified operations. Water use is primary ESG concern, not labor.',
  },

  // ── Asia-Pacific ────────────────────────────────────────────────────────
  IDN: {
    name: 'Indonesia', flag: '🇮🇩',
    ilo_pct: 3.7,           // World Bank SL.TLF.0714.ZS, 2010 survey (FETCHED LIVE)
    survey_year: 2010,
    dol_ilab_goods: ['palm_oil', 'tobacco', 'gold'],
    forced_labor_risk: 0.31,
    notes: 'Nickel HPAL plants are industrial. Main concern is deforestation and migrant labor rights, not child labor in mining specifically.',
  },
  PHL: {
    name: 'Philippines', flag: '🇵🇭',
    ilo_pct: 9.0,           // World Bank SL.TLF.0714.ZS, 2011 survey (FETCHED LIVE)
    survey_year: 2011,
    dol_ilab_goods: ['gold', 'sugarcane'],
    forced_labor_risk: 0.28,
    notes: 'Gold ASM has documented child labor. Nickel laterite mines are larger scale. DENR suspended several sites.',
  },
  CHN: {
    name: 'China', flag: '🇨🇳',
    ilo_pct: 7.4,           // 2010 ILOSTAT (last survey; likely underreported)
    survey_year: 2010,
    dol_ilab_goods: ['electronics_components', 'artificial_flowers', 'bricks'],
    forced_labor_risk: 0.48,  // Uyghur forced labor in supply chains
    notes: 'Official data underreports. Uyghur forced labor documented in polysilicon, cotton; less direct evidence in Li refining but supply chain opacity is high.',
  },
  RUS: {
    name: 'Russia', flag: '🇷🇺',
    ilo_pct: 0.4,           // ILO 2019
    survey_year: 2019,
    dol_ilab_goods: [],
    forced_labor_risk: 0.38,  // prison labor documented at Norilsk
    notes: 'Norilsk Nickel has documented use of prison/migrant labor. Not child labor but forced labor risk is significant post-sanctions.',
  },
  ZAF: {
    name: 'South Africa', flag: '🇿🇦',
    ilo_pct: 10.5,          // 2020 ILOSTAT
    survey_year: 2020,
    dol_ilab_goods: [],
    forced_labor_risk: 0.18,
    notes: 'ICMM-member operations. Manganese mining large-scale industrial. Labor rights concerns but not child labor.',
  },

  // ── Low risk ────────────────────────────────────────────────────────────
  AUS: {
    name: 'Australia', flag: '🇦🇺',
    ilo_pct: 0.2,
    survey_year: 2019,
    dol_ilab_goods: [],
    forced_labor_risk: 0.02,
    notes: 'ICMM-certified. Strongest regulatory environment.',
  },
  PRT: {
    name: 'Portugal', flag: '🇵🇹',
    ilo_pct: 0.3,
    survey_year: 2019,
    dol_ilab_goods: [],
    forced_labor_risk: 0.01,
    notes: 'EU regulatory framework. Early-stage mine under EUDR compliance.',
  },
  KOR: {
    name: 'South Korea', flag: '🇰🇷',
    ilo_pct: 0.2,
    survey_year: 2019,
    dol_ilab_goods: [],
    forced_labor_risk: 0.02,
    notes: 'Refinery operations only. Strong labor laws.',
  },
  FIN: {
    name: 'Finland', flag: '🇫🇮',
    ilo_pct: 0.1,
    survey_year: 2019,
    dol_ilab_goods: [],
    forced_labor_risk: 0.01,
    notes: 'EU refinery. Reducing Russian feedstock.',
  },
}

// Combined child labor risk score 0–1 per country
// = 0.5 × (ilo_pct/50) + 0.3 × forced_labor_risk + 0.2 × dol_ilab_mining_flag
export function childLaborRisk(countryCode, commodity = null) {
  const c = COUNTRY_CHILD_LABOR[countryCode]
  if (!c) return 0.1  // unknown → moderate default

  const iloScore = Math.min(c.ilo_pct / 50, 1)
  const dolFlag = commodity && c.dol_ilab_goods.includes(commodity) ? 1 : 0
  return 0.5 * iloScore + 0.3 * c.forced_labor_risk + 0.2 * dolFlag
}

// P(child labor in battery) given a set of mine shares
// mines: [{ country_code, element, share }]
export function pChildLabor(mineShares) {
  let p = 0
  for (const { country_code, element, share } of mineShares) {
    p += share * childLaborRisk(country_code, element)
  }
  return Math.min(p, 1)
}
