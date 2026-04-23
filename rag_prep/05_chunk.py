"""
Step 2 — Chunking & metadata tagging.

Converts all raw documents into a single JSONL file:
  data/chunks/chunks.jsonl

Each line is one chunk:
{
  "id":          "usgs_mcs2024_p12_c2",
  "text":        "Lithium production in 2023 reached...",
  "source":      "USGS Mineral Commodity Summaries 2024",
  "source_type": "usgs",
  "year":        2024,
  "page":        12,
  "url":         "https://pubs.usgs.gov/...",
  "doc_path":    "usgs/mcs2024.pdf",
  "tokens_approx": 387
}

Chunking strategy:
  - PDFs:  extract page by page with pdfplumber, then sliding window
           (CHUNK_SIZE chars, OVERLAP chars) within each page.
           Keeps page metadata for citation.
  - Text:  paragraph-aware split, then sliding window.
  - Skip chunks < MIN_CHUNK_CHARS (noise / headers).

This metadata-rich format is what makes the RAG answers citeable —
the LLM can say "according to USGS MCS 2024, page 12...".
"""

import json, pathlib, re, hashlib, signal, sys
from typing import Iterator

# Lazy import — pdfplumber registers multiprocessing semaphores on import
# which causes a resource-tracker hang on Python 3.13 when no real TTY exists.
_pdfplumber = None
def _get_pdfplumber():
    global _pdfplumber
    if _pdfplumber is None:
        import pdfplumber as _pl
        _pdfplumber = _pl
    return _pdfplumber

def _progress(i: int, n: int, name: str):
    pct = int(i / n * 100)
    print(f"  [{i:>3}/{n}] {pct:>3}%  {name}", flush=True)


class _Timeout(Exception):
    pass

def _timeout_handler(signum, frame):
    raise _Timeout()

def extract_pdf_safe(path: pathlib.Path, meta_base: dict, timeout_secs: int = 60) -> list[dict]:
    """Extract PDF with a per-file timeout to avoid hanging on large files."""
    old = signal.signal(signal.SIGALRM, _timeout_handler)
    signal.alarm(timeout_secs)
    try:
        return list(extract_pdf(path, meta_base))
    except _Timeout:
        print(f"  ⏱ timeout ({timeout_secs}s): {path.name} — skipping")
        return []
    except Exception as e:
        print(f"  ✗ {path.name}: {e}")
        return []
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old)

# ── config ────────────────────────────────────────────────────────────────────
CHUNK_SIZE    = 1_600   # ~400 tokens (1 token ≈ 4 chars for English text)
OVERLAP       = 200     # chars overlap between consecutive chunks (context continuity)
MIN_CHUNK     = 120     # discard chunks shorter than this (table headers, page numbers)

RAW_ROOT      = pathlib.Path(__file__).parent / "data/raw"
OUT_DIR       = pathlib.Path(__file__).parent / "data/chunks"
OUT_DIR.mkdir(parents=True, exist_ok=True)
CHUNKS_FILE   = OUT_DIR / "chunks.jsonl"

# Load OCR source map produced by 06_ocr_pdfs.py (maps original → OCR'd path)
_ocr_map_file = RAW_ROOT / "ocr_map.json"
OCR_MAP: dict[str, str] = (
    json.loads(_ocr_map_file.read_text()) if _ocr_map_file.exists() else {}
)

def resolve_path(original: pathlib.Path) -> pathlib.Path:
    """Return the OCR'd version of a PDF if one exists, else the original."""
    key = str(original.relative_to(RAW_ROOT))
    if key in OCR_MAP:
        candidate = RAW_ROOT / OCR_MAP[key]
        if candidate.exists():
            return candidate
    return original


# ── helpers ───────────────────────────────────────────────────────────────────

def tokens_approx(text: str) -> int:
    return max(1, len(text) // 4)


def make_id(source_type: str, doc_name: str, page: int, chunk_idx: int) -> str:
    return f"{source_type}__{doc_name}__p{page}__c{chunk_idx}"


def sliding_window(text: str) -> list[str]:
    """Split text into overlapping chunks."""
    text = text.strip()
    if len(text) <= CHUNK_SIZE:
        return [text] if len(text) >= MIN_CHUNK else []

    chunks = []
    start  = 0
    while start < len(text):
        end   = start + CHUNK_SIZE
        chunk = text[start:end]

        # Try to break at sentence boundary to avoid mid-sentence cuts
        if end < len(text):
            # Look for last '. ' or '\n' within the last 200 chars
            break_pos = max(
                chunk.rfind(". ", len(chunk) - 200),
                chunk.rfind("\n", len(chunk) - 200),
            )
            if break_pos > len(chunk) // 2:
                chunk = chunk[:break_pos + 1]

        if len(chunk.strip()) >= MIN_CHUNK:
            chunks.append(chunk.strip())
        start += len(chunk) - OVERLAP

    return chunks


def clean_text(text: str) -> str:
    """Remove PDF extraction artefacts."""
    text = re.sub(r'\x00', '',      text)           # null bytes
    text = re.sub(r'[ \t]{3,}', '  ', text)         # runs of spaces
    text = re.sub(r'\n{4,}', '\n\n\n', text)         # excessive blank lines
    text = re.sub(r'([a-z])-\n([a-z])', r'\1\2', text)  # hyphenated line-breaks
    return text.strip()


# ── source-specific extractors ────────────────────────────────────────────────

def extract_pdf(path: pathlib.Path, meta_base: dict) -> Iterator[dict]:
    """Yield chunks from a PDF file, one per sliding window per page."""
    try:
        with _get_pdfplumber().open(path) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                raw = page.extract_text()
                if not raw:
                    continue
                text = clean_text(raw)
                for idx, chunk in enumerate(sliding_window(text)):
                    yield {
                        **meta_base,
                        "id":           make_id(meta_base["source_type"],
                                                path.stem, page_num, idx),
                        "text":         chunk,
                        "page":         page_num,
                        "chunk_index":  idx,
                        "tokens_approx": tokens_approx(chunk),
                    }
    except Exception as e:
        print(f"  ✗ PDF error {path.name}: {e}")


def extract_text_file(path: pathlib.Path, meta_base: dict) -> Iterator[dict]:
    """Yield chunks from a plain-text file."""
    try:
        raw  = path.read_text(encoding="utf-8", errors="ignore")
        text = clean_text(raw)
        for idx, chunk in enumerate(sliding_window(text)):
            yield {
                **meta_base,
                "id":           make_id(meta_base["source_type"],
                                        path.stem, 0, idx),
                "text":         chunk,
                "page":         None,
                "chunk_index":  idx,
                "tokens_approx": tokens_approx(chunk),
            }
    except Exception as e:
        print(f"  ✗ Text error {path.name}: {e}")


# ── source definitions ────────────────────────────────────────────────────────
# Each entry: (folder, glob, source_type, build_meta_fn)
# build_meta_fn(path) → dict of metadata fields

def usgs_meta(p: pathlib.Path) -> dict:
    # Infer year from filename: mcs2024.pdf → 2024, lithium_2024.pdf → 2024
    m = re.search(r'(\d{4})', p.stem)
    year = int(m.group(1)) if m else None
    element = None
    for el in ["lithium","cobalt","rare-earths","nickel","graphite","manganese","tungsten","tin"]:
        if el.replace("-","_") in p.stem or el in p.stem:
            element = el
            break
    label = f"USGS Mineral Commodity Summary {year}" + (f" — {element.title()}" if element else "")
    return {
        "source":      label,
        "source_type": "usgs",
        "year":        year,
        "element":     element,
        "url":         f"https://pubs.usgs.gov/periodicals/mcs{year}/mcs{year}.pdf",
        "doc_path":    str(p.relative_to(RAW_ROOT)),
    }

def comtrade_meta(p: pathlib.Path) -> dict:
    # Filename: 280530_X_2022.txt
    parts = p.stem.split("_")
    year  = int(parts[-1]) if parts[-1].isdigit() else None
    flow  = "Exports" if "X" in parts else "Imports"
    hs    = parts[0] if parts else ""
    return {
        "source":      f"UN Comtrade — HS {hs} {flow} {year}",
        "source_type": "comtrade",
        "year":        year,
        "hs_code":     hs,
        "flow":        flow,
        "url":         "https://comtradeplus.un.org/",
        "doc_path":    str(p.relative_to(RAW_ROOT)),
    }

def oecd_meta(p: pathlib.Path) -> dict:
    label_map = {
        "oecd_dd_guidance_minerals_ed3": "OECD Due Diligence Guidance for Responsible Supply Chains — Edition 3",
        "oecd_cobalt_supplement":        "OECD Cobalt Supplement — Due Diligence Guidance",
        "oecd_garment_sector_dd":        "OECD Due Diligence Guidance — Garment & Footwear (template reference)",
        "oecd_responsible_business_conduct": "OECD Due Diligence Guidance for Responsible Business Conduct",
    }
    return {
        "source":      label_map.get(p.stem, f"OECD Document — {p.stem}"),
        "source_type": "oecd",
        "year":        None,
        "url":         "https://www.oecd.org/daf/inv/mne/",
        "doc_path":    str(p.relative_to(RAW_ROOT)),
    }

def sec_meta(p: pathlib.Path) -> dict:
    company = p.parent.name
    return {
        "source":      f"SEC Form SD — Conflict Minerals Disclosure ({company.upper()})",
        "source_type": "sec_edgar",
        "year":        None,
        "company":     company,
        "url":         "https://www.sec.gov/cgi-bin/browse-edgar",
        "doc_path":    str(p.relative_to(RAW_ROOT)),
    }

def misc_meta(p: pathlib.Path) -> dict:
    # resolve doc_path back to raw/ regardless of whether we're reading from text/
    raw_str = str(p).replace("/data/text/misc/", "/data/raw/misc/").replace(".txt", ".pdf")
    raw_rel = pathlib.Path(raw_str)
    try:
        doc_path = str(raw_rel.relative_to(RAW_ROOT))
    except ValueError:
        doc_path = p.name
    return {
        "source":      f"External Report — {p.stem.replace('_',' ').title()}",
        "source_type": "misc",
        "year":        None,
        "url":         "",
        "doc_path":    doc_path,
    }


TEXT_ROOT = pathlib.Path(__file__).parent / "data/text"

def usgs_text_meta(p: pathlib.Path) -> dict:
    """Meta for pre-extracted USGS .txt files (produced by 01b_extract_usgs_text.py)."""
    return usgs_meta(pathlib.Path(str(p).replace("data/text/", "data/raw/").replace(".txt", ".pdf")))

# Names of misc PDFs that have been pre-extracted to data/text/misc/
_misc_text_dir = TEXT_ROOT / "misc"
_misc_pre_extracted = {p.stem for p in _misc_text_dir.glob("*.txt")} if _misc_text_dir.exists() else set()

def _misc_pdf_files():
    """Yield misc PDFs that have NOT been pre-extracted to data/text/misc/."""
    pdf_dir = RAW_ROOT / "misc"
    if not pdf_dir.exists():
        return
    for p in sorted(pdf_dir.glob("**/*.pdf")):
        if p.stem not in _misc_pre_extracted:
            yield p

SOURCES = [
    # Pre-extracted USGS text (fast, no pdfplumber needed)
    (TEXT_ROOT/"usgs",       "*.txt",    False,  usgs_text_meta),
    # Pre-extracted misc civil society reports (produced by 01c_extract_misc_text.py)
    (TEXT_ROOT/"misc",       "*.txt",    False,  misc_meta),
    # SEC filings and trade data (text only)
    (RAW_ROOT/"oecd",        "*.pdf",    True,   oecd_meta),
    (RAW_ROOT/"sec_edgar",   "**/*.txt", False,  sec_meta),
    (RAW_ROOT/"comtrade_text","*.txt",   False,  comtrade_meta),
    # misc web-scraped .txt (not PDFs — those are in text/misc already)
    (RAW_ROOT/"misc",        "**/*.txt", False,  misc_meta),
]
# _misc_pdf_files() used below in main() for any PDFs not yet pre-extracted


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    all_files = []
    for folder, glob, is_pdf, meta_fn in SOURCES:
        if folder.exists():
            all_files.extend((p, is_pdf, meta_fn) for p in sorted(folder.glob(glob))
                             if p.is_file() and p.name != "_manifest.json")
    # Add any misc PDFs not yet pre-extracted to text/
    for p in _misc_pdf_files():
        all_files.append((p, True, misc_meta))

    print(f"\n✓ Found {len(all_files)} source files to chunk\n")

    stats = {"files": 0, "chunks": 0, "tokens": 0, "skipped": 0}
    seen_ids = set()

    n = len(all_files)
    with open(CHUNKS_FILE, "w", encoding="utf-8") as out:
        for i, (path, is_pdf, meta_fn) in enumerate(all_files, 1):
            _progress(i, n, path.name)

            actual_path = resolve_path(path) if is_pdf else path
            if actual_path != path:
                print(f"    → using OCR'd: {actual_path.name}", flush=True)
            meta_base = meta_fn(path)
            extractor = extract_pdf if is_pdf else extract_text_file
            path = actual_path

            file_chunks = 0
            chunks_iter = (
                extract_pdf_safe(path, meta_base) if is_pdf
                else extractor(path, meta_base)
            )
            for chunk in chunks_iter:
                content_hash = hashlib.md5(chunk["text"].encode()).hexdigest()[:8]
                if content_hash in seen_ids:
                    stats["skipped"] += 1
                    continue
                seen_ids.add(content_hash)

                out.write(json.dumps(chunk, ensure_ascii=False) + "\n")
                file_chunks      += 1
                stats["chunks"]  += 1
                stats["tokens"]  += chunk["tokens_approx"]

            if not file_chunks:
                print(f"    ⚠ No chunks: {path.name}", flush=True)

    # Breakdown by source type
    print(f"\n{'═' * 55}")
    print(f"  Chunks written: {stats['chunks']:,}  to {CHUNKS_FILE}")
    print(f"  Source files:   {stats['files']:,}")
    print(f"  Approx tokens:  {stats['tokens']:,}  (~{stats['tokens']//1000}k)")
    print(f"  Duplicates:     {stats['skipped']:,}")

    # Per-source breakdown
    with open(CHUNKS_FILE, encoding="utf-8") as f:
        by_type: dict[str, int] = {}
        for line in f:
            st = json.loads(line).get("source_type", "?")
            by_type[st] = by_type.get(st, 0) + 1

    print(f"\n  By source type:")
    for st, count in sorted(by_type.items(), key=lambda x: -x[1]):
        bar = "█" * (count // max(1, max(by_type.values()) // 30))
        print(f"    {st:<18} {count:>6}  {bar}")
    print("═" * 55)

    if stats["chunks"] < 200:
        print("\n  ⚠ Low chunk count — add more documents before embedding.")
    else:
        print(f"\n  ✓ Ready for Step 3: embedding  →  python 06_embed.py")


if __name__ == "__main__":
    main()
