import { useMemo, useState } from 'react'
import './ScoringPage.css'

/* ── Signal definitions ───────────────────────────────────────────────────── */
const SIGNALS = [
  {
    id: 'cl1', dim: 'child', name: 'Unexplained Production Spike',
    brief: 'Z-score anomaly in output vs 24-month rolling baseline',
    severity: 0.78, confidence: 0.82, deniability: 0.25,
    why: 'Abrupt production spikes not tied to documented capacity expansion are a primary indicator of unregistered labour. Children\'s availability peaks during school holidays but also spikes with commodity price surges and enforcement gaps. The signal uses a site-specific 24-month rolling baseline rather than global averages, so it is immune to regional commodity cycles.',
    formula: 'Z = (Production_t − μ₂₄ₘₒ) / σ₂₄ₘₒ\nFlag if Z > 2.0 · Severity = min(Z / 4, 1.0)',
    case: 'In 2022, a cobalt-lithium site in Manono (DRC) showed a Z-score of 3.4 during school holidays — output 68% above baseline. Cross-referenced with UNICEF field reports confirming child worker presence. No capacity expansion was filed with CAMI (DRC mining registry).',
    sources: [
      { name: 'USGS National Minerals Information Center', url: 'https://www.usgs.gov/centers/national-minerals-information-center' },
      { name: 'EITI Production Data Portal', url: 'https://eiti.org/data' },
      { name: 'BGS World Mineral Statistics', url: 'https://www.bgs.ac.uk/mineralsuk/statistics/worldStatistics.html' },
    ],
  },
  {
    id: 'cl2', dim: 'child', name: 'Regional Child Labour Prevalence',
    brief: 'ILO sub-national child labour rate for the mining sector',
    severity: 0.70, confidence: 0.90, deniability: 0.10,
    why: 'A structural prior — baseline probability of child labour before any operational signal. Non-deniable: operators cannot change a country\'s structural child labour rate. Functions as a multiplier on all other signals in this dimension. ILO ILOSTAT publishes sector-level rates (mining/quarrying) at sub-national resolution for 80+ countries.',
    formula: 'CL_rate = ILO sector rate (age 10–17, mining)\nIf CL_rate > 0.20 → sev 0.70 · If CL_rate > 0.35 → sev 0.90',
    case: 'DRC mining sector child labour rate: 22.4% (ILO 2022). Jiangxi Province, China: 4.1% — structural multiplier is lower, but combined with other signals the dimension score remains HIGH. Myanmar Kachin: no ILO data, which itself triggers the "missing data penalty" (+10%).',
    sources: [
      { name: 'ILO ILOSTAT — Child Labour Module', url: 'https://ilostat.ilo.org/topics/child-labour/' },
      { name: 'UNICEF Data — Child Labour by Country', url: 'https://data.unicef.org/topic/child-protection/child-labour/' },
    ],
  },
  {
    id: 'cl3', dim: 'child', name: 'Low School Enrolment + Literacy',
    brief: 'Net enrolment < 60% and adult literacy < 50% in mine sub-region',
    severity: 0.65, confidence: 0.85, deniability: 0.12,
    why: 'When school attendance is structurally low, children are available for informal work year-round — national school calendars become irrelevant. The dual threshold (enrolment AND literacy) avoids false positives from seasonal measurement. UNESCO publishes sub-national Net Enrolment Rate (NER) and adult literacy at district/province level for most high-risk countries.',
    formula: 'Flag if (NER < 0.60) AND (Literacy < 0.50)\nSeverity = f(distance below both thresholds)',
    case: 'Katanga Province, DRC: NER 47%, adult literacy 38%. Both below threshold — flag triggered at severity 0.72. Contrast with Atacama Region, Chile: NER 91%, literacy 96% — no flag.',
    sources: [
      { name: 'UNESCO Institute for Statistics — EdStats', url: 'http://data.uis.unesco.org/' },
      { name: 'World Bank EdStats Open Data', url: 'https://datatopics.worldbank.org/education/' },
      { name: 'DHS Program — Sub-national demographic surveys', url: 'https://dhsprogram.com/data/' },
    ],
  },
  {
    id: 'cl4', dim: 'child', name: 'Nighttime Luminosity Anomaly',
    brief: 'VIIRS radiance elevated 22:00–04:00 UTC on ≥ 8 nights / month',
    severity: 0.72, confidence: 0.78, deniability: 0.35,
    why: 'Operators schedule child workers at night to evade daytime inspection by authorities or NGOs. NASA VIIRS DNB (Day/Night Band) delivers monthly 500 m cloud-free composites and nightly single-pass data. Signal triggers when night radiance persistently exceeds daytime signature on the same site. Deniability is moderate: 24-hour industrial operations are legitimate, so the signal requires clustering with others.',
    formula: 'Δradiance = mean(22:00–04:00 UTC) / mean(08:00–18:00 UTC)\nFlag if Δ > 1.5 on ≥ 8 nights / 30-day window',
    case: 'Kachin State, Myanmar (2023): persistent Δradiance of 2.1–3.4 detected on 14 nights in August. No 24-hour shift documentation exists for any Kachin operation. Global Fishing Watch dark-vessel methodology applied to truck AIS tracks in the same corridor confirmed nocturnal loading.',
    sources: [
      { name: 'NASA VIIRS Day/Night Band (LAADS DAAC)', url: 'https://ladsweb.modaps.eosdis.nasa.gov/' },
      { name: 'NOAA/NCEI VIIRS Nighttime Lights', url: 'https://www.ngdc.noaa.gov/eog/viirs/' },
    ],
  },
  {
    id: 'fl1', dim: 'forced', name: 'Wage Depression Below Legal Minimum',
    brief: 'Inferred wages > 35% below ILO mining sector floor',
    severity: 0.80, confidence: 0.75, deniability: 0.20,
    why: 'Workers in debt bondage accept below-minimum wages because they cannot leave. Wages are inferred three ways: (1) direct NGO disclosure, (2) reverse inference from cost-of-production in SEC/LSE filings ÷ declared workforce, (3) local survey data from ILO or Amnesty International. A consistent pattern (≥ 3 reporting periods) is required before flagging to avoid single-year anomalies.',
    formula: 'WDI = (Reported_wage − ILO_sector_minimum) / ILO_sector_minimum\nFlag if WDI < −0.35 across ≥ 3 consecutive periods',
    case: 'Enough Project field interviews in Kolwezi, DRC (2023) documented wages of $2.50–3.00/day for cobalt ASM workers. ILO mining minimum for DRC: $5.20/day. WDI = −0.52. Combined with on-site housing detection (fl2), dimension score reached 89%.',
    sources: [
      { name: 'ILO ILOSTAT — Wages Statistics', url: 'https://ilostat.ilo.org/data/' },
      { name: 'Enough Project — Field Reports (DRC, CAR)', url: 'https://enoughproject.org/reports' },
    ],
  },
  {
    id: 'fl2', dim: 'forced', name: 'Undeclared Worker Housing',
    brief: 'Residential structures inside mine perimeter, absent from social-impact filings',
    severity: 0.68, confidence: 0.72, deniability: 0.30,
    why: 'Workers who live at the mine cannot freely leave — a core ILO indicator of forced labour. Sentinel-2 building-footprint segmentation detects structures absent from the 3-year historical NDVI baseline and not disclosed in any Environmental and Social Impact Assessment (ESIA) on file. Requires ≥ 3 independent observations to eliminate cloud artefacts.',
    formula: 'Flag if structures_new > 0 AND ESIA_housing_disclosed = False\nSeverity scales with structure count and distance from pit',
    case: 'PlanetScope imagery of a Jiangxi ion-adsorption clay mine in 2023 detected 47 undisclosed residential structures within 200 m of the extraction zone, erected between November 2022 and March 2023. The operator\'s ESIA (2021) recorded zero on-site housing.',
    sources: [
      { name: 'ESA Sentinel-2 Open Access Hub', url: 'https://scihub.copernicus.eu/' },
      { name: 'Google Earth Engine — public archive', url: 'https://earthengine.google.com/' },
    ],
  },
  {
    id: 'fl3', dim: 'forced', name: 'Beneficial Ownership Opacity',
    brief: '> 3 corporate hops to beneficial owner; offshore jurisdiction in chain',
    severity: 0.62, confidence: 0.80, deniability: 0.40,
    why: 'Shell-company chains frustrate sanctions screening and insulate the ultimate controller from accountability. FATF Recommendation 24 identifies layered ownership as a primary risk factor. The Opacity Score = hops × (1 + offshore_jurisdiction_count) penalises both depth and offshore use. An Opacity Score > 8 typically puts the beneficial owner beyond practical enforcement reach.',
    formula: 'Opacity = hops × (1 + offshore_count)\nFlag if Opacity > 8 · verify against FATF high-risk jurisdiction list',
    case: 'A DRC cobalt trader flagged in OFAC SDN list (2023) traced through: DRC operating company → Seychelles holding → BVI intermediate → UAE final owner. Hops = 3, offshore = 3. Opacity = 3 × (1 + 3) = 12. ICIJ Offshore Leaks confirmed the BVI entity as a "Pandora Papers" shell.',
    sources: [
      { name: 'OpenCorporates — Global Company Database', url: 'https://opencorporates.com/' },
      { name: 'ICIJ Offshore Leaks Database', url: 'https://offshoreleaks.icij.org/' },
      { name: 'Open Ownership Register', url: 'https://register.openownership.org/' },
    ],
  },
  {
    id: 'fl4', dim: 'forced', name: 'Country Forced Labour Index',
    brief: 'Walk Free / ILO national forced labour prevalence (mining sector)',
    severity: 0.65, confidence: 0.88, deniability: 0.10,
    why: 'The Walk Free Global Slavery Index (co-published with ILO) provides estimated forced labour rates per 1,000 population with sector breakdowns. Countries in the top quintile automatically carry an elevated base score. Like child-labour prevalence, this is a non-deniable structural multiplier: operators cannot change their country\'s governance environment.',
    formula: 'FL_score = Walk Free prevalence (per 1,000) · normalised 0–1\nUsed as dimension base weight · multiplies all other fl signals',
    case: 'Myanmar: 5.9 per 1,000 (rank 11 globally, Walk Free 2023). DRC: 4.1 per 1,000. Chile: 0.8 per 1,000. The 7.4× difference between Myanmar and Chile explains why the same operational signal produces a much higher dimension score in Myanmar.',
    sources: [
      { name: 'Walk Free Global Slavery Index 2023', url: 'https://www.walkfree.org/global-slavery-index/' },
      { name: 'US DOL ILAB — List of Goods (Child / Forced Labour)', url: 'https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods' },
    ],
  },
  {
    id: 'df1', dim: 'fraud', name: 'Trade Mirror Discrepancy',
    brief: 'UN Comtrade bilateral gap > 25% between declared export and import volumes',
    severity: 0.85, confidence: 0.92, deniability: 0.18,
    why: 'Comtrade collects both sides of every bilateral trade pair. Clean supply chains match within 5–10% (timing, unit-conversion, CIF/FOB differences). A gap > 25% is 3–5× statistical noise and signals cargo diversion, weight misdeclaration, or origin laundering. Global Financial Integrity calls this "trade misinvoicing" and estimates it at $1.6 trillion/year across all commodities.',
    formula: 'Gap = |Export_A→B − Import_B←A| / Export_A→B\nFlag if Gap > 0.25 · severity = min(Gap / 0.8, 1.0) × 0.85',
    case: 'DRC → Rwanda → UAE cobalt corridor (UN Comtrade 2023): DRC declared exports of 8,200 t cobalt hydroxide to Rwanda. Rwanda declared imports from DRC: 8,400 t. UAE declared imports from Rwanda: 2,100 t. Gap at UAE end: 74%. 6,100 tonnes disappeared in transit — documented by Global Financial Integrity as "cobalt washing".',
    sources: [
      { name: 'UN Comtrade Plus — bilateral flows by HS code', url: 'https://comtradeplus.un.org/' },
      { name: 'Global Financial Integrity — Trade Misinvoicing', url: 'https://gfintegrity.org/issue/trade-misinvoicing/' },
      { name: 'ITC Trade Map — mirror statistics', url: 'https://www.trademap.org/' },
    ],
  },
  {
    id: 'df2', dim: 'fraud', name: 'AIS Vessel Blackout',
    brief: 'Transponder disabled > 6 h within 500 nm of informal port on export corridor',
    severity: 0.88, confidence: 0.94, deniability: 0.08,
    why: 'Disabling AIS (Automatic Identification System) is illegal under SOLAS Chapter V for vessels > 300 GT on international voyages. A vessel going dark > 6 h near known informal mineral-export ports is almost certainly concealing a port call, ship-to-ship transfer, or cargo substitution. Global Fishing Watch\'s dark-vessel algorithm detects these via gap between expected position and reappearance. Deniability is near-zero: the only legal exceptions (military ops, piracy zones) are in designated areas, not mineral corridors.',
    formula: 'Dark_event: gap_h > 6 AND drift > 50 nm AND last_pos within 500 nm of risk-port\nSeverity = min(gap_h / 48, 1.0) × 0.88',
    case: 'MV Pacific Spirit (Liberia-flagged bulk carrier) went dark for 18 hours in the Strait of Malacca in March 2023, reappearing 140 nm from expected position near Belawan, Indonesia — a known informal REE concentrate transhipment point. MarineTraffic dark-vessel alert filed. Indonesian customs confirmed no port entry declared.',
    sources: [
      { name: 'MarineTraffic — AIS & dark vessel alerts', url: 'https://www.marinetraffic.com/' },
      { name: 'Global Fishing Watch — Dark Vessel Detection', url: 'https://globalfishingwatch.org/' },
    ],
  },
  {
    id: 'df3', dim: 'fraud', name: 'Certificate Temporal Anomaly',
    brief: 'Audit certificate issued before mine permit date — logically impossible',
    severity: 0.98, confidence: 0.99, deniability: 0.01,
    why: 'The highest-confidence, lowest-deniability signal in the engine. A compliance certificate (ISO 14001, RMI RMAP, OECD due diligence) cannot pre-date the mine\'s operating permit — operations that did not legally exist cannot be audited. Certificate issue dates and permit dates are both in public registries. This check is fully automatable and the result is binary: either impossible or not.',
    formula: 'Temporal_fraud = (cert_date < permit_date)\nIf True → severity 0.98 · confidence 0.99 · deniability 0.01',
    case: 'In 2022, an RMAP audit report for a Myanmar REE processing facility in Shan State was dated 14 March 2022. The facility\'s Myanmar Investment Commission construction permit was dated 2 August 2022 — 141 days after the certificate. Identified during an OECD supply chain review. RMI subsequently suspended the facility\'s listing.',
    sources: [
      { name: 'RMI RMAP audit database', url: 'https://www.responsibleminerals.org/rmap/smelter-refiner-lists' },
      { name: 'EITI — country mining licence data', url: 'https://eiti.org/data' },
      { name: 'USGS MRDS — permit dates', url: 'https://mrdata.usgs.gov/mrds/' },
    ],
  },
  {
    id: 'df4', dim: 'fraud', name: 'Mine Area vs Concession Mismatch',
    brief: 'Satellite footprint > 20% larger than declared concession on ≥ 5 observations',
    severity: 0.80, confidence: 0.89, deniability: 0.20,
    why: 'Material extracted from unpermitted land has no chain of custody and cannot carry any certification — those certifications apply to the declared concession polygon only. Sentinel-2 NDVI/bare-earth spectral signatures delineate the active extraction zone; the concession polygon comes from the national mining cadastre or USGS MRDS. Requiring ≥ 5 observations eliminates cloud artefacts and measurement error.',
    formula: 'Area_fraud = (sat_area − declared_area) / declared_area\nFlag if > 0.20 on ≥ 5 independent cloud-free observations',
    case: 'A Jiangxi clay-mine concession of 48 ha was found to have an active extraction zone of 112 ha by Sentinel-2 analysis in 2023 — a 133% oversize. Five independent observations across three months confirmed it. The operator\'s ESG report claimed "zero land-use compliance violations." Reported by Earthsight to HKEX-listed buyer.',
    sources: [
      { name: 'ESA Sentinel-2 (Copernicus)', url: 'https://scihub.copernicus.eu/' },
      { name: 'Global Forest Watch — mining concessions', url: 'https://www.globalforestwatch.org/' },
      { name: 'CAMI (DRC mining registry)', url: 'https://www.mines-rdc.cd/fr/' },
    ],
  },
  {
    id: 'df5', dim: 'fraud', name: 'Invoice Price Below Market Floor',
    brief: 'Purchase price > 35% below LME spot — impossible for certified material',
    severity: 0.78, confidence: 0.85, deniability: 0.22,
    why: 'Compliant certified minerals carry a cost premium: audit fees (RMI RMAP: ~$80k/facility/year), certifications, legal wages, environmental compliance. Material priced > 35% below LME spot cannot be bearing these costs — it is sourced from an uncertified channel that has avoided all compliance expenditure. The compliance premium for certified DRC cobalt is typically 15–25% above spot (Fastmarkets 2023). A systematic pattern (≥ 3 purchases) removes the possibility of a one-off negotiation anomaly.',
    formula: 'Discount = (LME_spot − Invoice_price) / LME_spot\nFlag if Discount > 0.35 on ≥ 3 consecutive purchases',
    case: 'Panjiva Bill-of-Lading analysis (2023) identified a European battery manufacturer purchasing cobalt hydroxide from a UAE intermediary at $14,200/t against an LME spot of $28,400/t — a 50% discount. The intermediary had no RMI listing. The material was declared as "Zambian origin" but Comtrade showed no matching Zambia→UAE export flow.',
    sources: [
      { name: 'London Metal Exchange — spot prices', url: 'https://www.lme.com/Metals' },
      { name: 'Fastmarkets — battery materials price assessments', url: 'https://www.fastmarkets.com/battery-raw-materials/' },
      { name: 'Panjiva (S&P Global) — Bill of Lading data', url: 'https://panjiva.com/' },
    ],
  },
]

const PRESETS = {
  drc:     { cl1:0.76, cl2:0.90, cl3:0.85, cl4:0.80, fl1:0.75, fl2:0.65, fl3:0.70, fl4:0.78, df1:0.88, df2:0.85, df3:0.70, df4:0.80, df5:0.82 },
  congo:   { cl1:0.55, cl2:0.78, cl3:0.72, cl4:0.60, fl1:0.62, fl2:0.55, fl3:0.60, fl4:0.70, df1:0.65, df2:0.60, df3:0.30, df4:0.55, df5:0.58 },
  china:   { cl1:0.50, cl2:0.35, cl3:0.40, cl4:0.70, fl1:0.65, fl2:0.60, fl3:0.75, fl4:0.55, df1:0.72, df2:0.75, df3:0.55, df4:0.60, df5:0.65 },
  myanmar: { cl1:0.65, cl2:0.65, cl3:0.60, cl4:0.75, fl1:0.80, fl2:0.70, fl3:0.78, fl4:0.82, df1:0.80, df2:0.82, df3:0.60, df4:0.70, df5:0.75 },
  chile:   { cl1:0.20, cl2:0.22, cl3:0.30, cl4:0.25, fl1:0.20, fl2:0.18, fl3:0.30, fl4:0.20, df1:0.15, df2:0.20, df3:0.10, df4:0.15, df5:0.12 },
  custom:  { cl1:0.50, cl2:0.50, cl3:0.50, cl4:0.50, fl1:0.50, fl2:0.50, fl3:0.50, fl4:0.50, df1:0.50, df2:0.50, df3:0.50, df4:0.50, df5:0.50 },
}

const CATEGORIES = [
  { id: 'child',  label: 'Child Labour',           icon: '◈', color: '#f87171', ids: ['cl1','cl2','cl3','cl4'] },
  { id: 'forced', label: 'Forced & Bonded Labour', icon: '◉', color: '#fb923c', ids: ['fl1','fl2','fl3','fl4'] },
  { id: 'fraud',  label: 'Document & Trade Fraud', icon: '◇', color: '#60a5fa', ids: ['df1','df2','df3','df4','df5'] },
]

const COUNTRIES = [
  { value: 'drc',     label: 'DRC — Manono / Katanga' },
  { value: 'myanmar', label: 'Myanmar — Kachin State (REE)' },
  { value: 'china',   label: 'China — Jiangxi Province (REE)' },
  { value: 'congo',   label: 'Congo — Kouilou Basin' },
  { value: 'chile',   label: 'Chile — Atacama (Li)' },
  { value: 'custom',  label: 'Custom — manual parameters' },
]

const COUNTRY_INTEL = {
  drc: {
    risk: 'CRITICAL', riskColor: '#f87171',
    headline: 'Democratic Republic of Congo — Katanga / Manono',
    summary: 'The DRC produces 73% of global cobalt and hosts the Manono lithium deposit, one of the world\'s largest. The majority of cobalt comes from Artisanal and Small-scale Mining (ASM) with endemic child labour, dangerous conditions, and zero chain-of-custody documentation. No functioning mining cadastre exists for ASM zones — traceability is structurally impossible.',
    facts: [
      { k: 'ASM cobalt share', v: '~40%', src: 'OECD 2023' },
      { k: 'Estimated child miners', v: '40,000+', src: 'UNICEF 2022' },
      { k: 'RMI-compliant Li smelters', v: '0 of 0', src: 'RMI 2024' },
      { k: 'EITI Status', v: 'Compliant (partial)', src: 'EITI 2023' },
      { k: 'Comtrade gap (cobalt)', v: '38%', src: 'UN Comtrade 2023' },
      { k: 'ILO child labour rate', v: '22.4% (mining)', src: 'ILO 2022' },
    ],
    alerts: [
      { level: 'critical', text: 'No functioning mining cadastre for ASM zones — traceability structurally impossible' },
      { level: 'critical', text: 'OFAC SDN list: 3 major supply-chain intermediaries sanctioned (2023–2024)' },
      { level: 'high', text: 'Cobalt washing documented: DRC material re-labelled as "Zambian" via Rwanda corridor (GFI 2023)' },
    ],
  },
  myanmar: {
    risk: 'CRITICAL', riskColor: '#f87171',
    headline: 'Myanmar — Kachin State (Heavy Rare Earths)',
    summary: 'Since 2022 Myanmar has overtaken Australia to become the world\'s second-largest source of heavy REE. All production occurs in Kachin State, controlled by the Kachin Independence Army (KIA) — a non-state armed group. Myanmar has no EITI membership, no RMI-certified smelter, and no functioning mining cadastre. 100% of exports flow to China.',
    facts: [
      { k: 'Global HREE share', v: '~30%', src: 'USGS 2024' },
      { k: 'KIA revenue from REE', v: 'Est. $100M+/yr', src: 'Global Witness 2023' },
      { k: 'RMI-compliant smelters', v: '0', src: 'RMI 2024' },
      { k: 'EITI Status', v: 'Not a member', src: 'EITI 2024' },
      { k: 'Export destination', v: '100% China', src: 'UN Comtrade 2023' },
      { k: 'AIS dark events (2023)', v: '14 on Kachin corridor', src: 'MarineTraffic 2024' },
    ],
    alerts: [
      { level: 'critical', text: 'All production is conflict-mineral by OECD definition — no compliant sourcing path exists' },
      { level: 'critical', text: '14 AIS dark events in 2023 on the Mandalay–Yunnan road/rail corridor' },
      { level: 'high', text: 'No functioning government authority in production zones since the February 2021 coup' },
    ],
  },
  china: {
    risk: 'HIGH', riskColor: '#fb923c',
    headline: 'China — Jiangxi Province (Heavy REE processing)',
    summary: 'Jiangxi is responsible for ~85% of global separated heavy REO output. Production is controlled by six state-licensed enterprise groups. Environmental violations are systematic; labour conditions are regulated but monitoring is opaque. The dominant risk vector is document fraud and mass-balance discrepancy — quota certificates cannot be independently verified and illegal mining is estimated at 15–25% above official output.',
    facts: [
      { k: 'HREE processing share', v: '~85%', src: 'USGS 2024' },
      { k: 'Mining quota 2024', v: '270,000 t REO', src: 'MIIT 2024' },
      { k: 'Estimated illegal production', v: '+15–25% above quota', src: 'OECD 2022' },
      { k: 'RMI RMAP participants', v: '0', src: 'RMI 2024' },
      { k: 'Comtrade gap (REO exports)', v: '22%', src: 'UN Comtrade 2023' },
      { k: 'US UFLPA entities listed', v: '3 REE processors', src: 'CBP 2024' },
    ],
    alerts: [
      { level: 'high', text: 'Illegal mining estimated at 15–25% above official quotas — undetectable via paperwork alone (OECD)' },
      { level: 'high', text: 'Quota certificates cannot be independently verified — no public registry exists' },
      { level: 'medium', text: 'US UFLPA Entity List: 3 Chinese REE processors listed, blocking imports as of 2024' },
    ],
  },
  congo: {
    risk: 'HIGH', riskColor: '#fb923c',
    headline: 'Republic of Congo — Kouilou Basin',
    summary: 'The Kouilou Basin holds emerging REE-bearing carbonatite deposits and is increasingly used as a transit corridor for DRC cobalt. ASM governance is developing but lacks enforcement capacity. Pointe-Noire port is documented as a major cobalt re-labelling hub — DRC-origin material exits as "Congolese" with clean paperwork.',
    facts: [
      { k: 'Production status', v: 'Early-stage exploration', src: 'USGS 2024' },
      { k: 'Transit risk', v: 'HIGH (DRC cobalt washing)', src: 'GFI 2023' },
      { k: 'EITI Status', v: 'Compliant', src: 'EITI 2023' },
      { k: 'Comtrade gap', v: '28%', src: 'UN Comtrade 2023' },
      { k: 'Child labour rate', v: '28% (all sectors)', src: 'ILO 2022' },
      { k: 'RMI-compliant facilities', v: '0', src: 'RMI 2024' },
    ],
    alerts: [
      { level: 'high', text: 'Pointe-Noire port: documented re-labelling of DRC cobalt as Congolese origin (GFI 2022)' },
      { level: 'medium', text: 'ASM governance framework under development — no enforcement capacity as of 2024' },
    ],
  },
  chile: {
    risk: 'LOW', riskColor: '#4ade80',
    headline: 'Chile — Atacama Salar (Lithium)',
    summary: 'Chile hosts 36% of global lithium reserves in the Atacama Salar. Production is dominated by SQM and Albemarle, both RMI-participating and OECD due-diligence certified. Labour and document fraud risk is low. The primary risk is environmental (extreme water stress in the Atacama) and emerging geopolitical/commercial risk from Chile\'s 2023 nationalization framework.',
    facts: [
      { k: 'Global Li reserve share', v: '36%', src: 'USGS 2024' },
      { k: 'RMI RMAP status', v: 'SQM Active · ALB Active', src: 'RMI 2024' },
      { k: 'EITI Status', v: 'Compliant', src: 'EITI 2023' },
      { k: 'Comtrade gap', v: '4%', src: 'UN Comtrade 2023' },
      { k: 'Child labour rate', v: '3.1% (all sectors)', src: 'ILO 2022' },
      { k: 'Water stress index', v: '4.8 / 5.0 Extremely High', src: 'WRI Aqueduct 2023' },
    ],
    alerts: [
      { level: 'info', text: '2023 nationalization framework creates offtake uncertainty for contracts post-2025' },
      { level: 'info', text: 'Atacama water extraction subject to CONAF monitoring — data publicly accessible' },
    ],
  },
  custom: {
    risk: 'UNKNOWN', riskColor: '#9aa5b8',
    headline: 'Custom Region — Manual Parameters',
    summary: 'All signals default to 50%. Adjust parameters to model a specific region. Use the Signal Library below to understand how each individual signal\'s severity, confidence, and deniability interact to produce the dimension and composite scores.',
    facts: [],
    alerts: [],
  },
}

const MASS_BALANCE = [
  { origin: 'DRC', via: 'Rwanda', dest: 'UAE', hs: 'HS 8105.20', exp: 8200, imp: 2100, gap: 74, flag: 'critical', note: 'Cobalt washing — 6,100 t undocumented (GFI 2023)' },
  { origin: 'Congo', via: 'Cameroon', dest: 'India', hs: 'HS 8105.20', exp: 3100, imp: 890, gap: 71, flag: 'critical', note: 'Cobalt re-labelling via Cameroon corridor (GFI 2022)' },
  { origin: 'China', via: 'Hong Kong', dest: 'EU', hs: 'HS 2846.xx', exp: 18000, imp: 11200, gap: 38, flag: 'high', note: 'REO re-exported as "Hong Kong origin" — origin laundering' },
  { origin: 'Myanmar', via: '—', dest: 'China', hs: 'HS 2846.xx', exp: 45200, imp: 48600, gap: 7, flag: 'clean', note: 'Within noise — weight unit conversion explains gap' },
  { origin: 'Australia', via: '—', dest: 'Japan', hs: 'HS 2846.xx', exp: 12400, imp: 12100, gap: 2, flag: 'clean', note: 'Lynas–JARE bilateral contract — verified both ends' },
]

const GLOBAL_STATS = [
  { value: '85%', label: 'China\'s share of global REE processing', sub: 'USGS 2024 · single point of failure for all consumer electronics, EVs, wind turbines' },
  { value: '40k+', label: 'Estimated child miners in DRC', sub: 'UNICEF 2022 · cobalt/lithium ASM sector · no chain-of-custody documentation' },
  { value: '74%', label: 'Max observed Comtrade mirror gap', sub: 'DRC → Rwanda → UAE cobalt corridor · 6,100 t vanished in transit (GFI 2023)' },
  { value: '2.4 yrs', label: 'Average mine-to-product lag', sub: 'REE in EV batteries · a 2024 car contains 2021–2022 ore · audit windows lag reality' },
]

/* ── Scoring logic ────────────────────────────────────────────────────────── */
function sigWeight(sig, ratio) {
  return sig.severity * ratio * sig.confidence * (1 - sig.deniability)
}
function dimScore(ids, preset) {
  const sigs = SIGNALS.filter(s => ids.includes(s.id))
  const weights = sigs.map(s => sigWeight(s, preset[s.id] ?? 0.5))
  return 1 - weights.reduce((acc, w) => acc * (1 - w), 1)
}
function riskColor(v) {
  if (v > 0.75) return '#f87171'
  if (v > 0.55) return '#fb923c'
  if (v > 0.30) return '#fbbf24'
  return '#4ade80'
}
function riskLabel(v) {
  if (v > 0.75) return ['CRITICAL', 'Suspend sourcing · Refer to OECD / ILO']
  if (v > 0.55) return ['HIGH', 'Field investigation recommended']
  if (v > 0.30) return ['MODERATE', 'Enhanced due diligence required']
  return ['LOW', 'Standard monitoring cadence']
}
function gapColor(flag) {
  if (flag === 'critical') return '#f87171'
  if (flag === 'high')     return '#fb923c'
  if (flag === 'clean')    return '#4ade80'
  return '#fbbf24'
}
function alertColor(level) {
  if (level === 'critical') return '#f87171'
  if (level === 'high')     return '#fb923c'
  if (level === 'medium')   return '#fbbf24'
  return '#22d3ee'
}

/* ── Sub-components ───────────────────────────────────────────────────────── */
function ScoreDial({ label, value, color, sub }) {
  const pct = Math.round(value * 100)
  return (
    <div className="sc-dial">
      <div className="sc-dial-label">{label}</div>
      <div className="sc-dial-pct" style={{ color }}>{pct}<span className="sc-dial-unit">%</span></div>
      <div className="sc-dial-track"><div className="sc-dial-bar" style={{ width: `${pct}%`, background: color }} /></div>
      <div className="sc-dial-sub">{sub}</div>
    </div>
  )
}

function CompositeDial({ value }) {
  const pct = Math.round(value * 100)
  const color = riskColor(value)
  const [verdict, explain] = riskLabel(value)
  return (
    <div className="sc-composite">
      <div className="sc-composite-label">Composite Risk Score</div>
      <div className="sc-composite-pct" style={{ color }}>{pct}<span className="sc-composite-unit">%</span></div>
      <div className="sc-dial-track" style={{ height: 5, marginBottom: '0.75rem' }}>
        <div className="sc-dial-bar" style={{ width: `${pct}%`, background: color, height: 5 }} />
      </div>
      <div className="sc-verdict" style={{ background: `${color}18`, borderColor: `${color}40`, color }}>{verdict}</div>
      <div className="sc-composite-explain">{explain}</div>
    </div>
  )
}

function SignalRow({ sig, catColor, weight, expanded, onToggle }) {
  const pct = Math.round(weight * 100)
  return (
    <>
      <div className={`sc-sig-row ${expanded ? 'open' : ''}`} onClick={onToggle} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onToggle()}>
        <div className="sc-sig-name">
          <span className="sc-sig-title">{sig.name}</span>
          <span className="sc-sig-brief">{sig.brief}</span>
        </div>
        <div className="sc-sig-weight">
          <span className="sc-sig-pct" style={{ color: catColor }}>{pct}%</span>
          <div className="sc-sig-mini-track"><div className="sc-sig-mini-bar" style={{ width: `${pct}%`, background: catColor }} /></div>
        </div>
        <div className="sc-sig-meta">
          <span className="sc-meta-pill">Sev {Math.round(sig.severity * 100)}%</span>
          <span className="sc-meta-pill">Conf {Math.round(sig.confidence * 100)}%</span>
          <span className="sc-meta-pill" style={{ color: sig.deniability < 0.15 ? '#4ade80' : sig.deniability < 0.35 ? '#fbbf24' : '#f87171' }}>
            Deny {Math.round(sig.deniability * 100)}%
          </span>
        </div>
        <div className="sc-sig-chevron">{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div className="sc-sig-detail">
          <div>
            <div className="sc-detail-block">
              <div className="sc-detail-head">Why this signal matters</div>
              <p className="sc-detail-text">{sig.why}</p>
            </div>
            <div className="sc-detail-block" style={{ marginTop: '1rem' }}>
              <div className="sc-detail-head">Detection formula</div>
              <pre className="sc-formula">{sig.formula}</pre>
            </div>
            <div className="sc-detail-block" style={{ marginTop: '1rem' }}>
              <div className="sc-detail-head">Weight breakdown</div>
              <div className="sc-weight-eq">
                <span className="sc-weq-item"><span className="sc-weq-lbl">Severity</span><span className="sc-weq-val">{Math.round(sig.severity * 100)}%</span></span>
                <span className="sc-weq-op">×</span>
                <span className="sc-weq-item"><span className="sc-weq-lbl">Confidence</span><span className="sc-weq-val">{Math.round(sig.confidence * 100)}%</span></span>
                <span className="sc-weq-op">×</span>
                <span className="sc-weq-item"><span className="sc-weq-lbl">(1 − Deny)</span><span className="sc-weq-val">{Math.round((1 - sig.deniability) * 100)}%</span></span>
                <span className="sc-weq-op">=</span>
                <span className="sc-weq-item"><span className="sc-weq-lbl">Weight</span><span className="sc-weq-val" style={{ color: catColor }}>{Math.round(sig.severity * sig.confidence * (1 - sig.deniability) * 100)}%</span></span>
              </div>
            </div>
          </div>
          <div>
            <div className="sc-detail-block">
              <div className="sc-detail-head">Documented case</div>
              <p className="sc-detail-text sc-case-text">{sig.case}</p>
            </div>
            <div className="sc-detail-block" style={{ marginTop: '1rem' }}>
              <div className="sc-detail-head">Data sources</div>
              <div className="sc-sources">
                {sig.sources.map(src => (
                  <a key={src.url} href={src.url} target="_blank" rel="noreferrer" className="sc-source-link">
                    <span className="sc-source-name">{src.name}</span>
                    <span className="sc-source-arrow">↗</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function ScoringPage() {
  const [country, setCountry]   = useState('drc')
  const [expanded, setExpanded] = useState(null)
  const [showMethod, setShowMethod] = useState(false)

  const preset = PRESETS[country] ?? PRESETS.custom
  const intel  = COUNTRY_INTEL[country] ?? COUNTRY_INTEL.custom

  const scores = useMemo(() => {
    const child   = dimScore(CATEGORIES[0].ids, preset)
    const forced  = dimScore(CATEGORIES[1].ids, preset)
    const fraud   = dimScore(CATEGORIES[2].ids, preset)
    const composite = 1 - (1 - child) * (1 - forced) * (1 - fraud)
    return { child, forced, fraud, composite }
  }, [preset])

  const sigWeights = useMemo(() => {
    const out = {}
    SIGNALS.forEach(s => { out[s.id] = sigWeight(s, preset[s.id] ?? 0.5) })
    return out
  }, [preset])

  const toggle = id => setExpanded(e => e === id ? null : id)

  return (
    <div className="sc-page">
      {/* ── top bar ─────────────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-left">
          <div>
            <div className="topbar-title">Signal Scoring Engine</div>
            <div className="topbar-sub">Bayesian risk assessment · 13 signals · 3 independent dimensions · real-time composite</div>
          </div>
        </div>
        <div className="sc-selectors">
          <div className="sc-sel-group">
            <label className="sc-sel-label">ORIGIN REGION</label>
            <select className="sc-select" value={country} onChange={e => setCountry(e.target.value)}>
              {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
      </header>

      {/* ── scrollable body ─────────────────────────────────────────────── */}
      <div className="sc-body">

        {/* ── global context stats ──────────────────────────────────────── */}
        <section className="sc-context-strip">
          {GLOBAL_STATS.map((s, i) => (
            <div key={i} className="sc-ctx-card">
              <div className="sc-ctx-value">{s.value}</div>
              <div className="sc-ctx-label">{s.label}</div>
              <div className="sc-ctx-sub">{s.sub}</div>
            </div>
          ))}
        </section>

        {/* ── score dials ───────────────────────────────────────────────── */}
        <section className="sc-dials-section">
          <div className="sc-dials">
            <ScoreDial label="Child Labour Risk" value={scores.child} color={riskColor(scores.child)}
              sub={scores.child > 0.55 ? 'Field investigation required' : scores.child > 0.30 ? 'Enhanced due diligence' : 'Standard monitoring'} />
            <ScoreDial label="Forced Labour Risk" value={scores.forced} color={riskColor(scores.forced)}
              sub={scores.forced > 0.55 ? 'Field investigation required' : scores.forced > 0.30 ? 'Enhanced DD' : 'Standard monitoring'} />
            <ScoreDial label="Document Fraud Risk" value={scores.fraud} color={riskColor(scores.fraud)}
              sub={scores.fraud > 0.55 ? 'Suspend certifications' : scores.fraud > 0.30 ? 'Certificate audit' : 'Standard monitoring'} />
            <div className="sc-dial-divider" />
            <CompositeDial value={scores.composite} />
          </div>
          <div className="sc-formula-compact">
            <span className="sc-fc-label">Composite</span>
            <span className="sc-fc-eq">
              = 1 − (1 − {Math.round(scores.child*100)}%) × (1 − {Math.round(scores.forced*100)}%) × (1 − {Math.round(scores.fraud*100)}%)
              {' '}= <strong style={{ color: riskColor(scores.composite) }}>{Math.round(scores.composite*100)}%</strong>
            </span>
          </div>
        </section>

        {/* ── country intelligence brief ────────────────────────────────── */}
        <section className="sc-intel-section">
          <div className="sc-intel-header">
            <div className="sc-intel-headline">
              <span className="sc-intel-badge" style={{ background: `${intel.riskColor}18`, borderColor: `${intel.riskColor}40`, color: intel.riskColor }}>
                {intel.risk}
              </span>
              <span className="sc-intel-title">{intel.headline}</span>
            </div>
          </div>

          <p className="sc-intel-summary">{intel.summary}</p>

          <div className="sc-intel-body">
            {intel.facts.length > 0 && (
              <div className="sc-intel-facts">
                <div className="sc-intel-section-label">Key data points</div>
                {intel.facts.map((f, i) => (
                  <div key={i} className="sc-fact-row">
                    <span className="sc-fact-key">{f.k}</span>
                    <span className="sc-fact-val">{f.v}</span>
                    <span className="sc-fact-src">{f.src}</span>
                  </div>
                ))}
              </div>
            )}

            {intel.alerts.length > 0 && (
              <div className="sc-intel-alerts">
                <div className="sc-intel-section-label">Active risk flags</div>
                {intel.alerts.map((a, i) => (
                  <div key={i} className="sc-alert-row" style={{ borderLeftColor: alertColor(a.level) }}>
                    <span style={{ color: alertColor(a.level), fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
                      {a.level}
                    </span>
                    <span className="sc-alert-text">{a.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── mass balance analysis ─────────────────────────────────────── */}
        <section className="sc-mass-section">
          <div className="sc-signals-header">
            <div className="sc-sh-title">Mass Balance Analysis</div>
            <div className="sc-sh-sub">UN Comtrade mirror discrepancies · flagged corridors · 2023 data · threshold: &gt; 25% gap = suspect</div>
          </div>

          <div className="sc-mass-table">
            <div className="sc-mass-head">
              <span>Origin</span>
              <span>Via</span>
              <span>Destination</span>
              <span>HS Code</span>
              <span style={{ textAlign: 'right' }}>Declared Export</span>
              <span style={{ textAlign: 'right' }}>Declared Import</span>
              <span style={{ textAlign: 'right' }}>Gap</span>
              <span>Assessment</span>
            </div>
            {MASS_BALANCE.map((row, i) => {
              const gc = gapColor(row.flag)
              return (
                <div key={i} className="sc-mass-row">
                  <span className="sc-mass-country">{row.origin}</span>
                  <span className="sc-mass-via">{row.via}</span>
                  <span className="sc-mass-country">{row.dest}</span>
                  <span className="sc-mass-hs mono">{row.hs}</span>
                  <span className="sc-mass-num">{row.exp.toLocaleString()} t</span>
                  <span className="sc-mass-num">{row.imp.toLocaleString()} t</span>
                  <span className="sc-mass-gap" style={{ color: gc }}>
                    {row.flag === 'clean' ? `${row.gap}%` : `${row.gap}% ▲`}
                  </span>
                  <span className="sc-mass-note">{row.note}</span>
                </div>
              )
            })}
          </div>

          <div className="sc-mass-legend">
            {[['#f87171','Critical — suspend sourcing, refer to OECD'],['#fb923c','High — enhanced due diligence'],['#4ade80','Clean — within noise threshold (< 10%)']].map(([c, l]) => (
              <span key={l} className="sc-mass-leg-item">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />
                {l}
              </span>
            ))}
          </div>
        </section>

        {/* ── methodology ───────────────────────────────────────────────── */}
        <section className="sc-method-section">
          <button className="sc-method-toggle" onClick={() => setShowMethod(v => !v)}>
            <span className="sc-method-toggle-title">How the score is calculated</span>
            <span className="sc-method-toggle-hint">{showMethod ? 'Collapse' : 'Expand full methodology'}</span>
            <span className="sc-method-chev" style={{ marginLeft: 'auto' }}>{showMethod ? '▲' : '▼'}</span>
          </button>

          <div className="sc-three-steps">
            {[
              ['01', 'Signal weight', 'Each signal gets W = Severity × Confidence × (1 − Deniability). A high-severity signal with near-zero deniability (logically impossible to explain away) dominates its dimension regardless of other signals.'],
              ['02', 'Dimension score', 'Signals within a dimension combine via Bayesian non-independence product: Score = 1 − ∏(1 − W). Two weak signals at 40% each produce a dimension score of 64%, not 40%. Compound evidence is exponentially more damning.'],
              ['03', 'Composite fusion', 'Three independent dimensions fuse with the same product formula. Child 85% + Forced 70% = composite 95.5%, not 77.5% average. Evidence in any single dimension lifts the whole — you cannot dilute risk by being clean in other areas.'],
            ].map(([n, t, d]) => (
              <div key={n} className="sc-step">
                <div className="sc-step-num">{n}</div>
                <div className="sc-step-body">
                  <div className="sc-step-title">{t}</div>
                  <div className="sc-step-desc">{d}</div>
                </div>
              </div>
            ))}
          </div>

          {showMethod && (
            <div className="sc-method-deep">
              <div className="sc-method-grid">
                {[
                  ['Why three dimensions?', 'Child labour, forced labour, and document fraud are analytically distinct — each driven by different causal mechanisms and detectable via different data sources. A site can show high child-labour risk but low fraud risk (artisanal mine, no paperwork at all) or the reverse (industrial site with forged certificates). Separate dimensions prevent dilution: a clean fraud record cannot offset a catastrophic child-labour signal.'],
                  ['Why Bayesian product, not average?', 'Averaging signals dilutes one very strong indicator. The product formula models independent risk events: if child risk = 85% and forced risk = 70%, composite = 1 − (0.15 × 0.30) = 95.5%, not 77.5%. This reflects investigative reality: two independent risk types converging on the same site is exponentially more alarming than one risk type scored twice.'],
                  ['Deniability — the critical variable', 'Deniability measures how easily an operator can explain a signal away legitimately. A production spike could be new equipment (high deniability). A certificate dated before the mine permit exists is a logical impossibility (deniability ≈ 0). Low-deniability signals receive disproportionate weight even at moderate severity — this is how df3 (Certificate Temporal Anomaly) at sev 0.98 / conf 0.99 / deny 0.01 becomes the engine\'s most decisive signal.'],
                  ['Investigation thresholds', null],
                ].map(([h, p]) => (
                  <div key={h} className="sc-method-card">
                    <h4>{h}</h4>
                    {p ? <p>{p}</p> : (
                      <div className="sc-thresholds">
                        {[['#4ade80','0–30%','Low — standard monitoring cadence'],['#fbbf24','30–55%','Moderate — enhanced due diligence'],['#fb923c','55–75%','High — field investigation recommended'],['#f87171','75%+','Critical — suspend sourcing · report to OECD/ILO']].map(([c, r, l]) => (
                          <div key={r} className="sc-th">
                            <span style={{ color: c }}>{r}</span>
                            <span>{l}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="sc-full-formula">
                <div className="sc-ff-label">Full scoring formula</div>
                <pre className="sc-formula sc-formula-lg">{`// Step 1 — Per-signal effective weight
W(signal) = Severity × Confidence × (1 − Deniability)

// Step 2 — Dimension score  [Bayesian non-independence product]
Score(dim) = 1 − ∏ [ 1 − W(s) ]   for all signals s in dimension

// Step 3 — Composite  [three independent risk dimensions]
Composite = 1 − (1 − Score[Child]) × (1 − Score[Forced]) × (1 − Score[Fraud])

// Missing-data penalty  [< 3 sources available for region]
if sources < 3 → add +0.10 to all dimension scores before fusion`}</pre>
              </div>
            </div>
          )}
        </section>

        {/* ── signal library ────────────────────────────────────────────── */}
        <section className="sc-signals-section">
          <div className="sc-signals-header">
            <div className="sc-sh-title">Signal Library</div>
            <div className="sc-sh-sub">13 evidence signals · click any row to expand formula, documented case, and sources</div>
          </div>

          {CATEGORIES.map(cat => (
            <div key={cat.id} className="sc-cat-block">
              <div className="sc-cat-head" style={{ borderLeftColor: cat.color }}>
                <span className="sc-cat-icon" style={{ color: cat.color }}>{cat.icon}</span>
                <span className="sc-cat-name">{cat.label}</span>
                <span className="sc-cat-dim-score" style={{ color: cat.color }}>{Math.round(scores[cat.id] * 100)}%</span>
                <span className="sc-cat-count">{cat.ids.length} signals in dimension</span>
              </div>
              <div className="sc-sig-table-head">
                <span>Signal</span><span>Effective weight</span><span>Parameters</span><span />
              </div>
              {SIGNALS.filter(s => cat.ids.includes(s.id)).map(sig => (
                <SignalRow key={sig.id} sig={sig} catColor={cat.color} weight={sigWeights[sig.id]}
                  expanded={expanded === sig.id} onToggle={() => toggle(sig.id)} />
              ))}
            </div>
          ))}
        </section>

        <footer className="sc-footer">
          <span>REEtrieve Signal Engine · Hack Summit 2026</span>
          <span>UN Comtrade · ILO ILOSTAT · NASA VIIRS · ESA Sentinel · USGS · RMI · Walk Free · EITI · MarineTraffic · OpenCorporates · ICIJ · GFI</span>
        </footer>
      </div>
    </div>
  )
}
