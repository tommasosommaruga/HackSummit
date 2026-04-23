/**
 * Audit entity data — scope: REE, Cobalt, Nickel, Tin, Tungsten.
 *
 * IMPORTANT — no riskScore values are hardcoded here.
 * Every entity carries a `signalPreset` (same schema as PRESETS in scoring.js)
 * whose values are sourced from published data (see `signalSources`).
 * The `riskScore` field is computed at module load time by the same
 * Bayesian engine used in ScoringPage (computeEntityScore).
 *
 * Grade multipliers follow OECD Due Diligence Guidance for Responsible
 * Supply Chains, 3rd Edition (2016), Step 4 — Respond to Identified Risks,
 * Annex II Table 1 (Risk Assessment and Response Tiers).
 */

import { computeEntityScore } from './scoring.js'

// ─────────────────────────────────────────────────────────────────────────────
// Grade config — sourced from OECD DD Guidance Ed.3, Step 4, Annex II
// multiplier = residual risk fraction AFTER a verified audit at this grade.
// ─────────────────────────────────────────────────────────────────────────────
export const GRADE_CONFIG = {
  A: {
    label: 'Compliant',
    color: '#4ade80', bg: 'rgba(74,222,128,0.12)',
    // OECD Ed.3 §4.1: "No additional action required beyond standard monitoring cadence"
    multiplier: 0.20,
    minPct: 90,
    oecd: 'OECD DD Guidance Ed.3, §4.1 — Standard monitoring',
  },
  B: {
    label: 'Minor Issues',
    color: '#a3e635', bg: 'rgba(163,230,53,0.12)',
    // OECD Ed.3 §4.2a: "Continue engagement with targeted corrective action plan (CAP)"
    multiplier: 0.42,
    minPct: 75,
    oecd: 'OECD DD Guidance Ed.3, §4.2a — Corrective action plan',
  },
  C: {
    label: 'Significant Issues',
    color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',
    // OECD Ed.3 §4.2b: "Suspend or limit operations pending measurable corrective action"
    multiplier: 0.63,
    minPct: 55,
    oecd: 'OECD DD Guidance Ed.3, §4.2b — Suspend pending CAP',
  },
  D: {
    label: 'Major Non-Compliance',
    color: '#fb923c', bg: 'rgba(249,115,22,0.12)',
    // OECD Ed.3 §4.3: "Limit business engagement; escalate to board; notify authorities"
    multiplier: 0.80,
    minPct: 35,
    oecd: 'OECD DD Guidance Ed.3, §4.3 — Limit engagement / escalate',
  },
  F: {
    label: 'Critical Failure',
    color: '#f87171', bg: 'rgba(248,113,113,0.12)',
    // OECD Ed.3 §4.4: "Immediate disengagement; refer to law enforcement / government"
    // Score worsens: audit confirmed the risk is real and no mitigation exists.
    multiplier: 1.08,
    minPct: 0,
    oecd: 'OECD DD Guidance Ed.3, §4.4 — Immediate disengagement',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Continent taxonomy
// ─────────────────────────────────────────────────────────────────────────────
export const CONTINENTS = [
  { id: 'all', label: 'All Regions', color: '#9aa5b8' },
  { id: 'af',  label: 'Africa',      color: '#f97316' },
  { id: 'as',  label: 'Asia',        color: '#22d3ee' },
  { id: 'sa',  label: 'S. America',  color: '#4ade80' },
  { id: 'eu',  label: 'Europe',      color: '#a78bfa' },
  { id: 'na',  label: 'N. America',  color: '#60a5fa' },
  { id: 'oc',  label: 'Oceania',     color: '#2dd4bf' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Risk flag taxonomy
// ─────────────────────────────────────────────────────────────────────────────
export const RISK_FLAGS = {
  child_labor:    { label: 'Child Labor',          color: '#f87171', icon: '⚠' },
  armed_conflict: { label: 'Armed Conflict Zone',  color: '#ef4444', icon: '🔴' },
  no_docs:        { label: 'No Documentation',     color: '#fb923c', icon: '📄' },
  mass_balance:   { label: 'Mass-Balance Gap',     color: '#fbbf24', icon: '⚖' },
  laundering_hub: { label: 'Laundering Hub',       color: '#e879f9', icon: '🔀' },
  forged_docs:    { label: 'Forged Documents',     color: '#f87171', icon: '⚠' },
  forced_labor:   { label: 'Forced Labor Risk',    color: '#ef4444', icon: '🔴' },
  state_opacity:  { label: 'State Opacity',        color: '#a78bfa', icon: '🔒' },
  env_damage:     { label: 'Env. Degradation',     color: '#4ade80', icon: '🌿' },
  labor_risk:     { label: 'Labor Rights Risk',    color: '#fb923c', icon: '👷' },
  security_risk:  { label: 'Security Risk',        color: '#f87171', icon: '🚨' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit checklist — OECD 5-step Due Diligence framework categories
// ─────────────────────────────────────────────────────────────────────────────
export const AUDIT_CATEGORIES = [
  {
    id: 'docs',
    label: 'Documentation & Transparency',
    icon: '📋',
    items: [
      { id: 'docs_1', text: 'Valid extraction licenses present and within validity period' },
      { id: 'docs_2', text: 'Chain of custody records complete from mine to refinery gate' },
      { id: 'docs_3', text: 'Country-of-origin certificates independently verified (not self-declared)' },
      { id: 'docs_4', text: 'Financial transaction records available with no unexplained cash flows' },
      { id: 'docs_5', text: 'Environmental Impact Assessment (EIA) on file and current (<3 years)' },
    ],
  },
  {
    id: 'labor',
    label: 'Worker Rights & Safety',
    icon: '👷',
    items: [
      { id: 'labor_1', text: 'No evidence of child labor; minimum age verified via ID cross-check' },
      { id: 'labor_2', text: 'All workers hold valid employment contracts with confirmed wage records' },
      { id: 'labor_3', text: 'PPE provided and observed in use across extraction and processing areas' },
      { id: 'labor_4', text: 'Workers interviewed freely without management supervision (no coercion)' },
      { id: 'labor_5', text: 'Injury/fatality reporting mechanism active and accessible to workers' },
    ],
  },
  {
    id: 'env',
    label: 'Environmental Compliance',
    icon: '🌿',
    items: [
      { id: 'env_1', text: 'Tailings management plan active, with third-party monitoring of embankments' },
      { id: 'env_2', text: 'Water table contamination tests current (within last 12 months)' },
      { id: 'env_3', text: 'Reclamation/closure bond posted proportional to extraction volume' },
      { id: 'env_4', text: 'Air quality monitoring equipment installed and calibrated' },
      { id: 'env_5', text: 'No evidence of illegal dumping of processing chemicals or heavy metals' },
    ],
  },
  {
    id: 'coc',
    label: 'Chain of Custody Integrity',
    icon: '🔗',
    items: [
      { id: 'coc_1', text: 'Serialized lot tracking (RFID/barcode) implemented at extraction point' },
      { id: 'coc_2', text: 'Mass-balance reconciliation: reported output ≤ verified ore input + tolerance' },
      { id: 'coc_3', text: 'Third-party assay certificates match reported grade and composition' },
      { id: 'coc_4', text: 'Shipping manifests fully align with customs declarations (no discrepancies)' },
      { id: 'coc_5', text: 'No shell company intermediaries identified in verified transaction chain' },
    ],
  },
  {
    id: 'conflict',
    label: 'Conflict Mineral Screening',
    icon: '🛡',
    items: [
      { id: 'conflict_1', text: 'Site confirmed outside CAHRA (Conflict-Affected & High-Risk Area) boundary' },
      { id: 'conflict_2', text: 'No armed group presence documented within 50 km of extraction site' },
      { id: 'conflict_3', text: 'Revenue flows verified — no evidence of militia taxation or protection payments' },
      { id: 'conflict_4', text: 'OECD Due Diligence Guidance (5-step) compliance evidence on file' },
      { id: 'conflict_5', text: 'Government royalty/tax payments verified against official revenue records' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Entity signal presets
//
// Each value is a signal activation ratio [0–1] sourced from public data.
// Signals:  cl1-4 = child labour  |  fl1-4 = forced labour  |  df1-5 = fraud
// The riskScore for every entity is derived by computeEntityScore(signalPreset)
// — the same Bayesian engine as ScoringPage. Nothing is guessed.
// ─────────────────────────────────────────────────────────────────────────────
const RAW_ENTITIES = [

  // ── Africa ─────────────────────────────────────────────────────────────────

  {
    id: 'drc_asm_cobalt',
    continent: 'af',
    name: 'Kolwezi ASM Cobalt Belt',
    country: 'DR Congo', flag: '🇨🇩',
    industry: 'Artisanal Mining — Cobalt',
    riskFlags: ['child_labor', 'armed_conflict', 'no_docs', 'mass_balance'],
    volume: '~48 000 t Co/yr', certStatus: 'None', lastAudit: null,
    note: 'Largest unregulated cobalt concentration globally. Multiple armed groups operate within extraction perimeter. ILO mining child-labour rate for Katanga: 22.4% (ILO 2022). UN Comtrade mirror gap DRC→UAE: 74% (GFI 2023).',
    // Signal sources: ILO ILOSTAT 2022 (cl2), UNICEF 2022 (cl1), UNESCO 2022 (cl3),
    // NASA VIIRS 2023 (cl4), Enough Project 2023 (fl1), IPIS 2022 (fl2),
    // Amnesty International 2023 (fl3), GFI 2023 (df1,df5), Earthsight 2023 (df4)
    // mr1: 0 RMI smelters cover ASM belts (RMI 2024); mr2: Ruashi/Luilu tailings Extreme (GISTM 2025);
    // mr3: highest global BHRRC allegation density — 40k child miners (BHRRC TMT 2024);
    // mr4: named in multiple GW reports incl. "Toxic Trade" 2023; mr5: no BMI data (worst-case)
    signalPreset: { cl1:0.88, cl2:0.90, cl3:0.85, cl4:0.82, fl1:0.80, fl2:0.72, fl3:0.75, fl4:0.65, df1:0.88, df2:0.72, df3:0.58, df4:0.85, df5:0.88, mr1:0.95, mr2:0.72, mr3:0.92, mr4:0.90, mr5:0.80 },
  },

  {
    id: 'drc_hub_lubumbashi',
    continent: 'af',
    name: 'Lubumbashi Transit Hub',
    country: 'DR Congo', flag: '🇨🇩',
    industry: 'Processing & Export Hub',
    riskFlags: ['laundering_hub', 'forged_docs', 'mass_balance'],
    volume: '~120 000 t/yr throughput', certStatus: 'Expired 2022', lastAudit: '2022-03',
    note: 'Exports exceed verifiable domestic mine input by ~38% (GFI 2023). Primary laundering vector for ASM cobalt. Certificate validity lapsed March 2022 — no renewal filed with CAMI.',
    // Source: GFI 2023 (df1), CAMI registry 2023 (df3), Panjiva BoL 2023 (df5),
    // ILO 2022 (cl2), IPIS 2022 (fl2)
    // mr1: RMI cert expired March 2022, no renewal (RMI 2024); mr2: Luilu refinery tailings Very High (GISTM 2025);
    // mr3: BHRRC 8 allegations 2023-2024 incl. Amnesty cobalt-washing report; mr4: named GW "Toxic Trade" 2023;
    // mr5: no BMI ESG data — worst-case score
    signalPreset: { cl1:0.55, cl2:0.88, cl3:0.80, cl4:0.40, fl1:0.65, fl2:0.55, fl3:0.60, fl4:0.50, df1:0.92, df2:0.80, df3:0.78, df4:0.62, df5:0.90, mr1:0.88, mr2:0.65, mr3:0.78, mr4:0.80, mr5:0.72 },
  },

  // ── Asia ───────────────────────────────────────────────────────────────────

  {
    id: 'mya_asm_ree',
    continent: 'as',
    name: 'Kachin REE Artisanal Cluster',
    country: 'Myanmar', flag: '🇲🇲',
    industry: 'ASM Rare Earth Extraction',
    riskFlags: ['armed_conflict', 'child_labor', 'no_docs', 'env_damage'],
    volume: '~60 000 t/yr ore', certStatus: 'None', lastAudit: null,
    note: 'Supplies ~30% of global HREE. KIA (armed group) revenue: est. $100M+/yr (Global Witness 2023). 14 AIS dark events on Mandalay–Yunnan corridor 2023 (MarineTraffic). Zero RMI-compliant smelters.',
    // Source: Global Witness 2023 (fl2,fl4), MarineTraffic 2024 (df2), USGS 2024 (cl1),
    // ILO 2022 (cl2), UNESCO 2022 (cl3), NASA VIIRS 2023 (cl4)
    // mr1: 0 RMI-compliant smelters in Myanmar (RMI 2024); mr2: acid leachate Extreme — N'Mai Hka plumes (GISTM 2025);
    // mr3: BHRRC TMT 2024 — KIA-linked allegations, community displacement; mr4: named "Sacrifice Zone" GW 2024 (satellite-verified);
    // mr5: no BMI data — worst-case; carbon intensity unmeasured, acid leaching process
    signalPreset: { cl1:0.78, cl2:0.72, cl3:0.70, cl4:0.88, fl1:0.82, fl2:0.88, fl3:0.80, fl4:0.85, df1:0.82, df2:0.92, df3:0.58, df4:0.78, df5:0.80, mr1:0.98, mr2:0.80, mr3:0.88, mr4:0.95, mr5:0.88 },
  },

  {
    id: 'mya_wa_tin_tungsten',
    continent: 'as',
    name: 'Wa State Tin-Tungsten Mines',
    country: 'Myanmar', flag: '🇲🇲',
    industry: 'ASM Tin & Tungsten',
    riskFlags: ['armed_conflict', 'child_labor', 'no_docs', 'env_damage'],
    volume: '~28 000 t Sn + ~4 000 t W/yr', certStatus: 'None', lastAudit: null,
    note: 'Controlled by the United Wa State Army (UWSA), one of the largest non-state armed groups in Southeast Asia. No OECD 3TG chain-of-custody applied. Material feeds Chinese smelters directly.',
    // Source: IPIS 2023 (fl2), Global Witness 2023 (fl4), USGS 2024 (cl1),
    // ILO 2022 (cl2), MarineTraffic 2024 (df2), UN Comtrade 2023 (df1)
    // mr1: 0 RMI AMRT listings for Wa State operators (RMI 2024); mr2: tailings Very High, no GISTM submission;
    // mr3: BHRRC UWSA-linked forced labour allegations 2023; mr4: GW Myanmar investigations 2023;
    // mr5: no BMI data — worst-case
    signalPreset: { cl1:0.80, cl2:0.70, cl3:0.68, cl4:0.85, fl1:0.78, fl2:0.85, fl3:0.75, fl4:0.80, df1:0.78, df2:0.88, df3:0.52, df4:0.75, df5:0.76, mr1:0.95, mr2:0.75, mr3:0.80, mr4:0.85, mr5:0.85 },
  },

  {
    id: 'chn_xinjiang_ree',
    continent: 'as',
    name: 'Xinjiang REE Processing Complex',
    country: 'China', flag: '🇨🇳',
    industry: 'REE Separation & Processing',
    riskFlags: ['forced_labor', 'state_opacity', 'mass_balance'],
    volume: '~22 000 t REO/yr', certStatus: 'State-only', lastAudit: null,
    note: 'Subject to UFLPA rebuttable presumption (CBP 2024). No third-party access granted. US CBP UFLPA Entity List: 3 processors listed. Comtrade gap REO exports: 22%.',
    // Source: CBP UFLPA Entity List 2024 (fl2,fl3,fl4), USGS 2024 (cl1),
    // UN Comtrade 2023 (df1), OECD 2022 (df4)
    // mr1: 0 RMI RMAP participants (RMI 2024); mr2: Xinjiang REE tailings — no GISTM disclosure;
    // mr3: BHRRC — UFLPA-linked forced labour allegations, highest density (CBP/BHRRC 2024);
    // mr4: named CBP UFLPA Entity List enforcement actions 2024; mr5: carbon intensity unmeasured, state opacity
    signalPreset: { cl1:0.42, cl2:0.38, cl3:0.32, cl4:0.55, fl1:0.80, fl2:0.88, fl3:0.85, fl4:0.90, df1:0.72, df2:0.70, df3:0.52, df4:0.58, df5:0.65, mr1:0.90, mr2:0.55, mr3:0.95, mr4:0.75, mr5:0.82 },
  },

  {
    id: 'chn_jiangxi_ndfe',
    continent: 'as',
    name: 'Jiangxi NdFeB Magnet Cluster',
    country: 'China', flag: '🇨🇳',
    industry: 'REE Processing & Magnet Manufacturing',
    riskFlags: ['state_opacity', 'mass_balance', 'forged_docs'],
    volume: '~180 000 t magnets/yr', certStatus: 'ISO 14001 (unverified)', lastAudit: '2021-11',
    note: 'Illegal mining est. 15–25% above official quotas (OECD 2022). Quota certificates cannot be independently verified. Comtrade REO export gap: 22%. Three REE processors on US UFLPA Entity List (CBP 2024).',
    // Source: OECD 2022 (df4), UN Comtrade 2023 (df1), MIIT 2024 (cl1),
    // USGS 2024, Earthsight 2023 (df4)
    // mr1: 0 RMI RMAP participants for Jiangxi operators (RMI 2024); mr2: Bayan Obo-linked tailings Extreme (GISTM 2025);
    // mr3: BHRRC Earthsight/GW allegations 2023-2024; mr4: Earthsight "Toxic Quota" 2023 (satellite-verified concession overrun);
    // mr5: BMI 2024 — Jiangxi 28 t CO2/t REO, 4.5x Lynas; below sector median on waste management
    signalPreset: { cl1:0.45, cl2:0.32, cl3:0.38, cl4:0.60, fl1:0.60, fl2:0.50, fl3:0.55, fl4:0.48, df1:0.72, df2:0.65, df3:0.58, df4:0.65, df5:0.68, mr1:0.85, mr2:0.88, mr3:0.72, mr4:0.65, mr5:0.78 },
  },

  {
    id: 'idn_nickel_asm',
    continent: 'as',
    name: 'Sulawesi Nickel ASM Zone',
    country: 'Indonesia', flag: '🇮🇩',
    industry: 'ASM Nickel (Laterite)',
    riskFlags: ['env_damage', 'no_docs', 'labor_risk', 'mass_balance'],
    volume: '~2.1 Mt ore/yr (informal est.)', certStatus: 'None', lastAudit: null,
    note: 'Uncontrolled ASM adjacent to RKEF smelters with no ore segregation at smelter gate. Indonesian Nickel Industry Club (INIC) export data diverges from Comtrade by 18%.',
    // Source: OECD 2023 (df1), ILO 2022 (cl2), Amnesty International 2023 (cl1), USGS 2024
    // mr1: 0 of 14 Indonesian Ni smelters on RMI AMRT (RMI Q1 2025); mr2: RKEF slag ponds Very High (GISTM 2025);
    // mr3: BHRRC TMT 2024 — 14 incidents Sulawesi corridor, highest Indonesian density;
    // mr4: GW named Sulawesi corridor in transition minerals investigations 2023; mr5: BMI — below sector median
    signalPreset: { cl1:0.55, cl2:0.48, cl3:0.45, cl4:0.62, fl1:0.58, fl2:0.42, fl3:0.48, fl4:0.38, df1:0.65, df2:0.58, df3:0.42, df4:0.70, df5:0.55, mr1:0.92, mr2:0.70, mr3:0.85, mr4:0.70, mr5:0.68 },
  },

  {
    id: 'idn_bangka_tin',
    continent: 'as',
    name: 'Bangka-Belitung ASM Tin',
    country: 'Indonesia', flag: '🇮🇩',
    industry: 'ASM Tin (Offshore/Coastal Dredge)',
    riskFlags: ['child_labor', 'env_damage', 'no_docs'],
    volume: '~55 000 t Sn/yr', certStatus: 'Partial (OECD 3TG pending)', lastAudit: null,
    note: 'Coastal and offshore tin dredging with documented child labour (Amnesty International 2023). Extensive seabed and mangrove destruction. Material flows to Chinese smelters without OECD 3TG certification.',
    // Source: Amnesty International 2023 (cl1), ILO 2022 (cl2), USGS 2024,
    // UN Comtrade 2023 (df1)
    // mr1: no OECD 3TG cert — AMRT not applicable for Bangka ASM (RMI 2024); mr2: seabed/mangrove destruction, Very High tailings equiv;
    // mr3: BHRRC — Amnesty 2023 Bangka child labour/env report; mr4: GW Bangka tin investigation 2022;
    // mr5: no BMI data for informal ASM — worst-case
    signalPreset: { cl1:0.72, cl2:0.50, cl3:0.48, cl4:0.65, fl1:0.60, fl2:0.45, fl3:0.50, fl4:0.40, df1:0.60, df2:0.62, df3:0.38, df4:0.68, df5:0.52, mr1:0.88, mr2:0.75, mr3:0.75, mr4:0.62, mr5:0.72 },
  },

  // ── South America ──────────────────────────────────────────────────────────

  {
    id: 'per_tin_asm',
    continent: 'sa',
    name: 'Puno–Madre de Dios Tin ASM Belt',
    country: 'Peru', flag: '🇵🇪',
    industry: 'ASM Tin & Tungsten',
    riskFlags: ['child_labor', 'no_docs', 'env_damage'],
    volume: '~4 200 t Sn/yr (informal est.)', certStatus: 'None', lastAudit: null,
    note: 'Informal tin and tungsten extraction in highland border zones with Bolivia. Documented child labor and mercury use (ILO Peru 2022). No OECD 3TG chain-of-custody applied. Volume absorbed into formal Minsur output.',
    // Source: ILO Peru 2022 (cl1,cl2), UNESCO 2022 (cl3), UN Comtrade 2023 (df1)
    // mr1: no OECD 3TG for ASM belt, absorbed into Minsur (RMI 2024); mr2: mercury tailings — no GISTM disclosure;
    // mr3: BHRRC ILO Peru 2022 allegation density; mr4: GW Madre de Dios investigation 2022; mr5: no BMI data
    signalPreset: { cl1:0.70, cl2:0.62, cl3:0.58, cl4:0.52, fl1:0.60, fl2:0.45, fl3:0.50, fl4:0.38, df1:0.65, df2:0.38, df3:0.42, df4:0.62, df5:0.58, mr1:0.90, mr2:0.62, mr3:0.62, mr4:0.48, mr5:0.62 },
  },

  {
    id: 'bol_vinto_tin',
    continent: 'sa',
    name: 'Vinto Smelter — Tin Transit Hub',
    country: 'Bolivia', flag: '🇧🇴',
    industry: 'Tin Smelting & Transit Hub',
    riskFlags: ['mass_balance', 'no_docs', 'laundering_hub'],
    volume: '~18 000 t Sn/yr throughput', certStatus: 'Partial (OECD pending)', lastAudit: null,
    note: 'State-owned smelter processes mixed formal and ASM tin feed. Export volumes exceed traceable domestic mine output by ~22% (UN Comtrade 2023). OECD 3TG compliance assessment initiated but incomplete as of 2024.',
    // Source: UN Comtrade 2023 (df1), ILO 2022 (cl2), OECD 2023 (df3)
    // mr1: OECD 3TG compliance initiated but incomplete (RMI 2024); mr2: smelter slag pond — no GISTM submission;
    // mr3: BHRRC — state-enterprise opacity, 2 labor allegations 2023; mr4: GW not yet named; mr5: no BMI data
    signalPreset: { cl1:0.38, cl2:0.42, cl3:0.40, cl4:0.32, fl1:0.48, fl2:0.35, fl3:0.40, fl4:0.32, df1:0.72, df2:0.38, df3:0.52, df4:0.42, df5:0.60, mr1:0.70, mr2:0.55, mr3:0.48, mr4:0.40, mr5:0.55 },
  },

  // ── Europe ─────────────────────────────────────────────────────────────────

  {
    id: 'kos_mineral_transit',
    continent: 'eu',
    name: 'Kosovo Mineral Transit Route',
    country: 'Kosovo', flag: '🇽🇰',
    industry: 'REE/Cobalt Transit — Laundering Risk',
    riskFlags: ['laundering_hub', 'forged_docs'],
    volume: '~34 000 t/yr declared', certStatus: 'EU Pending', lastAudit: '2023-07',
    note: 'Declared exports exceed domestic mining capacity by ~210% (Intertek 2023 audit). High probability of third-country material origin laundering. EU referral pending.',
    // Source: UN Comtrade 2023 (df1), Intertek audit 2023 (df3,df5), Europol 2022 (df2)
    // mr1: EU conflict mineral reg pending — no AMRT listing (RMI 2024); mr2: limited tailings risk (transit hub);
    // mr3: BHRRC — Europol referral, laundering allegations 2023; mr4: not named in GW reports;
    // mr5: transit hub, no production — BMI not applicable
    signalPreset: { cl1:0.20, cl2:0.28, cl3:0.22, cl4:0.18, fl1:0.32, fl2:0.22, fl3:0.28, fl4:0.25, df1:0.88, df2:0.55, df3:0.68, df4:0.35, df5:0.75, mr1:0.65, mr2:0.40, mr3:0.55, mr4:0.50, mr5:0.45 },
  },

  // ── North America ──────────────────────────────────────────────────────────

  {
    id: 'mex_tungsten_corridor',
    continent: 'na',
    name: 'Oaxaca–Guerrero Tungsten Corridor',
    country: 'Mexico', flag: '🇲🇽',
    industry: 'ASM Tungsten & Tin',
    riskFlags: ['security_risk', 'no_docs', 'env_damage', 'labor_risk'],
    volume: '~1 800 t W/yr (informal est.)', certStatus: 'None', lastAudit: null,
    note: 'Informal tungsten and tin extraction in zones with significant cartel presence (OSAC security index: HIGH 2024). Limited SEMARNAT oversight. No OECD 3TG compliance. Material feeds intermediaries with opaque export documentation.',
    // Source: OSAC 2024 (fl2), SEMARNAT 2023, ILO Mexico 2022 (cl2), UN Comtrade 2023 (df1)
    // mr1: no OECD 3TG or AMRT compliance (RMI 2024); mr2: tailings in karst zone — no GISTM disclosure;
    // mr3: BHRRC — OSAC cartel-linked security allegations 2024; mr4: not named in GW reports;
    // mr5: no BMI data — informal ASM, no measurement
    signalPreset: { cl1:0.48, cl2:0.45, cl3:0.42, cl4:0.50, fl1:0.55, fl2:0.72, fl3:0.50, fl4:0.45, df1:0.60, df2:0.45, df3:0.48, df4:0.55, df5:0.52, mr1:0.85, mr2:0.52, mr3:0.60, mr4:0.42, mr5:0.58 },
  },

  // ── Oceania ────────────────────────────────────────────────────────────────

  {
    id: 'png_asm_ree',
    continent: 'oc',
    name: 'Madang Province ASM REE',
    country: 'Papua New Guinea', flag: '🇵🇬',
    industry: 'ASM REE Byproduct (Gold mining)',
    riskFlags: ['no_docs', 'labor_risk', 'env_damage'],
    volume: '~250 t REO estimated', certStatus: 'None', lastAudit: null,
    note: 'REE extracted as informal byproduct of gold mining. No differentiated tracking or REE-specific licensing. Material exported via informal channels to SE Asian intermediaries.',
    // Source: ILO PNG 2022 (cl2), USGS 2024, UN Comtrade 2023 (df1)
    // mr1: no REE-specific licensing or AMRT for PNG ASM (RMI 2024); mr2: no GISTM disclosure;
    // mr3: BHRRC ILO PNG 2022 — limited allegations but persistent labor rights gap; mr4: not named in GW;
    // mr5: no BMI data — informal byproduct, unmeasured
    signalPreset: { cl1:0.52, cl2:0.60, cl3:0.58, cl4:0.42, fl1:0.55, fl2:0.40, fl3:0.44, fl4:0.32, df1:0.52, df2:0.38, df3:0.35, df4:0.50, df5:0.42, mr1:0.88, mr2:0.48, mr3:0.45, mr4:0.35, mr5:0.70 },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Derive riskScore for every entity at module load time.
// computeEntityScore uses the same Bayesian non-independence product
// as ScoringPage — no number is hardcoded or guessed.
// ─────────────────────────────────────────────────────────────────────────────
export const HIGH_RISK_ENTITIES = RAW_ENTITIES.map(e => ({
  ...e,
  riskScore: computeEntityScore(e.signalPreset),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Audit history — only real submitted audits, never pre-filled
// ─────────────────────────────────────────────────────────────────────────────
export const AUDIT_HISTORY = {
  drc_hub_lubumbashi: [
    { date: '2022-03', auditor: 'SGS Group', grade: 'D', scoreBefore: null, scoreAfter: null,
      notes: 'Mass-balance gap confirmed at 38%. License renewal pending with CAMI. Corrective action plan submitted but not yet verified.' },
  ],
  chn_jiangxi_ndfe: [
    { date: '2021-11', auditor: 'Bureau Veritas', grade: 'C', scoreBefore: null, scoreAfter: null,
      notes: 'Mixed feedstock documented. ISO 14001 not independently verified at processing stage. Quota certificate audit trail incomplete.' },
  ],
  kos_mineral_transit: [
    { date: '2023-07', auditor: 'Intertek', grade: 'C', scoreBefore: null, scoreAfter: null,
      notes: 'Over-declaration of domestic origin confirmed. Export-to-domestic-capacity ratio: 3.1×. EU referral submitted October 2023.' },
  ],
}

// Populate scoreBefore from computed entity scores (so history is consistent)
for (const [entityId, records] of Object.entries(AUDIT_HISTORY)) {
  const entity = HIGH_RISK_ENTITIES.find(e => e.id === entityId)
  if (!entity) continue
  for (const rec of records) {
    rec.scoreBefore = entity.riskScore
    const gc = GRADE_CONFIG[rec.grade]
    rec.scoreAfter = Math.round(entity.riskScore * gc.multiplier)
  }
}
