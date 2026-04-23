# REEtrieve — Critical Mineral Supply Chain Intelligence

> *Can a battery's "ethically sourced" claim survive a 10-second check?*

REEtrieve is an open-data PoC that traces rare earth, cobalt, nickel, tin, and tungsten supply chains — flags laundering hubs, mass-balance gaps, and moral risk — and lets auditors interrogate the evidence via an on-device AI chat grounded in real documents.

---

## What it does

| Layer | What it does |
|---|---|
| **Geo-Forensic Map** | Plots 200+ mines, refineries, and transit hubs. Infers missing coordinates at state level. Flags AIS dark-shipping corridors. |
| **Bayesian Risk Engine** | 18 signals across 4 dimensions: child labour, forced labour, document fraud, moral risk. Non-independence product model — no hardcoded scores, everything derived from public data. |
| **High-Risk Audit Dashboard** | 13 flagged entities across 6 continents. OECD 5-step compliance checklist. Grade assignment (A–F) with OECD §4.1–4.4 citations. Inspector workflow with file upload and audit history. |
| **RAG + Local AI Chat** | Investigators ask natural-language questions grounded in USGS, UN Comtrade, OECD, and RMI documents. Two-sided analysis enforced. All claims cited. Runs 100% on-device — no API key. |

---

## Data sources

- **USGS** Mineral Commodity Summaries 2019–2024 + element fact sheets
- **UN Comtrade** trade flow API — HS codes for REE, Co, Ni, Sn, W (2018–2024)
- **OECD** Due Diligence Guidance 3rd Ed. — checklist and grade multipliers
- **RMI AMRT** — smelter/refiner audit lists
- **GISTM** Global Tailings Portal — TSF consequence classifications
- **BHRRC** Transition Minerals Tracker — allegation density
- **Global Witness** — "The Sacrifice Zone" 2024 hyperspectral satellite investigation
- **Benchmark Mineral Intelligence** — REE carbon & waste ESG scores

---

## Risk signals (18 total)

| Dimension | Signals |
|---|---|
| Child Labour | Production spike (USGS/EITI), ILO child labour rate, UNESCO enrolment gap, NASA VIIRS night luminosity |
| Forced Labour | Armed group proximity (IPIS/ACLED), ILO forced labour indicator, debt bondage (Amnesty), AIS dark shipping |
| Document & Trade Fraud | Comtrade mirror-trade gap, AIS dark port events, certificate temporal fraud, satellite concession mismatch, invoice below LME floor |
| Moral Risk | RMI AMRT absence, GISTM tailings class, BHRRC allegation density, Global Witness investigation flag, BMI ESG below median |

---

## Tech stack

- **Frontend** — React 18 + Vite, MapLibre GL, Deck.gl
- **Risk engine** — Bayesian non-independence product (`scoring.js`) — pure JS, no library
- **RAG pipeline** — Python: `pdfplumber` → sliding-window chunker → JSONL corpus
- **AI chat** — Ollama (local, free, no API key) · Express SSE proxy · keyword-ranked chunk retrieval
- **Models** — Llama 3.2 (fast) / Mistral (stronger reasoning) — switchable in UI

---

## Run it

```bash
# 1. Install Ollama and pull models (one-time, ~4 GB total)
brew install ollama
ollama serve
ollama pull llama3.2    # fast
ollama pull mistral     # stronger reasoning — switchable in UI

# 2. Start the app
cd webapp
cp .env.example .env
npm install
npm run dev:all          # starts Vite + Express API concurrently

# 3. Build the RAG corpus (one-time, ~15 min)
cd rag_prep
pip install pdfplumber tqdm requests
python 01_scrape_usgs.py        # USGS PDFs (26 documents)
python 01b_extract_usgs_text.py # PDF → inspectable text
python 02_scrape_comtrade.py    # UN Comtrade trade flows
python 03_scrape_oecd_sec.py    # OECD guidance + SEC CMR exhibits
python 05_chunk.py              # sliding-window chunker → chunks.jsonl
```

Open `http://localhost:5173` → Audit Dashboard → click any entity → **Ask AI**

---

## Uninstall

### Remove npm packages added for this project
```bash
cd webapp
npm uninstall @anthropic-ai/sdk express dotenv
npm uninstall --save-dev concurrently
```

### Remove Ollama models
```bash
ollama rm llama3.2
ollama rm mistral
```

### Remove Ollama itself
```bash
# Stop the service
pkill ollama

# Homebrew install
brew uninstall ollama

# Remove model data (~4 GB)
rm -rf ~/.ollama

# Remove the app if you installed via .dmg
rm -rf /Applications/Ollama.app
```

### Remove Python RAG dependencies
```bash
pip uninstall pdfplumber tqdm requests ocrmypdf pytesseract -y
```
