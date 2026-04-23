"""
Step 2 — Chunking & metadata tagging.
Converts all raw documents into data/chunks/chunks.jsonl
"""

import json, pathlib, re, hashlib, sys
from typing import Iterator

# ── config ────────────────────────────────────────────────────────────────────
CHUNK_SIZE  = 1_600
OVERLAP     = 200
MIN_CHUNK   = 120

RAW_ROOT    = pathlib.Path(__file__).parent / "data/raw"
TEXT_ROOT   = pathlib.Path(__file__).parent / "data/text"
OUT_DIR     = pathlib.Path(__file__).parent / "data/chunks"
OUT_DIR.mkdir(parents=True, exist_ok=True)
CHUNKS_FILE = OUT_DIR / "chunks.jsonl"

# Pre-compiled regexes
_RE_NULL   = re.compile(r'\x00')
_RE_SPACES = re.compile(r'[ \t]{3,}')
_RE_LINES  = re.compile(r'\n{4,}')
_RE_HYPHEN = re.compile(r'([a-z])-\n([a-z])')


# ── helpers ───────────────────────────────────────────────────────────────────

def tokens_approx(text: str) -> int:
    return max(1, len(text) // 4)

def make_id(source_type: str, doc_name: str, page, chunk_idx: int) -> str:
    return f"{source_type}__{doc_name}__p{page}__c{chunk_idx}"

def clean_text(text: str) -> str:
    text = _RE_NULL.sub('', text)
    text = _RE_SPACES.sub('  ', text)
    text = _RE_LINES.sub('\n\n\n', text)
    text = _RE_HYPHEN.sub(r'\1\2', text)
    return text.strip()

def sliding_window(text: str) -> Iterator[str]:
    text = text.strip()
    if not text:
        return
    if len(text) <= CHUNK_SIZE:
        if len(text) >= MIN_CHUNK:
            yield text
        return
    start = 0
    while start < len(text):
        end   = start + CHUNK_SIZE
        chunk = text[start:end]
        if end < len(text):
            bp = max(chunk.rfind(". ", len(chunk) - 200),
                     chunk.rfind("\n",  len(chunk) - 200))
            if bp > len(chunk) // 2:
                chunk = chunk[:bp + 1]
        advance = max(1, len(chunk) - OVERLAP)  # use pre-strip length to guarantee forward progress
        chunk = chunk.strip()
        if len(chunk) >= MIN_CHUNK:
            yield chunk
        start += advance


# ── metadata builders ─────────────────────────────────────────────────────────

def usgs_meta(p: pathlib.Path) -> dict:
    m    = re.search(r'(\d{4})', p.stem)
    year = int(m.group(1)) if m else None
    el   = next((e for e in ["lithium","cobalt","rare-earths","nickel",
                              "graphite","manganese","tungsten","tin"]
                 if e.replace("-","_") in p.stem or e in p.stem), None)
    label = f"USGS Mineral Commodity Summary {year}" + (f" — {el.title()}" if el else "")
    return {"source": label, "source_type": "usgs", "year": year, "element": el,
            "url": f"https://pubs.usgs.gov/periodicals/mcs{year}/mcs{year}.pdf",
            "doc_path": str(p.relative_to(RAW_ROOT))}

def usgs_text_meta(p: pathlib.Path) -> dict:
    return usgs_meta(pathlib.Path(str(p).replace("data/text/", "data/raw/").replace(".txt", ".pdf")))

def sec_meta(p: pathlib.Path) -> dict:
    company = p.parent.name
    return {"source": f"SEC Form SD — Conflict Minerals Disclosure ({company.upper()})",
            "source_type": "sec_edgar", "year": None, "company": company,
            "url": "https://www.sec.gov/cgi-bin/browse-edgar",
            "doc_path": str(p.relative_to(RAW_ROOT))}

def comtrade_meta(p: pathlib.Path) -> dict:
    parts = p.stem.split("_")
    year  = int(parts[-1]) if parts[-1].isdigit() else None
    flow  = "Exports" if "X" in parts else "Imports"
    return {"source": f"UN Comtrade — HS {parts[0]} {flow} {year}",
            "source_type": "comtrade", "year": year, "hs_code": parts[0], "flow": flow,
            "url": "https://comtradeplus.un.org/",
            "doc_path": str(p.relative_to(RAW_ROOT))}

def misc_meta(p: pathlib.Path) -> dict:
    raw_str = str(p).replace("/data/text/misc/", "/data/raw/misc/").replace(".txt", ".pdf")
    try:
        doc_path = str(pathlib.Path(raw_str).relative_to(RAW_ROOT))
    except ValueError:
        doc_path = p.name
    return {"source": f"External Report — {p.stem.replace('_',' ').title()}",
            "source_type": "misc", "year": None, "url": "", "doc_path": doc_path}


# ── worker (runs in subprocess) ───────────────────────────────────────────────

def iter_file_chunks(args: tuple):
    path_str, meta_fn_name, is_pdf = args
    path    = pathlib.Path(path_str)
    meta_fn = globals()[meta_fn_name]
    meta    = meta_fn(path)

    if is_pdf:
        try:
            import pdfplumber
            with pdfplumber.open(path) as pdf:
                for pg_num, pg in enumerate(pdf.pages, 1):
                    raw = pg.extract_text()
                    if not raw:
                        continue
                    text = clean_text(raw)
                    del raw
                    for idx, chunk in enumerate(sliding_window(text)):
                        yield {**meta,
                               "id": make_id(meta["source_type"], path.stem, pg_num, idx),
                               "text": chunk, "page": pg_num, "chunk_index": idx,
                               "tokens_approx": tokens_approx(chunk)}
        except Exception as e:
            print(f"  ✗ PDF {path.name}: {e}", flush=True)
        return

    try:
        raw  = path.read_text(encoding="utf-8", errors="ignore")
        text = clean_text(raw)
        del raw
        for idx, chunk in enumerate(sliding_window(text)):
            yield {**meta,
                   "id": make_id(meta["source_type"], path.stem, 0, idx),
                   "text": chunk, "page": None, "chunk_index": idx,
                   "tokens_approx": tokens_approx(chunk)}
    except Exception as e:
        print(f"  ✗ {path.name}: {e}", flush=True)


# ── file collection ───────────────────────────────────────────────────────────

_misc_pre = {p.stem for p in (TEXT_ROOT/"misc").glob("*.txt")} \
            if (TEXT_ROOT/"misc").exists() else set()

SOURCES = [
    (TEXT_ROOT/"usgs",        "*.txt",    False, "usgs_text_meta"),
    (TEXT_ROOT/"misc",        "*.txt",    False, "misc_meta"),
    (RAW_ROOT/"sec_edgar",    "**/*.txt", False, "sec_meta"),
    (RAW_ROOT/"comtrade_text","*.txt",    False, "comtrade_meta"),
    (RAW_ROOT/"misc",         "**/*.txt", False, "misc_meta"),
]

def collect_files() -> list[tuple]:
    files = []
    seen  = set()
    for folder, glob, is_pdf, fn_name in SOURCES:
        if not folder.exists():
            continue
        for p in sorted(folder.glob(glob)):
            if not p.is_file() or p.name == "_manifest.json":
                continue
            key = p.stem
            if key in seen:          # skip raw/misc txt if already in text/misc
                continue
            seen.add(key)
            files.append((str(p), fn_name, is_pdf))
    # any misc PDFs not yet pre-extracted
    misc_pdf = RAW_ROOT / "misc"
    if misc_pdf.exists():
        for p in sorted(misc_pdf.glob("**/*.pdf")):
            if p.stem not in _misc_pre:
                files.append((str(p), "misc_meta", True))
    return files


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    print("Collecting files...", flush=True)
    files = collect_files()
    n     = len(files)
    print(f"✓ {n} source files\n", flush=True)

    seen_hashes : set[str] = set()
    total_chunks = total_tokens = skipped = 0

    with open(CHUNKS_FILE, "w", encoding="utf-8") as out:
        for i, f in enumerate(files, 1):
            name = pathlib.Path(f[0]).name
            pct  = int(i / n * 100)
            file_chunks = 0
            for chunk in iter_file_chunks(f):
                h = hashlib.md5(chunk["text"].encode()).hexdigest()[:8]
                if h in seen_hashes:
                    skipped += 1
                    continue
                seen_hashes.add(h)
                out.write(json.dumps(chunk, ensure_ascii=False) + "\n")
                total_chunks += 1
                total_tokens += chunk["tokens_approx"]
                file_chunks += 1
            print(f"  [{i:>3}/{n}] {pct:>3}%  +{file_chunks:>4} chunks  {name}", flush=True)

    # breakdown
    by_type: dict[str, int] = {}
    with open(CHUNKS_FILE, encoding="utf-8") as f:
        for line in f:
            st = json.loads(line).get("source_type", "?")
            by_type[st] = by_type.get(st, 0) + 1

    mx = max(by_type.values()) if by_type else 1
    print(f"\n{'═'*55}")
    print(f"  Chunks written : {total_chunks:,}  →  {CHUNKS_FILE}")
    print(f"  Approx tokens  : {total_tokens:,}  (~{total_tokens//1000}k)")
    print(f"  Duplicates     : {skipped:,}")
    print(f"\n  By source type:")
    for st, c in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"    {st:<18} {c:>6}  {'█' * (c // max(1, mx // 30))}")
    print(f"{'═'*55}")
    print(f"\n  ✓ Ready →  python 06_embed.py")


if __name__ == "__main__":
    main()
