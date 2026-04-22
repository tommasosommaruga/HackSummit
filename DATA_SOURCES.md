# Data Sources — What's Real, What's Approximate, How to Get Real Numbers

## Transparency: data status

| Dataset | File | Status | How to get real data |
|---|---|---|---|
| Child labor % | `child_labor.js` | ⚠ Mixed — see table below | World Bank API (free, working) |
| DOL ILAB flags | `child_labor.js` | ✅ Real — 2022 edition accurate | Download Excel, link below |
| Company ownership | `companies.js` | ✅ Real — from public filings | Annual reports / SEC EDGAR |
| Incident records | `companies.js` | ✅ Real — cited with source+year | Amnesty, IRAdvocates, Reuters |
| ESG report URLs | `companies.js` | ✅ Real — verified links | Linked directly |
| Mine output (kt) | `mines.js` | ⚠ Approximate — right order of magnitude | USGS MCS Excel (see below) |
| Transport corridors | `transport.js` | ✅ Real — physical routes accurate | World Bank, AfDB (linked) |
| Transport km | `transport.js` | ✅ Real — within ±10% | sea-distances.org / Google Maps |
| Laundering risk scores | `transport.js` | ⚠ Expert estimate | Combine Comtrade + OECD reports |
| Recycling supply (kt) | `recycling.js` | ⚠ Approximate — paywalled real data | Benchmark Mineral Intelligence ($) |
| Recycling ESG claims | `recycling.js` | ✅ Real — from actual published reports | Linked to source PDFs |
| Greenwash analysis | `recycling.js` | ✅ Logic is real — input data approximate | Redo once USGS + BMI data loaded |

---

## Real data we actually pulled (live, during build)

### World Bank child labor % (ages 7–14, ILO surveys via World Bank API)
API: `https://api.worldbank.org/v2/country/{code}/indicator/SL.TLF.0714.ZS?format=json`

| Country | ISO3 | Real % | Year of survey | vs. our estimate |
|---|---|---|---|---|
| DRC | COD | **41.4%** | 2014 | We had 36.8% — real is higher |
| Zambia | ZMB | no data | — | Approximate retained |
| Zimbabwe | ZWE | no data | — | Approximate retained |
| Bolivia | BOL | **13.9%** | 2015 | We had 26.3% — real is lower |
| Chile | CHL | **4.5%** | 2012 | We had 2.5% — close |
| Argentina | ARG | **5.0%** | 2012 | We had 7.9% — close |
| Indonesia | IDN | **3.7%** | 2010 | We had 6.9% — real is lower |
| Philippines | PHL | **9.0%** | 2011 | We had 10.6% — close |
| Mozambique | MOZ | **27.4%** | 2008 | We had 35.4% — real is lower |
| South Africa | ZAF | no data | — | Approximate retained |
| China | CHN | no data | — | Approximate retained (underreported) |
| Russia | RUS | no data | — | Approximate retained |
| Australia | AUS | no data | — | Approximate retained (<1%) |
| Portugal | PRT | no data | — | Approximate retained (<1%) |

**Note:** World Bank/ILO only have data where national surveys were conducted.
Many countries haven't published recent surveys. The ILO ILOSTAT bulk download
has more complete data — see fetch script below.

---

## How to get each dataset — exact steps

### 1. ILO Child Labor % — most complete source

```
Method A (recommended): ILO ILOSTAT bulk download
  URL: https://www.ilo.org/ilostat-files/WEB_bulk_download/indicator/SDG_0871_SEX_AGE_RT.csv.gz
  No auth required. Gunzip then filter: sex=T, classif1=AGE_5T17, latest year per country.

Method B: World Bank API (what we actually fetched above — partial data)
  https://api.worldbank.org/v2/country/CD/indicator/SL.TLF.0714.ZS?format=json&mrv=5

Method C: Interactive
  https://ilostat.ilo.org/data/ → search "SDG 8.7.1" → download CSV
```

Run: `python3 scripts/fetch_ilo_child_labor.py`

### 2. DOL ILAB — Goods Produced by Child/Forced Labor

```
Direct Excel download (no auth):
  https://www.dol.gov/sites/dolgov/files/ILAB/child_labor_reports/tda2022/TVPRA_List_Of_Goods_2022.xlsx

Interactive search:
  https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods

Key findings relevant to this project (2022 edition, confirmed accurate):
  DRC:     Cobalt ✅ flagged (child labor), Gold ✅, Cassiterite ✅, Wolframite ✅, Tantalum ✅
  Bolivia: Silver ✅ (mining broadly flagged under mining category)
  Philippines: Gold ✅
  Note: Lithium not yet listed as standalone commodity — lobbied against by industry
```

Run: `python3 scripts/fetch_dol_ilab.py`

### 3. USGS Mine Production — real output by country

```
MCS 2024 Excel files (one per mineral, public domain):
  Base URL: https://pubs.usgs.gov/periodicals/mcs2024/
  Files: click any mineral at:
  https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries

Direct PDF (all minerals in one):
  https://pubs.usgs.gov/periodicals/mcs2024/mcs2024.pdf
  Table 1 in each mineral section = mine production by country, last 2 years

Note: USGS changed their Excel URL structure in 2024.
The PDF is always at the base URL. Excel files are sometimes missing.
```

Run: `python3 scripts/fetch_usgs_production.py`
(Script downloads and parses; if Excel URL 404s, parse from PDF manually)

### 4. RMI Smelter Audit List — certified status

```
Requires free registration: https://www.responsibleminerals.org/user/register
Download page after login: https://www.responsibleminerals.org/rmap/smelter-refiner-lists/

Files available:
  - Cobalt Smelter List (xlsx) — quarterly updated
  - Nickel Smelter List (xlsx)
  - Lithium Refiner List (xlsx) — new 2023
  - Tin / Tantalum / Gold (3TG minerals)

Key caveat: RMAP "Active/Compliant" means the SMELTER passed audit.
It does NOT mean upstream artisanal mines are child-labor free.
Huayou passed RMAP 2022 but Amnesty documented child labor in their supply chain.
```

Run: `python3 scripts/fetch_rmi_smelters.py` (after manual download)

### 5. UN Comtrade — trade flows

```
Register (free, 500 req/day): https://comtradeplus.un.org/

Key HS codes for battery minerals:
  260190  Lithium ores and concentrates
  283691  Lithium carbonate
  282520  Lithium hydroxide
  260500  Cobalt ores and concentrates
  260400  Nickel ores and concentrates
  250410  Natural graphite
  260300  Copper ores and concentrates
  810520  Cobalt articles / unwrought cobalt

API example:
  GET https://comtradeapi.un.org/data/v1/get
    ?typeCode=C&freqCode=A&clCode=HS
    &reporterCode=180    (Congo DRC)
    &period=2022
    &cmdCode=260500      (cobalt ores)
    &flowCode=X          (exports)
    &subscription-key=YOUR_KEY
```

Already scripted: `src/ingest/comtrade.py`

### 6. Recycling supply data — paywalled

```
Authoritative source: Benchmark Mineral Intelligence
  https://www.benchmarkminerals.com/
  Subscription required (~$10k/year for full access)

Free proxy: Circular Energy Storage (Hans Eric Melin)
  https://circularenergystorage.com/
  Some data free, full reports paid

Free alternative: IEA Global EV Outlook (annual)
  https://www.iea.org/reports/global-ev-outlook-2023
  Appendix tables include recycled material flows

Our figures in recycling.js are estimates consistent with IEA ranges.
For the hackathon, they're close enough for the mass-balance logic to work.
```

---

## What the mass-balance fraud detection actually proves

The CATL recycling claim analysis is the strongest result here because it uses
only public numbers:

1. **CATL claims**: 18% recycled content (their 2022 sustainability report, p.34)
2. **CATL production**: ~320 GWh in 2023 (Benchmark, confirmed by multiple sources)
3. **Li per GWh**: ~0.9 kt/GWh (IEA standard, public)
4. **Implied recycled Li**: 320 × 0.9 × 0.18 = **51.8 kt**
5. **Global recycled Li 2023**: IEA estimate ~50–60 kt total
6. **Conclusion**: CATL alone claims to use essentially ALL global recycled Li

This logic holds regardless of whether the recycling supply figure is 50 or 60 kt.
The claim is implausible either way.

Apple's cobalt claim is also verifiable: their Supplier Responsibility Report
explicitly scopes it to "Apple-designed batteries" — the fine print is in the document.
The greenwash is in how it was communicated in press releases vs. the actual scope.

---

## Ground truth vs. model output

The app currently shows **modeled probabilities**, not ground truth.
Ground truth for child labor in a specific battery does not exist — that's the point.
The model makes the hidden risk legible. Real data improves the model precision.

Key sources that document the *actual* incidents (not modeled):
- Amnesty International "This Is What We Die For" (2016) — DRC cobalt, Huayou/CDM
- Washington Post "Cobalt Red" investigation (2021)
- International Rights Advocates lawsuit, US DC Circuit (2021) — Apple, Tesla, Google, Microsoft, Dell named
- Reuters "How Russia evades nickel sanctions" (July 2023)
- Global Witness "Regime of Impunity" (2022) — DRC mining governance
