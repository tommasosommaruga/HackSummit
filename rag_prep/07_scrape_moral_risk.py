"""
Step 7 — Civil society, human rights, and environmental reports.

This is the most important RAG source for balanced analysis.
Without these, the AI only has corporate self-reporting (SEC Form SD)
and production statistics (USGS) — both biased toward "everything is fine."

Sources targeted:
  - OECD Due Diligence Guidance (mineral supply chains, conflict minerals)
  - ILO child labour and forced labour reports
  - Global Witness Myanmar / DRC investigative reports
  - Amnesty International cobalt / conflict minerals
  - UN Panel of Experts (DRC, Myanmar)
  - SOMO (Centre for Research on Multinational Corporations)
  - Enough Project (Congo conflict minerals)

Strategy:
  - Auto-download where direct PDF URLs are stable (OECD, ILO, UN)
  - Scrape key web pages to text where PDFs are blocked
  - Print clear manual-download instructions for reports that require
    navigation (Global Witness, Amnesty — their CDNs block bots)
"""

import pathlib, time, re, json
import requests
from tqdm import tqdm

OUT_DIR = pathlib.Path(__file__).parent / "data/raw/misc"
OUT_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/pdf,*/*",
}

# ── Direct PDF downloads (stable, open-access URLs) ──────────────────────────

AUTO_PDFS = {

    # OECD — Mineral supply chain due diligence (core regulatory framework)
    "oecd_dd_guidance_minerals_ed3":
        "https://www.oecd.org/content/dam/oecd/en/publications/reports/2016/04/"
        "oecd-due-diligence-guidance-for-responsible-supply-chains-of-minerals-from-"
        "conflict-affected-and-high-risk-areas_g1g65996/9789264252479-en.pdf",

    # ILO — Child labour and forced labour in mining (open access)
    "ilo_forced_labour_definition_2012":
        "https://www.ilo.org/wcmsp5/groups/public/---ed_norm/---declaration/documents/publication/wcms_182004.pdf",

    "ilo_forced_labour_global_estimates_2022":
        "https://www.ilo.org/wcmsp5/groups/public/---ed_norm/---ipec/documents/publication/wcms_854733.pdf",

    "ilo_child_labour_global_estimates_2020":
        "https://data.unicef.org/wp-content/uploads/2022/01/Child-Labour-Report-1_24.pdf",

    # SOMO — Cobalt supply chain research (corrected URL)
    "somo_cobalt_children_mines_2016":
        "https://www.somo.nl/wp-content/uploads/2016/05/No-golden-future-7.pdf",

    # Global Witness — Jade Myanmar (foundational armed-group-extraction link)
    "global_witness_jade_myanmar_2015":
        "https://gw.cdn.ngo/media/documents/Jade_full_report_second_run_lo_res_English.pdf",

    # Amnesty International — DRC cobalt child labour (foundational)
    "amnesty_this_is_what_we_die_for_2016":
        "https://www.amnesty.org/fr/wp-content/uploads/2021/05/AFR6231832016ENGLISH.pdf",

    # IPIS — Field-validated artisanal mining map DRC
    "ipis_mapping_asm_drc_2023":
        "https://tenuresecurity.org/wp-content/uploads/2023/12/IPIS_Mapping-artisanal-mining-sites-eastern-DRC-508.pdf",

    # IPIS — Armed conflict, insecurity and mining eastern DRC
    "ipis_armed_conflict_mining_drc_2023":
        "https://ipisresearch.be/wp-content/uploads/2023/12/202010_IPIS_Armed-conflict-insecurity-and-mining-in-eastern-DRC_Accessible-PDF.pdf",

    # RAID — Environmental/health impact of industrial cobalt mining DRC (2024)
    "raid_beneath_the_green_drc_2024":
        "https://raid-uk.org/wp-content/uploads/2024/03/Report-Beneath-the-Green-DRC-Pollution-March-2024.pdf",

    # World Bank — Cobalt market analysis DRC governance
    "worldbank_cobalt_drc_market":
        "https://documents1.worldbank.org/curated/en/099500001312236438/pdf/P1723770a0f570093092050c1bddd6a29df.pdf",

    # EarthRights International — Kachin rare earths Myanmar 2025
    "earthrights_kachin_ree_2025":
        "https://earthrights.org/wp-content/uploads/2025/05/Rare-Earth-Report-April-2025.pdf",

    # Amnesty International — Indonesia gold/nickel mining human rights 2022
    "amnesty_indonesia_mining_2022":
        "https://www.amnesty.org/en/wp-content/uploads/2022/03/ASA2152572022ENGLISH.pdf",

    # EU — Conflict Minerals Regulation review report 2024
    "eu_conflict_minerals_review_2024":
        "https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:52024DC0415",

    # ARM — Civil society assessment of EU Conflict Minerals Regulation 2023
    "arm_eu_conflict_minerals_assessment_2023":
        "https://www.responsiblemines.org/wp-content/uploads/2023/10/The-EU-conflict-minerals-regulation_High-stakes-disappointing-results.pdf",

    # Cobalt Institute — Market Report 2023 (industry perspective, supply chain data)
    "cobalt_institute_market_report_2023":
        "https://www.cobaltinstitute.org/wp-content/uploads/2025/02/Cobalt-Market-Report-2023.pdf",

    # Cobalt Institute — Market Report 2022
    "cobalt_institute_market_report_2022":
        "https://www.cobaltinstitute.org/wp-content/uploads/2025/02/Cobalt-Market-Report-2022_final.pdf",

    # Institute for Business Ethics — Tracing Cobalt in Fragmented Supply Chains 2022
    "ibe_tracing_cobalt_supply_chains_2022":
        "https://assets.ctfassets.net/y0dk4vkszqeh/1r5ZlwmS51Zy010gCdUzqs/03b6fd20c2d79c68c4407e439fa2991f/Study_Tracing_Cobalt_in_Fragmented_Supply_Chains.pdf",

    # Global Battery Alliance — Battery 2030 sustainability vision
    "gba_battery_2030_sustainability":
        "https://www.globalbattery.org/media/publications/battery-2030-resilient-sustainable-and-circular.pdf",

    # US Department of Labor — Forced Labor in DRC Cobalt Mining
    "usdol_forced_labor_drc_cobalt":
        "https://www.dol.gov/sites/dolgov/files/ILAB/DRC-FL-Cobalt-Report-508.pdf",

    # US State Department — 2023 Burma/Myanmar Human Rights Report
    "state_dept_myanmar_human_rights_2023":
        "https://www.state.gov/wp-content/uploads/2024/02/528267_BURMA-2023-HUMAN-RIGHTS-REPORT.pdf",

    # LME — Responsible Sourcing Handbook
    "lme_responsible_sourcing_handbook":
        "https://www.lme.com/-/media/Files/About/Responsibility/Responsible-sourcing/Guidance-notes-and-webinar/LME-Responsible-Sourcing-Handbook.pdf",

    # Earthworks — Safety First: Safe Tailings Management guidelines
    "earthworks_safety_first_tailings_2022":
        "https://earthworks.org/wp-content/uploads/2022/05/Safety-First-Safe-Tailings-Management-V2.0-final.pdf",

    # MAC — Tailings Management Guide v3.2
    "mac_tailings_guide_2021":
        "https://mining.ca/wp-content/uploads/dlm_uploads/2021/06/MAC-Tailings-Guide-Version-3-2-March-2021.pdf",

    # Brookings — China's critical minerals role in supply chains
    "brookings_china_critical_minerals":
        "https://www.brookings.edu/wp-content/uploads/2022/08/LTRC_ChinaSupplyChain.pdf",

    # CSIS — Geopolitics of critical mineral supply chains
    "csis_critical_minerals_geopolitics":
        "https://csis-website-prod.s3.amazonaws.com/s3fs-public/publication/210311_Nakano_Critical_Minerals.pdf",

    # Friends of the Earth Europe — Green Mining is a Myth
    "foe_green_mining_myth_2021":
        "https://friendsoftheearth.eu/wp-content/uploads/2021/10/Green-mining-myth-report.pdf",

    # GEUS — Cobalt and lithium supply chain sustainability analysis
    "geus_cobalt_lithium_supply_chains_2023":
        "https://data.geus.dk/pure-pdf/MiMa-R_2023_03_web.pdf",

    # CGDev — Illicit financial flows and trade misinvoicing
    "cgdev_illicit_financial_flows":
        "https://www.cgdev.org/sites/default/files/illicit-financial-flows-trade-misinvoicing-and-multinational-tax-avoidance.pdf",

    # World Bank — Illicit Financial Flows concepts and measurement
    "worldbank_illicit_financial_flows":
        "https://documents1.worldbank.org/curated/en/409341624542914243/pdf/Illicit-Financial-Flows-Concepts-Measurement-and-Evidence.pdf",

    # EITI / Resource Governance Institute — Myanmar extractive transparency
    "rgi_eiti_myanmar_cheat_sheet":
        "https://resourcegovernance.org/sites/default/files/documents/myanmar_eiti_cheat_sheet.pdf",

    # Resource Governance Institute — DRC mining revenues accountability
    "rgi_drc_mining_revenues":
        "https://resourcegovernance.org/sites/default/files/documents/drc-mining-revenues-increasing-accountability-by-analyzing-payments-to-governments-reports.pdf",

    # Resource Governance Institute — DRC mining code analysis
    "rgi_drc_mining_code":
        "https://resourcegovernance.org/sites/default/files/DRC_english.pdf",

    # FARN — Lithium extraction Argentina social/environmental impacts
    "farn_lithium_argentina_2019":
        "https://farn.org.ar/wp-content/uploads/2019/05/DOC_LITHIUM_ENGLISH-1.pdf",

    # FARN — Sal de Vida risky lithium project Argentina 2023
    "farn_sal_de_vida_argentina_2023":
        "https://farn.org.ar/wp-content/uploads/2023/05/Sal-de-Vida-A-risky-lithium-mining-project-in-Argentina.pdf",

    # Chile — National Lithium Strategy 2023 (official government)
    "chile_national_lithium_strategy_2023":
        "https://s3.amazonaws.com/gobcl-prod/public_files/Campa%C3%B1as/Litio-por-Chile/Estrategia-Nacional-del-litio-EN.pdf",

    # IPIS — 3TG fiscal regimes Rwanda/Burundi/DRC/Uganda laundering analysis 2022
    "ipis_3tg_rwanda_burundi_laundering_2022":
        "https://ipisresearch.be/wp-content/uploads/2022/02/Comparative-analysis-of-the-fiscal-regimes-and-implications-for-mineral-trade-of-ASM-3TGs-in-Rwanda-Uganda-Burundi-and-the-DRC.pdf",

    # Verite — Tantalum, Tungsten, Tin conflict minerals supply chain
    "verite_3tg_conflict_minerals":
        "https://verite.org/wp-content/uploads/2018/01/SSA-Verite-Commodity-Report-Tantalum-Tungsten-Tin-Conflict-Minerals.pdf",

    # Oxford Institute for Energy Studies — China rare earths dominance policy 2023
    "oxford_energy_china_rare_earths_2023":
        "https://www.oxfordenergy.org/wpcms/wp-content/uploads/2023/06/CE7-Chinas-rare-earths-dominance-and-policy-responses.pdf",

    # USGS — Mineral Industry of the Philippines 2022
    "usgs_philippines_minerals_2022":
        "https://pubs.usgs.gov/myb/vol3/2022/myb3-2022-philippines.pdf",

    # World Bank — Indonesia Mining Sector Diagnostic
    "worldbank_indonesia_mining_diagnostic":
        "https://documents1.worldbank.org/curated/en/704581575962514304/pdf/Report-on-Indonesia-Mining-Sector-Diagnostic.pdf",

    # ICGLR — Special Report on Regional Mineral Certification (Great Lakes Region)
    "icglr_regional_mineral_certification":
        "https://archive.uneca.org/sites/default/files/PublicationFiles/special_report_-icglr.pdf",

    # Transport & Environment — Cobalt from Congo: how to source it better
    "te_cobalt_congo_sourcing":
        "https://www.transportenvironment.org/uploads/files/Cobalt_from_Congo_how_to_source_it_better_Final.pdf",

    # CEPS — Implementing the EU Digital Battery Passport 2024
    "ceps_eu_battery_passport_2024":
        "https://circulareconomy.europa.eu/platform/sites/default/files/2024-03/1qp5rxiZ-CEPS-InDepthAnalysis-2024-05_Implementing-the-EU-digital-battery-passport.pdf",

    # Battery Pass — Content guidance Q&A for EU battery passport
    "battery_pass_content_guidance":
        "https://thebatterypass.eu/wp-content/uploads/q-a_content-guidance.pdf",
}

# ── Web pages scraped to text (PDFs blocked, HTML freely accessible) ─────────

WEB_PAGES = {

    "bhrrc_transition_minerals_tracker_about": {
        "url": "https://www.business-humanrights.org/en/transition-minerals-tracker/",
        "desc": "BHRRC Transition Minerals Tracker — methodology and overview",
    },

    "bhrrc_nickel_sulawesi_2024": {
        "url": "https://www.business-humanrights.org/en/latest-news/indonesia-nickel-mining/",
        "desc": "BHRRC — Indonesia nickel mining human rights allegations 2024",
    },

    "bhrrc_myanmar_ree_2023": {
        "url": "https://www.business-humanrights.org/en/latest-news/myanmar-rare-earth-mining/",
        "desc": "BHRRC — Myanmar rare earth mining human rights concerns 2023",
    },

    "global_tailings_portal_about": {
        "url": "https://tailings-portal.org/",
        "desc": "Global Tailings Portal — GISTM standard and TSF consequence classifications",
    },

    "rmi_amrt_smelter_lists": {
        "url": "https://www.responsiblemineralsinitiative.org/responsible-minerals-assurance-process/rmap-smelter-refiner-lists/",
        "desc": "RMI RMAP — Smelter/Refiner Lists methodology and current status",
    },

    "enough_project_conflict_minerals": {
        "url": "https://enoughproject.org/issues/conflict-minerals",
        "desc": "Enough Project — conflict minerals overview DRC cobalt tin tungsten",
    },

    "globalwitness_myanmar_ree_overview": {
        "url": "https://www.globalwitness.org/en/campaigns/natural-resource-governance/fuelling-the-future-poisoning-the-present-myanmars-rare-earth-boom/",
        "desc": "Global Witness — Myanmar rare earth environmental and human rights crisis overview",
    },

    "globalwitness_drc_cobalt_overview": {
        "url": "https://www.globalwitness.org/en/campaigns/oil-gas-and-mining/myanmarjade/",
        "desc": "Global Witness — Myanmar jade and DRC cobalt supply chain investigations overview",
    },

    "amnesty_cobalt_overview": {
        "url": "https://www.amnesty.org/en/documents/afr62/3183/2016/en/",
        "desc": "Amnesty International — DRC cobalt mining human rights abuses overview 2016",
    },

    "earthsight_jiangxi_ree": {
        "url": "https://earthsight.org.uk/research/investigations/toxic-quota/",
        "desc": "Earthsight — China rare earth mining illegal deforestation investigation",
    },

    "chatham_house_drc_cobalt": {
        "url": "https://resourcetrade.earth/publications/critical-metals-ev-batteries",
        "desc": "Chatham House / Resource Trade Earth — critical metals EV batteries cobalt supply chains",
    },

    "ipis_drc_mapping_page": {
        "url": "https://ipisresearch.be/publication/analysis-of-the-interactive-map-of-artisanal-mining-areas-in-eastern-democratic-republic-of-congo-2023-update/",
        "desc": "IPIS — Analysis of artisanal mining areas in eastern DRC 2023 update",
    },

    "gfintegrity_trade_misinvoicing": {
        "url": "https://gfintegrity.org/issue/trade-misinvoicing/",
        "desc": "Global Financial Integrity — trade misinvoicing methodology and DRC evidence",
    },

    "globalwitness_itsci_laundromat": {
        "url": "https://www.globalwitness.org/en/campaigns/natural-resource-governance/itsci-laundromat/",
        "desc": "Global Witness — ITSCI Laundromat: how responsible sourcing scheme is being circumvented in DRC/Rwanda",
    },

    "globalwitness_myanmar_poisoned_mountains": {
        "url": "https://www.globalwitness.org/en/campaigns/natural-resource-governance/myanmars-poisoned-mountains/",
        "desc": "Global Witness — Myanmar Poisoned Mountains: rare earth mining expansion 2022",
    },

    "globalwitness_critical_minerals_violence": {
        "url": "https://globalwitness.org/en/campaigns/transition-minerals/critical-mineral-mines-tied-to-111-violent-incidents-and-protests-on-average-a-year/",
        "desc": "Global Witness — Critical mineral mines: 111 violent incidents/protests per year on average",
    },

    "cri_nickel_unearthed_indonesia": {
        "url": "https://cri.org/reports/nickel-unearthed/",
        "desc": "Climate Rights International — Nickel Unearthed: human and climate costs of Indonesia nickel industry",
    },

    "cri_nickel_ongoing_harms_indonesia": {
        "url": "https://cri.org/reports/ongoing-harms-limited-accountability/",
        "desc": "Climate Rights International — Ongoing Harms Limited Accountability: Indonesian nickel follow-up",
    },

    "icg_drc_conflict_minerals_governance": {
        "url": "https://www.crisisgroup.org/africa/central-africa/democratic-republic-congo/behind-problem-conflict-minerals-dr-congo-governance",
        "desc": "International Crisis Group — Behind the Problem of Conflict Minerals in DRC: governance failures",
    },

    "reliefweb_un_drc_experts_2023": {
        "url": "https://reliefweb.int/report/democratic-republic-congo/midterm-report-group-experts-democratic-republic-congo-s2023990-enarruzh",
        "desc": "UN Group of Experts DRC midterm report S/2023/990 — conflict minerals armed group financing",
    },

    "nrgi_contract_transparency": {
        "url": "https://resourcegovernance.org/publications/unfinished-business-contract-transparency-extractive-industries",
        "desc": "Natural Resource Governance Institute — contract transparency gaps in EITI extractive industries",
    },

    "amnesty_powering_change_2023": {
        "url": "https://www.amnesty.org/en/documents/afr62/7009/2023/en/",
        "desc": "Amnesty International — Powering Change or Business as Usual? DRC cobalt copper forced evictions 2023",
    },

    "hrw_drc_child_labor_2022": {
        "url": "https://www.hrw.org/news/2022/07/14/child-labor-and-human-rights-violations-mining-industry-democratic-republic-congo",
        "desc": "Human Rights Watch — Child labor and human rights violations in DRC mining industry 2022",
    },

    "hrw_competition_minerals_2025": {
        "url": "https://www.hrw.org/news/2025/05/06/competition-minerals-should-respect-rights-and-environment",
        "desc": "Human Rights Watch — Competition for minerals must respect rights and environment 2025",
    },

    "unicef_drc_child_labour": {
        "url": "https://www.unicef.org/drcongo/en/topics/child-labour",
        "desc": "UNICEF DRC — child labour in mining: program overview and evidence",
    },

    "bhrrc_tmt_2024_global_analysis": {
        "url": "https://www.business-humanrights.org/en/from-us/briefings/transition-minerals-tracker-2024-global-analysis/",
        "desc": "BHRRC Transition Minerals Tracker 2024 — global analysis of human rights allegations",
    },

    "transparency_intl_extractive": {
        "url": "https://www.transparency.org/en/our-priorities/extractive-industries",
        "desc": "Transparency International — corruption in extractive industries: mining governance failures",
    },

    "eiti_drc_country_page": {
        "url": "https://eiti.org/countries/democratic-republic-congo",
        "desc": "EITI DRC — extractive industries transparency data and governance assessment",
    },

    "global_tailings_review_standard": {
        "url": "https://globaltailingsreview.org/global-industry-standard/",
        "desc": "Global Tailings Review — Global Industry Standard on Tailings Management (GISTM) full text",
    },

    "cri_does_anyone_care_indonesia": {
        "url": "https://cri.org/reports/does-anyone-care/",
        "desc": "Climate Rights International — Does Anyone Care? Human/environmental/climate toll of Indonesia nickel",
    },

    "oxfam_recharging_community_consent": {
        "url": "https://www.oxfamamerica.org/explore/research-publications/recharging-community-consent/",
        "desc": "Oxfam America — Recharging Community Consent: lithium mining and indigenous rights Latin America",
    },

    "hrw_curse_of_gold_drc_2005": {
        "url": "https://www.hrw.org/report/2005/06/01/curse-gold",
        "desc": "Human Rights Watch — Curse of Gold: DRC artisanal gold mining armed groups foundational report",
    },

    "unctad_commodities_development_2023": {
        "url": "https://unctad.org/publication/commodities-and-development-report-2023",
        "desc": "UNCTAD — Commodities and Development Report 2023: commodity dependence and supply chain risks",
    },

    "yale_e360_china_ree_mining": {
        "url": "https://e360.yale.edu/features/china-wrestles-with-the-toxic-aftermath-of-rare-earth-mining",
        "desc": "Yale Environment 360 — China wrestles with toxic aftermath of rare earth mining (Jiangxi)",
    },

    "global_initiative_indonesia_tin_corruption": {
        "url": "https://globalinitiative.net/analysis/corruption-indonesia-tin-mining/",
        "desc": "Global Initiative Against Transnational Organized Crime — corruption in Indonesia state-owned tin mining",
    },

    "unep_energy_transition_minerals": {
        "url": "https://www.unep.org/resources/report/financing-responsible-supply-energy-transition-minerals-sustainable-development",
        "desc": "UNEP — Financing responsible supply of energy transition minerals for sustainable development",
    },

    "fair_cobalt_alliance_resources": {
        "url": "https://faircobaltalliance.org/resources/research-tools/",
        "desc": "Fair Cobalt Alliance — research tools and responsible sourcing in DRC artisanal cobalt mining",
    },

    "amnesty_philippines_nickel_2025": {
        "url": "https://www.amnesty.org.ph/2025/01/nickel-mining-projects-approved-despite-inadequate-consultation-and-serious-risks-to-communities-health-and-environment/",
        "desc": "Amnesty International Philippines — nickel mining projects inadequate consultation health risks 2025",
    },

    "globalwitness_philippines_critical_minerals": {
        "url": "https://globalwitness.org/en/press-releases/rush-for-critical-minerals-in-philippines-threatens-indigenous-communities-and-biodiversity/",
        "desc": "Global Witness — rush for critical minerals in Philippines threatens indigenous communities and biodiversity",
    },

    "eu_crma_implementation_2024": {
        "url": "https://epthinktank.eu/2024/11/20/implementing-the-eus-critical-raw-materials-act/",
        "desc": "EU Parliament Think Tank — implementing the Critical Raw Materials Act 2024",
    },

    "bgr_ctc_rwanda_implementation": {
        "url": "https://www.bgr.bund.de/EN/Themen/Min_rohstoffe/CTC/Mineral-Certification-Rwanda/Implementation/implementation_rw_node_en.html",
        "desc": "BGR Germany — Certified Trading Chains Rwanda: mineral certification scheme implementation",
    },

    "icmm_blockchain_traceability_minerals": {
        "url": "https://europeanpartnership-responsibleminerals.eu/blog/view/f1279c62-6dae-4944-9cf5-e8e09df96d2e/icmm-blockchain-for-traceability-in-minerals-and-metals-supply-chains-opportunities-and-challenges",
        "desc": "ICMM — blockchain for traceability in minerals and metals supply chains: opportunities and challenges",
    },
}

# ── Manual download instructions (PDF CDNs block automated download) ──────────

MANUAL_DOWNLOADS = [
    {
        "name":  "global_witness_sacrifice_zone_2024",
        "title": "Global Witness — 'The Sacrifice Zone' (Myanmar REE, 2024)",
        "url":   "https://www.globalwitness.org/en/campaigns/natural-resource-governance/fuelling-the-future-poisoning-the-present-myanmars-rare-earth-boom/",
        "why":   "CRITICAL — Satellite-verified analysis of unlicensed REE sites in Kachin State. Primary source for mr4 (Myanmar). Click 'Download report' button.",
        "save":  "data/raw/misc/global_witness_sacrifice_zone_2024.pdf",
    },
    {
        "name":  "amnesty_time_to_recharge_2017",
        "title": "Amnesty International — 'Time to Recharge' (EV battery supply chains, 2017)",
        "url":   "https://www.amnesty.org/en/documents/eur25/7004/2017/en/",
        "why":   "Links DRC cobalt ASM directly to Apple, Samsung, Sony, Tesla supply chains. Key downstream tracing evidence.",
        "save":  "data/raw/misc/amnesty_time_to_recharge_2017.pdf",
    },
    {
        "name":  "earthsight_toxic_quota_2023",
        "title": "Earthsight — 'Toxic Quota' (Jiangxi REE illegal mining, 2023)",
        "url":   "https://earthsight.org.uk/research/investigations/toxic-quota/",
        "why":   "Satellite analysis showing Jiangxi concession overmining — direct source for df4 signal China entities.",
        "save":  "data/raw/misc/earthsight_toxic_quota_2023.pdf",
    },
    {
        "name":  "gfi_trade_misinvoicing_drc_2023",
        "title": "Global Financial Integrity — DRC Trade Misinvoicing Report (2023)",
        "url":   "https://gfintegrity.org/reports/",
        "why":   "Quantifies the 38–74% Comtrade mirror gap for DRC cobalt exports. Primary source for df1/df5 signals.",
        "save":  "data/raw/misc/gfi_trade_misinvoicing_drc_2023.pdf",
    },
    {
        "name":  "bhrrc_tmt_nickel_indonesia_2024",
        "title": "BHRRC — Transition Minerals Tracker Nickel Indonesia Report (2024)",
        "url":   "https://www.business-humanrights.org/en/transition-minerals-tracker/",
        "why":   "Aggregated allegations dataset for Indonesian nickel — source for mr3 signal. Click 'Download data'.",
        "save":  "data/raw/misc/bhrrc_tmt_nickel_indonesia_2024.pdf",
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def try_download_pdf(name: str, url: str) -> bool:
    dest = OUT_DIR / f"{name}.pdf"
    if dest.exists():
        return False
    try:
        r = requests.get(url, headers=HEADERS, timeout=60, stream=True, allow_redirects=True)
        r.raise_for_status()
        content_type = r.headers.get("Content-Type", "")
        if "pdf" not in content_type.lower() and len(r.content) < 5000:
            print(f"\n  ⚠ {name}: not a PDF (content-type: {content_type}) — skipping")
            return False
        dest.write_bytes(r.content)
        size_kb = dest.stat().st_size // 1024
        print(f"\n  ✓ {name}: {size_kb} KB")
        return True
    except Exception as e:
        print(f"\n  ✗ {name}: {e}")
        return False


def scrape_web_page(name: str, url: str, desc: str) -> bool:
    dest = OUT_DIR / f"{name}.txt"
    if dest.exists():
        return False
    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        r.raise_for_status()

        # Strip HTML tags
        text = re.sub(r'<style[^>]*>.*?</style>', ' ', r.text, flags=re.S)
        text = re.sub(r'<script[^>]*>.*?</script>', ' ', text, flags=re.S)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'&[a-z]+;|&#\d+;', ' ', text)
        text = re.sub(r'\s{3,}', '\n\n', text).strip()

        if len(text) < 200:
            print(f"\n  ⚠ {name}: page too short ({len(text)} chars) — likely blocked")
            return False

        dest.write_text(
            f"Source: {desc}\nURL: {url}\n{'─'*70}\n\n{text}",
            encoding="utf-8"
        )
        print(f"\n  ✓ {name}: {len(text):,} chars")
        return True
    except Exception as e:
        print(f"\n  ✗ {name}: {e}")
        return False


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    auto_new = web_new = 0

    # 1. Auto PDF downloads
    print("\n── Auto PDF downloads ───────────────────────────────────────────────")
    for name, url in tqdm(AUTO_PDFS.items(), desc="PDFs", unit="file"):
        ok = try_download_pdf(name, url)
        auto_new += int(ok)
        time.sleep(1.2)

    # 2. Web page scraping
    print("\n── Web page scraping ────────────────────────────────────────────────")
    for name, info in tqdm(WEB_PAGES.items(), desc="Web pages", unit="page"):
        ok = scrape_web_page(name, info["url"], info["desc"])
        web_new += int(ok)
        time.sleep(1.0)

    # 3. Manual download list
    print("\n")
    print("═" * 70)
    print("  MANUAL DOWNLOADS REQUIRED")
    print("  These are the most important reports — CDNs block automated download.")
    print("  Download each PDF and save to the path shown.")
    print("═" * 70)
    for item in MANUAL_DOWNLOADS:
        already = (OUT_DIR / f"{item['name']}.pdf").exists()
        status  = "✓ already present" if already else "✗ MISSING"
        print(f"\n  [{status}] {item['title']}")
        print(f"  Why:  {item['why']}")
        print(f"  URL:  {item['url']}")
        print(f"  Save: {item['save']}")

    missing = sum(1 for m in MANUAL_DOWNLOADS if not (OUT_DIR / f"{m['name']}.pdf").exists())

    print(f"\n{'═'*70}")
    print(f"  Auto PDFs downloaded:  {auto_new}")
    print(f"  Web pages scraped:     {web_new}")
    print(f"  Manual PDFs missing:   {missing}/{len(MANUAL_DOWNLOADS)}")
    print(f"\n  → Re-run 05_chunk.py after adding manual PDFs to data/raw/misc/")
    print(f"{'═'*70}\n")


if __name__ == "__main__":
    main()
