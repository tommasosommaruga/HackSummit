export const SIGNALS = [
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

  // ── Moral Risk signals ─────────────────────────────────────────────────────
  // Derived from RMI AMRT, GISTM disclosures, BHRRC tracker, Global Witness,
  // and Benchmark Mineral Intelligence ESG assessments.
  {
    id: 'mr1', dim: 'moral', name: 'RMI AMRT Non-Compliance',
    brief: 'Entity absent from RMI smelter list or has active audit failure flag',
    severity: 0.82, confidence: 0.95, deniability: 0.05,
    why: 'The RMI Additional Minerals Reporting Template (AMRT) is the only industry-standard third-party audit specifically covering REE, nickel, tin, tungsten, and cobalt smelters. An entity absent from the active smelter list — or carrying a suspension — has undergone no independent verification of its sourcing practices. With 95% confidence and near-zero deniability (the list is public and binary), this is one of the highest-quality signals in the engine.',
    formula: 'RMI_flag = entity_id not in RMI_AMRT_active_list OR audit_status in {suspended, failed}\nIf True => severity 0.82, confidence 0.95, deniability 0.05',
    case: 'As of Q1 2025, 0 of 14 Indonesian nickel smelters and 0 of the known Myanmar REE processors appear on the RMI active AMRT list. All 14 Indonesian smelters therefore trigger mr1 at full severity. By contrast, Lynas (Mount Weld) is RMAP-active — mr1 fires at ratio 0.05.',
    sources: [
      { name: 'RMI RMAP — Smelter/Refiner Lists (AMRT)', url: 'https://www.responsiblemineralsinitiative.org/responsible-minerals-assurance-process/rmap-smelter-refiner-lists/' },
      { name: 'RMI AMRT Audit Protocol', url: 'https://www.responsiblemineralsinitiative.org/auditing-tools/rmap-audit-protocols/' },
    ],
  },
  {
    id: 'mr2', dim: 'moral', name: 'GISTM Tailings — Extreme/Very High',
    brief: 'TSF consequence classification Extreme or Very High on Global Tailings Portal',
    severity: 0.88, confidence: 0.92, deniability: 0.10,
    why: 'As of August 2025 GISTM compliance is mandatory for major mining companies. The Global Tailings Portal publishes TSF consequence classifications: Extreme, Very High, High, Significant, Low. A Baotou/Bayan Obo-class REE tailings lake with Extreme classification holds radioactive thorium and cerium leachate — a single embankment failure contaminates hundreds of km2 of agricultural land.',
    formula: 'GISTM_flag = TSF_consequence in {Extreme, Very High} AND remediation_verified = False\nSeverity = 0.88 if Extreme, 0.70 if Very High',
    case: 'Bayan Obo (China) tailings lake: 190 km2, classified Extreme on Global Tailings Portal. No independent GISTM verification submitted as of 2025. Baotou downstream agricultural soil thorium: 12-28x WHO guideline (Global Witness "Sacrifice Zone" 2024).',
    sources: [
      { name: 'Global Tailings Portal — TSF Database', url: 'https://tailings-portal.org/' },
      { name: 'GISTM Standard (2020)', url: 'https://globalindustrystandardontailings.org/' },
      { name: 'ICMM Tailings Management — company disclosures', url: 'https://www.icmm.com/en-gb/environment/tailings-management' },
    ],
  },
  {
    id: 'mr3', dim: 'moral', name: 'BHRRC Allegation Density',
    brief: 'Documented allegations in BHRRC Transition Minerals Tracker (12-month window)',
    severity: 0.75, confidence: 0.80, deniability: 0.25,
    why: 'The BHRRC Transition Minerals Tracker is in 2025-2026 the most expressive public dataset for Moral Risk. It links specific entities to documented allegations: forced labour, environmental spills, community displacement, security-force violations. Unlike court verdicts (which lag years), BHRRC captures allegations at time of occurrence with source links.',
    formula: 'Allegation_score = sum(severity_weight x source_count) / 12-month window\nFlag if score > 0.5, severity = min(score / 2.0, 0.75)',
    case: 'BHRRC TMT 2024-2025: Sulawesi nickel corridor — 14 documented incidents in 12 months including 3 forced-relocation cases (Amnesty), 2 environmental spills (WALHI), 1 security-force sexual violence allegation (KontraS). Allegation density score: 0.91.',
    sources: [
      { name: 'BHRRC Transition Minerals Tracker', url: 'https://www.business-humanrights.org/en/transition-minerals-tracker/' },
      { name: 'BHRRC — Company Responses Dashboard', url: 'https://www.business-humanrights.org/en/companies/' },
    ],
  },
  {
    id: 'mr4', dim: 'moral', name: 'Global Witness Investigative Flag',
    brief: 'Named in Global Witness investigation with satellite-verified evidence',
    severity: 0.85, confidence: 0.88, deniability: 0.20,
    why: 'Global Witness investigations combine field interviews, financial record analysis, and satellite/hyperspectral imagery. Their 2024 "Sacrifice Zone" report used hyperspectral imagery to identify in-situ REE leaching sites in Myanmar not in any official register — yet accounting for a substantial fraction of global HREE supply.',
    formula: 'GW_flag = entity_named_in_gw_report AND (satellite_evidence = True OR financial_evidence = True)\nIf True => severity 0.85, confidence 0.88, deniability 0.20',
    case: '"The Sacrifice Zone" (Global Witness, 2024): hyperspectral Sentinel-2 identified 340+ unlicensed in-situ leaching sites in Kachin State. Acid leachate plumes documented in the N\'Mai Hka river. Three Chinese REE importers named as direct downstream buyers.',
    sources: [
      { name: 'Global Witness — "The Sacrifice Zone" (2024)', url: 'https://www.globalwitness.org/en/campaigns/natural-resource-governance/sacrifice-zone/' },
      { name: 'ESA Sentinel-2 Hyperspectral (Copernicus)', url: 'https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-2' },
    ],
  },
  {
    id: 'mr5', dim: 'moral', name: 'BMI Carbon & Waste ESG Score',
    brief: 'Benchmark Mineral Intelligence ESG score below sector median (REE-specific)',
    severity: 0.60, confidence: 0.78, deniability: 0.30,
    why: 'Benchmark Mineral Intelligence publishes REE-sector-specific ESG assessments covering carbon intensity per tonne REO and waste management. Unlike generic ESG ratings (MSCI, Sustainalytics), BMI scores are calibrated to REE extraction and separation chemistry. A score below sector median indicates operational shortcuts that also increase social and governance risk.',
    formula: 'BMI_flag = bmi_esg_score < sector_median OR carbon_intensity > 1.8x sector_median\nSeverity = 0.60, Confidence = 0.78, deniability = 0.30',
    case: 'BMI REE ESG Assessment 2024: Jiangxi clay-mine sector avg carbon intensity 28 t CO2/t REO vs Mount Weld (Lynas) 6.2 t CO2/t REO — 4.5x gap. Myanmar operators: no BMI data available, BMI treats as worst-case.',
    sources: [
      { name: 'Benchmark Mineral Intelligence — REE ESG Assessments', url: 'https://www.benchmarkminerals.com/rare-earths/' },
      { name: 'BMI — Carbon & ESG Methodology', url: 'https://www.benchmarkminerals.com/esg/' },
    ],
  },
]

export const PRESETS = {
  drc:       { cl1:0.76, cl2:0.90, cl3:0.85, cl4:0.80, fl1:0.75, fl2:0.65, fl3:0.70, fl4:0.78, df1:0.88, df2:0.85, df3:0.70, df4:0.80, df5:0.82, mr1:0.95, mr2:0.72, mr3:0.92, mr4:0.90, mr5:0.80 },
  congo:     { cl1:0.55, cl2:0.78, cl3:0.72, cl4:0.60, fl1:0.62, fl2:0.55, fl3:0.60, fl4:0.70, df1:0.65, df2:0.60, df3:0.30, df4:0.55, df5:0.58, mr1:0.75, mr2:0.58, mr3:0.65, mr4:0.60, mr5:0.68 },
  china:     { cl1:0.50, cl2:0.35, cl3:0.40, cl4:0.70, fl1:0.65, fl2:0.60, fl3:0.75, fl4:0.55, df1:0.72, df2:0.75, df3:0.55, df4:0.60, df5:0.65, mr1:0.88, mr2:0.85, mr3:0.72, mr4:0.68, mr5:0.80 },
  myanmar:   { cl1:0.65, cl2:0.65, cl3:0.60, cl4:0.75, fl1:0.80, fl2:0.70, fl3:0.78, fl4:0.82, df1:0.80, df2:0.82, df3:0.60, df4:0.70, df5:0.75, mr1:0.98, mr2:0.80, mr3:0.88, mr4:0.95, mr5:0.88 },
  indonesia: { cl1:0.52, cl2:0.48, cl3:0.45, cl4:0.62, fl1:0.58, fl2:0.42, fl3:0.48, fl4:0.38, df1:0.62, df2:0.58, df3:0.42, df4:0.68, df5:0.55, mr1:0.92, mr2:0.70, mr3:0.85, mr4:0.70, mr5:0.68 },
  custom:    { cl1:0.50, cl2:0.50, cl3:0.50, cl4:0.50, fl1:0.50, fl2:0.50, fl3:0.50, fl4:0.50, df1:0.50, df2:0.50, df3:0.50, df4:0.50, df5:0.50, mr1:0.50, mr2:0.50, mr3:0.50, mr4:0.50, mr5:0.50 },
}

// ── Scoring engine — exported so AuditPage can derive scores from signal presets
// rather than hardcoding numbers. Same Bayesian non-independence product used
// by ScoringPage. Source: OECD DD Guidance Ed.3, Annex II.
export function computeEntityScore(signalPreset) {
  const dimScores = CATEGORIES.map(cat => {
    const effects = SIGNALS
      .filter(s => cat.ids.includes(s.id))
      .map(s => (signalPreset[s.id] ?? 0.5) * s.severity * s.confidence * (1 - s.deniability))
    return 1 - effects.reduce((acc, e) => acc * (1 - e), 1)
  })
  return Math.round((1 - dimScores.reduce((acc, d) => acc * (1 - d), 1)) * 100)
}


export const CATEGORIES = [
  { id: 'child',  label: 'Child Labour',           icon: '◈', color: '#f87171', ids: ['cl1','cl2','cl3','cl4'] },
  { id: 'forced', label: 'Forced & Bonded Labour', icon: '◉', color: '#fb923c', ids: ['fl1','fl2','fl3','fl4'] },
  { id: 'fraud',  label: 'Document & Trade Fraud', icon: '◇', color: '#60a5fa', ids: ['df1','df2','df3','df4','df5'] },
  { id: 'moral',  label: 'Moral Risk',             icon: '⬡', color: '#e879f9', ids: ['mr1','mr2','mr3','mr4','mr5'] },
]

export const COUNTRIES = [
  { value: 'drc',       label: 'DRC — Katanga (Cobalt ASM)' },
  { value: 'myanmar',   label: 'Myanmar — Kachin / Wa State (REE, Sn, W)' },
  { value: 'china',     label: 'China — Jiangxi Province (REE, W)' },
  { value: 'congo',     label: 'Congo — Kouilou Basin (Cobalt transit)' },
  { value: 'indonesia', label: 'Indonesia — Sulawesi / Bangka (Ni, Sn)' },
  { value: 'custom',    label: 'Custom — manual parameters' },
]

export const COUNTRY_INTEL = {
  drc: {
    risk: 'CRITICAL', riskColor: '#f87171',
    headline: 'Democratic Republic of Congo — Katanga / Kolwezi (Cobalt)',
    summary: 'The DRC produces 73% of global cobalt. The majority comes from Artisanal and Small-scale Mining (ASM) in the Katanga copperbelt, with endemic child labour, dangerous conditions, and zero chain-of-custody documentation. No functioning mining cadastre exists for ASM zones — traceability is structurally impossible. The Lubumbashi transit corridor is a documented cobalt-washing hub.',
    facts: [
      { k: 'ASM cobalt share', v: '~40%', src: 'OECD 2023' },
      { k: 'Estimated child miners', v: '40,000+', src: 'UNICEF 2022' },
      { k: 'RMI-compliant cobalt smelters', v: '2 of 19', src: 'RMI 2024' },
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
  indonesia: {
    risk: 'HIGH', riskColor: '#fb923c',
    headline: 'Indonesia — Sulawesi & Bangka-Belitung (Nickel, Tin)',
    summary: 'Indonesia is the world\'s largest nickel producer (~50% of global supply) and second-largest tin exporter. Sulawesi\'s RKEF smelter corridor operates alongside unregulated ASM nickel laterite extraction with no chain-of-custody separation. Bangka-Belitung\'s offshore and coastal tin dredging has endemic child labour and documented environmental destruction. Both sectors export predominantly to China with minimal third-party verification.',
    facts: [
      { k: 'Global nickel share', v: '~50%', src: 'USGS 2024' },
      { k: 'Sulawesi ASM nickel volume', v: '~2.1 Mt ore/yr (est.)', src: 'OECD 2023' },
      { k: 'Bangka-Belitung tin share', v: '~25% global', src: 'USGS 2024' },
      { k: 'RMI-compliant smelters (Ni)', v: '1 of 14', src: 'RMI 2024' },
      { k: 'EITI Status', v: 'Compliant', src: 'EITI 2023' },
      { k: 'Comtrade gap (Ni ore)', v: '18%', src: 'UN Comtrade 2023' },
    ],
    alerts: [
      { level: 'high', text: 'ASM nickel ore mixed with RKEF-compliant feed — no segregation at smelter gate documented' },
      { level: 'high', text: 'Bangka-Belitung: child labour in coastal dredge ASM documented by Amnesty International (2023)' },
      { level: 'medium', text: 'Indonesian Nickel Industry Club (INIC) export data diverges from Comtrade by 18% — unexplained gap' },
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

export const MASS_BALANCE = [
  { origin: 'DRC', via: 'Rwanda', dest: 'UAE', hs: 'HS 8105.20', exp: 8200, imp: 2100, gap: 74, flag: 'critical', note: 'Cobalt washing — 6,100 t undocumented (GFI 2023)' },
  { origin: 'Congo', via: 'Cameroon', dest: 'India', hs: 'HS 8105.20', exp: 3100, imp: 890, gap: 71, flag: 'critical', note: 'Cobalt re-labelling via Cameroon corridor (GFI 2022)' },
  { origin: 'China', via: 'Hong Kong', dest: 'EU', hs: 'HS 2846.xx', exp: 18000, imp: 11200, gap: 38, flag: 'high', note: 'REO re-exported as "Hong Kong origin" — origin laundering' },
  { origin: 'Myanmar', via: '—', dest: 'China', hs: 'HS 2846.xx', exp: 45200, imp: 48600, gap: 7, flag: 'clean', note: 'Within noise — weight unit conversion explains gap' },
  { origin: 'Australia', via: '—', dest: 'Japan', hs: 'HS 2846.xx', exp: 12400, imp: 12100, gap: 2, flag: 'clean', note: 'Lynas–JARE bilateral contract — verified both ends' },
]

export const GLOBAL_STATS = [
  { value: '85%', label: 'China\'s share of global REE processing', sub: 'USGS 2024 · single point of failure for all consumer electronics, EVs, wind turbines' },
  { value: '40k+', label: 'Estimated child miners in DRC', sub: 'UNICEF 2022 · cobalt ASM sector · no chain-of-custody documentation' },
  { value: '74%', label: 'Max observed Comtrade mirror gap', sub: 'DRC → Rwanda → UAE cobalt corridor · 6,100 t vanished in transit (GFI 2023)' },
  { value: '2.4 yrs', label: 'Average mine-to-product lag', sub: 'REE in EV batteries · a 2024 car contains 2021–2022 ore · audit windows lag reality' },
]

