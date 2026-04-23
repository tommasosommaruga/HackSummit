"""
Step 1a — USGS Mineral Commodity Summaries + element fact sheets.

All PDFs are text-native (no OCR needed).
Runtime: ~2 min on a decent connection.
"""

import pathlib, time, sys
import requests
from tqdm import tqdm

OUT = pathlib.Path(__file__).parent / "data/raw/usgs"
OUT.mkdir(parents=True, exist_ok=True)

HEADERS = {"User-Agent": "Mozilla/5.0 (REEtrieve-RAG-pipeline/1.0 research)"}

# Annual full reports (each ~9–14 MB, rich in production/trade tables)
ANNUAL = {f"mcs{y}": f"https://pubs.usgs.gov/periodicals/mcs{y}/mcs{y}.pdf"
          for y in range(2019, 2025)}

# Element-specific two-page fact sheets (dense, citation-ready)
# Scope: REE, Cobalt, Nickel, Tin, Tungsten only
ELEMENTS = {
    "rare-earths":  ["2022", "2023", "2024"],
    "cobalt":       ["2022", "2023", "2024"],
    "nickel":       ["2022", "2023", "2024"],
    "tin":          ["2022", "2023", "2024"],
    "tungsten":     ["2022", "2023", "2024"],
}

def build_sheet_urls():
    urls = {}
    for element, years in ELEMENTS.items():
        for year in years:
            key = f"{element.replace('-','_')}_{year}"
            urls[key] = f"https://pubs.usgs.gov/periodicals/mcs{year}/mcs{year}-{element}.pdf"
    return urls

ALL_DOCS = {**ANNUAL, **build_sheet_urls()}

def download(name: str, url: str) -> bool:
    dest = OUT / f"{name}.pdf"
    if dest.exists():
        return False   # already have it

    try:
        r = requests.get(url, headers=HEADERS, timeout=60, stream=True)
        r.raise_for_status()
        dest.write_bytes(r.content)
        return True
    except requests.HTTPError as e:
        print(f"\n  ✗ {name}: HTTP {e.response.status_code} — skipping")
        return False
    except Exception as e:
        print(f"\n  ✗ {name}: {e} — skipping")
        return False


def main():
    new, skipped = 0, 0
    with tqdm(ALL_DOCS.items(), desc="USGS PDFs", unit="file") as bar:
        for name, url in bar:
            bar.set_postfix(file=name)
            ok = download(name, url)
            if ok:
                new += 1
            else:
                skipped += 1
            time.sleep(0.8)   # polite crawl delay

    files = list(OUT.glob("*.pdf"))
    total_mb = sum(f.stat().st_size for f in files) / 1_048_576
    print(f"\n✓ USGS done — {new} new, {skipped} already present")
    print(f"  {len(files)} PDFs in {OUT}  ({total_mb:.1f} MB total)")


if __name__ == "__main__":
    main()
