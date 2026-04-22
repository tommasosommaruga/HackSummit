// ─────────────────────────────────────────────────────────────────────────────
// Recycling Fraud Detection — mass-balance check on ESG claims
//
// Sources:
//  - IEA Global EV Outlook 2023 (battery demand volumes)
//    https://www.iea.org/reports/global-ev-outlook-2023
//  - Benchmark Mineral Intelligence recycling supply data 2023
//  - Circular Energy Storage Research (Hans Eric Melin) — recycled Li supply
//    https://circularenergystorage.com/
//  - Apple Supplier Responsibility Report 2023
//    https://www.apple.com/supplier-responsibility/pdf/Apple-SR-2023-Progress-Report.pdf
//  - CATL Sustainability Report 2022
//  - Umicore Integrated Annual Report 2023
//  - Volkswagen Group Sustainability Report 2022
// ─────────────────────────────────────────────────────────────────────────────

// Global actual recycled supply by element and year (kt)
// Source: Benchmark Mineral Intelligence / Circular Energy Storage
export const GLOBAL_RECYCLED_SUPPLY_KT = {
  Li: { 2020: 8,   2021: 14,  2022: 28,  2023: 52,  2024: 85  },
  Co: { 2020: 11,  2021: 16,  2022: 22,  2023: 28,  2024: 36  },
  Ni: { 2020: 45,  2021: 60,  2022: 75,  2023: 95,  2024: 120 },
  Mn: { 2020: 120, 2021: 140, 2022: 160, 2023: 185, 2024: 210 },
  C:  { 2020: 5,   2021: 8,   2022: 12,  2023: 20,  2024: 32  },
  Cu: { 2020: 1200,2021: 1300,2022: 1400,2023: 1500,2024: 1600},
}

// Global PRIMARY supply (for context on recycled share)
export const GLOBAL_PRIMARY_SUPPLY_KT = {
  Li: { 2020: 82,  2021: 100, 2022: 130, 2023: 180, 2024: 240 },
  Co: { 2020: 140, 2021: 165, 2022: 190, 2023: 210, 2024: 230 },
  Ni: { 2020: 2200,2021: 2500,2022: 2900,2023: 3300,2024: 3600},
  Mn: { 2020: 18000,2021:19000,2022:20000,2023:21000,2024:22000},
  C:  { 2020: 900, 2021: 950, 2022: 1000,2023: 1100,2024: 1200},
}

// Company ESG recycling claims
export const RECYCLING_CLAIMS = [
  {
    company_id: 'APPLE',
    company: 'Apple',
    year: 2023,
    element: 'Co',
    claimed_recycled_pct: 100,
    scope: 'Apple-designed batteries only (excludes standard Li-ion batteries in MacBooks, older iPhones)',
    source: 'Apple Supplier Responsibility Report 2023, p.42',
    source_url: 'https://www.apple.com/supplier-responsibility/pdf/Apple-SR-2023-Progress-Report.pdf',
    battery_volume_gwh: 8.2,   // Apple-designed battery volume estimate
    implied_recycled_kt_co: 0.8, // 100% of small Apple-designed subset
    global_recycled_supply_co: 28,
    plausible: true,
    verdict: 'TECHNICALLY TRUE but misleading',
    verdict_detail: '100% applies only to Apple Silicon chip batteries (small fraction). Standard MacBook/iPad batteries still use primary cobalt via ATL/Huayou.',
    greenwash_score: 0.62,
  },
  {
    company_id: 'APPLE',
    company: 'Apple',
    year: 2023,
    element: 'Li',
    claimed_recycled_pct: 0,
    scope: 'No recycled lithium claim made',
    source: 'Apple Supplier Responsibility Report 2023',
    battery_volume_gwh: 8.2,
    implied_recycled_kt_li: 0,
    plausible: true,
    verdict: 'NO CLAIM — accurate',
    greenwash_score: 0.0,
  },
  {
    company_id: 'CATL',
    company: 'CATL',
    year: 2023,
    element: 'Li',
    claimed_recycled_pct: 18,
    scope: 'Group-wide battery production',
    source: 'CATL Sustainability Report 2022 (latest public)',
    source_url: 'https://www.catl.com/uploads/1/file/public/202306/20230612181513_g1q4f9uc5t.pdf',
    battery_volume_gwh: 320,
    implied_recycled_kt_li: 32.5,  // 18% of ~180kt Li equivalent in 320GWh
    global_recycled_supply_li: 52,
    plausible: false,
    verdict: '⚠ IMPLAUSIBLE',
    verdict_detail: 'CATL alone claims 18% recycled Li on 320GWh production = ~32kt recycled Li. Global recycled Li supply in 2023 was ~52kt total across ALL companies. CATL\'s implied claim = 62% of global recycled supply. Other manufacturers also claim recycled content. Numbers don\'t add up.',
    greenwash_score: 0.78,
  },
  {
    company_id: 'CATL',
    company: 'CATL',
    year: 2023,
    element: 'Co',
    claimed_recycled_pct: 18,
    scope: 'Group-wide',
    source: 'CATL Sustainability Report 2022',
    battery_volume_gwh: 320,
    implied_recycled_kt_co: 14.4,
    global_recycled_supply_co: 28,
    plausible: false,
    verdict: '⚠ IMPLAUSIBLE',
    verdict_detail: 'Implied 14.4kt recycled Co = 51% of global supply. Combined with other companies\' claims this exceeds total global recycled cobalt available.',
    greenwash_score: 0.74,
  },
  {
    company_id: 'VOLKSWAGEN',
    company: 'Volkswagen',
    year: 2023,
    element: 'Li',
    claimed_recycled_pct: 5,
    scope: 'ID. series vehicles',
    source: 'VW Group Sustainability Report 2022, p.87',
    source_url: 'https://www.volkswagenag.com/presence/nachhaltigkeit/documents/sustainability-report/2022/Y_2022_Sustainability_Report.pdf',
    battery_volume_gwh: 48,
    implied_recycled_kt_li: 1.3,
    global_recycled_supply_li: 52,
    plausible: true,
    verdict: 'PLAUSIBLE',
    verdict_detail: '5% of VW\'s 48GWh = 1.3kt recycled Li. Reasonable given global supply.',
    greenwash_score: 0.15,
  },
  {
    company_id: 'BMW',
    company: 'BMW',
    year: 2023,
    element: 'Co',
    claimed_recycled_pct: 15,
    scope: 'BMW i-series and iX batteries',
    source: 'BMW Group Sustainability Report 2023',
    source_url: 'https://www.bmwgroup.com/content/dam/grpw/websites/bmwgroup_com/ir/downloads/en/2024/bericht/BMW-Group-Report-2023-EN.pdf',
    battery_volume_gwh: 22,
    implied_recycled_kt_co: 1.8,
    global_recycled_supply_co: 28,
    plausible: true,
    verdict: 'PLAUSIBLE',
    verdict_detail: '15% of BMW\'s 22GWh = 1.8kt recycled Co. Consistent with Umicore supply relationship.',
    greenwash_score: 0.12,
  },
  {
    company_id: 'TESLA',
    company: 'Tesla',
    year: 2023,
    element: 'Li',
    claimed_recycled_pct: 0,
    scope: 'No specific % claim — describes recycling program only',
    source: 'Tesla Impact Report 2023',
    source_url: 'https://www.tesla.com/ns_videos/2023-tesla-impact-report.pdf',
    battery_volume_gwh: 90,
    implied_recycled_kt_li: 0,
    plausible: true,
    verdict: 'NO SPECIFIC CLAIM',
    verdict_detail: 'Tesla describes Redwood Materials partnership but makes no quantified recycled content commitment in 2023 report. Relatively more honest than CATL.',
    greenwash_score: 0.20,
  },
  {
    company_id: 'UMICORE',
    company: 'Umicore',
    year: 2023,
    element: 'Co',
    claimed_recycled_pct: 22,
    scope: 'Umicore cathode materials production',
    source: 'Umicore Integrated Annual Report 2023',
    source_url: 'https://www.umicore.com/storage/main/ar2023/umicore-annual-report-2023.pdf',
    battery_volume_gwh: 40,  // cathode materials equivalent
    implied_recycled_kt_co: 3.5,
    global_recycled_supply_co: 28,
    plausible: true,
    verdict: 'PLAUSIBLE — BEST IN CLASS',
    verdict_detail: 'Umicore operates actual battery-to-battery recycling loop in Hoboken. 22% is independently verifiable. Battery recycling throughput published in annual report.',
    greenwash_score: 0.05,
  },
]

// Mass-balance check: given claim, is it mathematically possible?
export function checkMassBalance(claim) {
  const globalSupply = GLOBAL_RECYCLED_SUPPLY_KT[claim.element]?.[claim.year]
  const implied = claim.implied_recycled_kt_co || claim.implied_recycled_kt_li || 0
  if (!globalSupply || implied === 0) return { checkable: false }
  const share_of_global = implied / globalSupply
  return {
    checkable: true,
    implied_kt: implied,
    global_supply_kt: globalSupply,
    share_of_global,
    flag: share_of_global > 0.40,  // claiming >40% of global recycled supply = red flag
    flag_reason: share_of_global > 0.40
      ? `Implies consuming ${Math.round(share_of_global * 100)}% of total global recycled ${claim.element} supply`
      : null,
  }
}

// Overall greenwash risk score for a company (0=clean, 1=maximum greenwash)
export function companyGreenwashScore(companyId) {
  const claims = RECYCLING_CLAIMS.filter(c => c.company_id === companyId)
  if (!claims.length) return null
  return claims.reduce((s, c) => s + c.greenwash_score, 0) / claims.length
}
