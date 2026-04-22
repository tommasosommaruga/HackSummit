# Hackathon: Ghost in the Machine — Lithium Traceability

## Mission
Build a PoC that uses open-source data to verify or debunk "Ethically Sourced" claims on consumer lithium-ion batteries. Lithium supply chains are opaque: child labor in artisanal mines, document forgery at transit hubs, greenwashed "recycled" lithium that was actually mined.

No single source of truth exists. This hackathon builds one.

---

## Tracks (choose one)

### Track A — Provenance Engine (Data Science / ML)
Probabilistic model: given a battery manufactured in Q3 2024, what is the likelihood it contains material from a high-risk mine in 2021–2022 based on global throughput data?
- Key challenge: 2–3 year lag between extraction → refining → assembly
- Technique anchor: Bayesian inference to fill gaps in missing shipping manifests

### Track B — Geo-Forensic Map (GIS / Mapping)
Visualize material flow. Map mining sites (satellite/OSINT) to processing hubs. Identify "Laundering Hubs" — countries exporting more lithium than they could possibly mine or legally import.
- Key challenge: correlating trade volumes with geospatial imagery
- Data sources: UN Comtrade, OpenStreetMap, Sentinel-2 satellite

### Track C — Consumer Truth UI (Frontend / Design)
Design the interface for a normal person to scan a battery and see a Trust Score based on the complex data underneath.
- Key challenge: translate probabilistic/multi-source uncertainty into a single legible signal
- Deliverable: interactive prototype, not just mockups

---

## Required Technical Components

All solutions should address at least two of the following:

| Component | Description |
|---|---|
| **Multimodal Data Fusion** | Link PDF sustainability reports → CSV customs records → satellite mine imagery |
| **Mass-Balance Logic** | If refinery output > reported "ethical" ore input → flag discrepancy |
| **Temporal Route Modeling** | Account for 2–3 year extraction-to-product lag |
| **Weak Signal Detection** | Sudden volume spikes in transit countries, tonnage anomalies |
| **Data Integrity Handling** | Missing data, intentional falsification, conflicting sources |

---

## Evaluation Criteria

1. **Analytical Rigor** — Does the tool surface weak signals (e.g., transit country volume spike)?
2. **Data Integrity** — How does the solution handle missing or falsified data?
3. **Feasibility** — Can it scale using real-world APIs?
4. **Impact** — Would a regulator, journalist, or consumer actually use this?

---

## Seed Data (provided by organizers)

- Historical lithium export volumes 2018–2025 (CSV)
- Geospatial coordinates: major lithium triangles + artisanal mining zones
- Publicly available ESG reports from top 5 battery manufacturers (PDF)

---

## Key APIs & Data Sources

| Source | Use |
|---|---|
| [UN Comtrade](https://comtradeplus.un.org/) | Trade flow volumes by country/commodity |
| [OpenStreetMap](https://www.openstreetmap.org/) | Geographic base layer |
| [Sentinel-2 (ESA)](https://sentinel.esa.int/) | Satellite imagery of mine sites |
| [Global Witness / OECD](https://www.globalwitness.org/) | Conflict mineral reports |
| [SEC EDGAR](https://www.sec.gov/cgi-bin/browse-edgar) | Corporate ESG filings |

---

## Claude as Mentor — Behavior Instructions

When participants ask for help:

- **Do not just give code.** Guide them to the insight first.
- For Track A: explain how Bayesian probability fills gaps in missing shipping manifests; how to weight priors from historical conflict-region output volumes.
- For Track B: show how to correlate trade volume time series with satellite imagery timestamps; explain the "laundering hub" mass-balance test.
- For Track C: help translate multi-source uncertainty scores into UX-legible Trust Score components.
- Always ask: *"What is your data telling you that the official documents are not?"*
- Push teams to account for the **temporal lag** — a 2024 battery contains 2021–2022 ore.
- Flag when a team's model assumes data is truthful — prompt them to model adversarial falsification.

---

## Glossary

| Term | Meaning |
|---|---|
| **Artisanal Mining (ASM)** | Small-scale, often informal mining; high risk of child labor |
| **Laundering Hub** | Transit country used to obscure true origin of material |
| **Mass-Balance** | If output > verifiable input, discrepancy flags potential fraud |
| **Temporal Route** | 2–3 year pipeline from mine → refinery → battery → consumer product |
| **Trust Score** | Composite signal of provenance confidence for a given product |
| **Greenwashing** | Mislabeling mined lithium as recycled to meet ESG targets |

---

## Project Structure (suggested)

```
/
├── data/
│   ├── raw/          # seed CSVs, PDFs, shapefiles
│   ├── processed/    # cleaned, joined datasets
│   └── outputs/      # model results, flagged anomalies
├── notebooks/        # exploratory analysis
├── src/
│   ├── ingest/       # data loaders for each API/source
│   ├── model/        # Track A: probabilistic models
│   ├── geo/          # Track B: spatial analysis
│   └── ui/           # Track C: frontend
├── CLAUDE.md         # this file — project context for Claude
└── README.md
```

---

## Win Condition

A team wins if their PoC can take a **real battery product** (e.g., a specific EV model or laptop), trace its likely lithium supply chain using open data, and produce a **defensible confidence score** on whether its sourcing claims hold up — with clear flags where they do not.
