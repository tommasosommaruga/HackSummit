"""
Pre-extract all PDFs in data/raw/misc/ to text files in data/text/misc/.
Same approach as 01b for USGS — avoids pdfplumber running during chunking.
"""
import pathlib, signal, sys

RAW_DIR  = pathlib.Path(__file__).parent / "data/raw/misc"
TEXT_DIR = pathlib.Path(__file__).parent / "data/text/misc"
TEXT_DIR.mkdir(parents=True, exist_ok=True)

import pdfplumber

class _Timeout(Exception):
    pass

def _handler(s, f):
    raise _Timeout()

def extract(pdf_path: pathlib.Path) -> str:
    old = signal.signal(signal.SIGALRM, _handler)
    signal.alarm(90)
    try:
        pages = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
        return "\n\n".join(pages)
    except _Timeout:
        print(f"  ⏱ timeout: {pdf_path.name}")
        return ""
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old)

pdfs = sorted(RAW_DIR.glob("*.pdf"))
print(f"Found {len(pdfs)} PDFs in {RAW_DIR}")

for i, pdf in enumerate(pdfs, 1):
    out = TEXT_DIR / (pdf.stem + ".txt")
    if out.exists():
        print(f"  [{i}/{len(pdfs)}] skip (exists): {pdf.name}")
        continue
    print(f"  [{i}/{len(pdfs)}] extracting: {pdf.name} ...", end="", flush=True)
    text = extract(pdf)
    if text:
        out.write_text(text, encoding="utf-8")
        print(f" {len(text):,} chars -> {out.name}")
    else:
        print(" [empty/failed]")

print("\nDone. Run python3 05_chunk.py next.")
