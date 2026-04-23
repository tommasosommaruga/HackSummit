"""
Step 1c — OECD Due Diligence PDFs + SEC EDGAR conflict mineral filings (Form SD).

Two sources in one script because both are fast (<5 min combined).
"""

import pathlib, time, json, re
import requests
from tqdm import tqdm

OUT_OECD = pathlib.Path(__file__).parent / "data/raw/oecd"
OUT_SEC  = pathlib.Path(__file__).parent / "data/raw/sec_edgar"
OUT_OECD.mkdir(parents=True, exist_ok=True)
OUT_SEC.mkdir(parents=True, exist_ok=True)

# ── OECD ──────────────────────────────────────────────────────────────────────

OECD_DOCS = {
    "oecd_dd_guidance_minerals_ed3":
        "https://www.oecd.org/daf/inv/mne/OECD-Due-Diligence-Guidance-Minerals-Edition3.pdf",
    "oecd_cobalt_supplement":
        "https://mneguidelines.oecd.org/cobalt-supplement-OECD-due-diligence-guidance-mineral-supply-chains.pdf",
    "oecd_tin_tantalum_tungsten_gold":
        "https://mneguidelines.oecd.org/mining.htm",   # landing page only, PDF linked manually
    "oecd_garment_sector_dd":   # useful as cross-sector template comparison
        "https://mneguidelines.oecd.org/OECD-Due-Diligence-Guidance-Garment-Footwear.pdf",
    "oecd_responsible_business_conduct":
        "https://www.oecd.org/investment/due-diligence-guidance-for-responsible-business-conduct.htm",
}

# Only the direct PDF links are downloadable automatically
OECD_PDFS = {k: v for k, v in OECD_DOCS.items() if v.endswith(".pdf")}

HEADERS_GENERIC = {"User-Agent": "Mozilla/5.0 (REEtrieve-RAG/1.0 research@hackathon.dev)"}


def download_pdf(name: str, url: str, out_dir: pathlib.Path) -> bool:
    dest = out_dir / f"{name}.pdf"
    if dest.exists():
        return False
    try:
        r = requests.get(url, headers=HEADERS_GENERIC, timeout=90, stream=True)
        r.raise_for_status()
        dest.write_bytes(r.content)
        return True
    except Exception as e:
        print(f"\n  ✗ {name}: {e}")
        return False


def scrape_oecd():
    print("\n── OECD PDFs ────────────────────────────────")
    new = 0
    for name, url in tqdm(OECD_PDFS.items(), desc="OECD", unit="file"):
        ok = download_pdf(name, url, OUT_OECD)
        new += int(ok)
        time.sleep(1.0)

    # Reminder for manual downloads
    MANUAL = [
        "OECD 3TG supplement (tin, tantalum, tungsten, gold):",
        "  https://mneguidelines.oecd.org/mining.htm  →  download the '3T+G Supplement' PDF",
        "RMI RMAP Audit Protocol:",
        "  https://www.responsiblemineralsinitiative.org/auditing-tools/rmap-audit-protocols/",
        "  Download the 'RMAP Standard' and 'Smelter Audit Protocol' PDFs → save to data/raw/misc/",
        "Global Witness — Congo Cobalt report:",
        "  https://www.globalwitness.org/en/campaigns/democratic-republic-congo/",
        "  Download 2–3 most recent reports → save to data/raw/misc/",
    ]
    print("\n  ⚠ Manual downloads needed (blocked to bots):")
    for line in MANUAL:
        print(f"    {line}")

    print(f"\n✓ OECD done — {new} auto-downloaded")


# ── SEC EDGAR ──────────────────────────────────────────────────────────────────
# Form SD = Specialized Disclosure — companies must file annually about conflict minerals
# Full-text search API: https://efts.sec.gov/LATEST/search-index

EDGAR_SEARCH = "https://efts.sec.gov/LATEST/search-index"
EDGAR_FILE   = "https://www.sec.gov/cgi-bin/browse-edgar"

# EDGAR requires a real User-Agent per their robots.txt
EDGAR_HEADERS = {
    "User-Agent": "REEtrieve-hackathon contact@hackathon.dev",
    "Accept-Encoding": "gzip, deflate",
    "Host": "efts.sec.gov",
}

TARGET_COMPANIES = {
    # CIK numbers for major battery / EV / electronics manufacturers
    "tesla":        "0001318605",
    "apple":        "0000320193",
    "ford":         "0000037996",
    "gm":           "0000040730",
    "qualcomm":     "0000804328",
    "intel":        "0000050863",
    "microsoft":    "0000789019",
    "samsung_elec": None,   # Korean, files on DART not EDGAR
    "lg_energy":    None,   # Korean, not SEC-registered
}


def search_form_sd(cik: str, company: str) -> list[dict]:
    """Return list of Form SD filing metadata for a given CIK."""
    params = {
        "action":   "getcompany",
        "CIK":      cik,
        "type":     "SD",
        "dateb":    "",
        "owner":    "include",
        "count":    "10",
        "search_text": "",
        "output":   "atom",
    }
    try:
        r = requests.get(EDGAR_FILE, params=params,
                         headers={"User-Agent": "REEtrieve-hackathon contact@hackathon.dev"},
                         timeout=20)
        r.raise_for_status()
        # Parse accession numbers from the Atom feed (simple regex, no XML parser needed)
        accessions = re.findall(r'(\d{10}-\d{2}-\d{6})', r.text)
        return list(dict.fromkeys(accessions))[:5]   # dedupe, cap at 5 filings
    except Exception as e:
        print(f"\n  ✗ {company}: search failed — {e}")
        return []


def _pick_exhibit_url(index_html: str) -> str | None:
    """
    From a Form SD filing index, prefer Exhibit 1.01 (the actual Conflict
    Minerals Report) over the cover SD form.  Falls back to the first .htm/.pdf.

    Exhibit 1.01 filenames vary across companies/years:
      ex1-01.htm  ex101.htm  exhibit101.htm  ex1_01.htm  cmr.htm  ex1.htm
    """
    # Collect all archive links with their surrounding label text
    # EDGAR index rows look like:  <td>Exhibit 1.01</td> ... <a href="/Archives/...">
    rows = re.findall(
        r'(exhibit\s*1[\.\-_]?01|conflict\s*mineral|ex\s*1[\.\-_]?01|ex101|cmr)',
        index_html, re.I
    )
    if rows:
        # Find links near those keywords
        # Simpler: just search filenames for exhibit patterns
        exhibit_links = re.findall(
            r'href="(/Archives/edgar/data/[^"]*(?:ex1[\-_\.]?01|exhibit1[\-_\.]?01|cmr|conflictmineral)[^"]*\.(htm|pdf))"',
            index_html, re.I
        )
        if exhibit_links:
            return "https://www.sec.gov" + exhibit_links[0][0]

    # Fallback: second document in the index (first is always the SD cover)
    all_links = re.findall(r'href="(/Archives/edgar/data/[^"]+\.(htm|pdf))"', index_html, re.I)
    if len(all_links) >= 2:
        return "https://www.sec.gov" + all_links[1][0]   # skip cover, take exhibit
    if all_links:
        return "https://www.sec.gov" + all_links[0][0]   # only one doc — use it
    return None


def download_sd_filing(cik: str, accession: str, company: str) -> bool:
    """
    Download Exhibit 1.01 (Conflict Minerals Report) from an SD filing.
    The Form SD cover page alone is useless — it just says 'see exhibit 1.01'.
    """
    clean_acc = accession.replace("-", "")
    index_url = (
        f"https://www.sec.gov/Archives/edgar/data/"
        f"{cik.lstrip('0')}/{clean_acc}/{accession}-index.htm"
    )
    dest_dir = OUT_SEC / company
    dest_dir.mkdir(exist_ok=True)
    dest = dest_dir / f"{accession}.txt"

    if dest.exists():
        return False

    sec_headers = {"User-Agent": "REEtrieve-hackathon contact@hackathon.dev"}

    try:
        r = requests.get(index_url, headers=sec_headers, timeout=20)
        r.raise_for_status()

        doc_url = _pick_exhibit_url(r.text)
        if not doc_url:
            return False

        r2 = requests.get(doc_url, headers=sec_headers, timeout=30)
        r2.raise_for_status()

        # Strip HTML, collapse whitespace
        clean = re.sub(r'<[^>]+>', ' ', r2.text)
        clean = re.sub(r'&#\d+;|&[a-z]+;', ' ', clean)   # HTML entities
        clean = re.sub(r'\s{3,}', '\n\n', clean).strip()

        dest.write_text(
            f"SEC Form SD — Conflict Minerals Report (Exhibit 1.01)\n"
            f"Company: {company.upper()}  |  Filing: {accession}\n"
            f"Source: {doc_url}\n"
            f"{'─' * 70}\n\n"
            + clean,
            encoding="utf-8",
        )
        return True

    except Exception as e:
        print(f"\n  ✗ {company}/{accession}: {e}")
        return False


def scrape_sec():
    print("\n── SEC EDGAR Form SD ────────────────────────")
    new, skipped = 0, 0

    for company, cik in tqdm(TARGET_COMPANIES.items(), desc="SEC EDGAR", unit="company"):
        if cik is None:
            continue

        accessions = search_form_sd(cik, company)
        time.sleep(0.6)

        for acc in accessions:
            ok = download_sd_filing(cik, acc, company)
            if ok:
                new += 1
            else:
                skipped += 1
            time.sleep(0.4)   # EDGAR rate limit: 10 req/s

    # Save a manifest
    manifest = {
        company: [f.name for f in (OUT_SEC / company).glob("*.txt")]
        for company, cik in TARGET_COMPANIES.items()
        if cik and (OUT_SEC / company).exists()
    }
    (OUT_SEC / "_manifest.json").write_text(json.dumps(manifest, indent=2))

    print(f"\n✓ SEC EDGAR done — {new} new filings, {skipped} already present")


# ── entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    scrape_oecd()
    scrape_sec()
