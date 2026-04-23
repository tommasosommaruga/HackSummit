#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
#  REEtrieve RAG — Step 1 & 2 pipeline runner
#
#  Usage:
#    chmod +x run_pipeline.sh
#    ./run_pipeline.sh
#
#  Or run individual steps:
#    python 01_scrape_usgs.py
#    python 02_scrape_comtrade.py
#    python 03_scrape_oecd_sec.py
#    python 04_inventory.py        ← quality check (run after all scrapers)
#    python 05_chunk.py            ← produces data/chunks/chunks.jsonl
# ─────────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  REEtrieve RAG Pipeline — Steps 1 & 2"
echo "═══════════════════════════════════════════════════"

# Check deps
python -c "import pdfplumber, requests, tqdm" 2>/dev/null || {
    echo "  Installing dependencies..."
    pip install -r requirements.txt -q
}

echo ""
echo "── Step 1a: USGS ──────────────────────────────────"
python 01_scrape_usgs.py

echo ""
echo "── Step 1b: UN Comtrade ───────────────────────────"
python 02_scrape_comtrade.py

echo ""
echo "── Step 1c: OECD + SEC EDGAR ──────────────────────"
python 03_scrape_oecd_sec.py

echo ""
echo "── Step 1d: Inventory & QA ────────────────────────"
python 04_inventory.py

echo ""
echo "── Step 1e: OCR scan PDFs ─────────────────────────"
python 06_ocr_pdfs.py

echo ""
echo "── Step 2: Chunk & tag ────────────────────────────"
python 05_chunk.py

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Pipeline complete."
echo "  Next: python 07_embed.py   (Step 3 — embeddings)"
echo "═══════════════════════════════════════════════════"
