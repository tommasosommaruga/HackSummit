"""
Step 1d — Inventory & quality check.

Prints a summary table of everything in data/raw/, flags scanned PDFs
(no extractable text), and warns about any suspiciously small files.
Run this after all scrapers finish to make sure you have enough material
before moving to chunking.
"""

import pathlib, sys
import pdfplumber

ROOT = pathlib.Path(__file__).parent / "data/raw"

MIN_FILE_KB  = 5     # files smaller than this are probably errors
MIN_TEXT_LEN = 150   # chars per first page — below this = likely scanned PDF

# Source label, glob pattern, expected minimum file count
SOURCES = [
    ("USGS PDFs",         ROOT / "usgs",           "*.pdf",    5),
    ("Comtrade JSON",     ROOT / "comtrade",        "*.json",  20),
    ("Comtrade Text",     ROOT / "comtrade_text",   "*.txt",   20),
    ("OECD PDFs",         ROOT / "oecd",            "*.pdf",    2),
    ("SEC Filings",       ROOT / "sec_edgar",       "**/*.txt", 5),
    ("Misc (manual)",     ROOT / "misc",            "**/*.*",   0),
]

def check_pdf(path: pathlib.Path) -> tuple[bool, str]:
    """Return (is_text_native, note)."""
    try:
        with pdfplumber.open(path) as pdf:
            if not pdf.pages:
                return False, "empty PDF"
            text = pdf.pages[0].extract_text() or ""
            pages = len(pdf.pages)
            if len(text.strip()) < MIN_TEXT_LEN:
                return False, f"⚠ SCANNED? only {len(text)} chars on page 1 ({pages} pages)"
            return True, f"✓ text-native, {pages} pages, {len(text)} chars/p1"
    except Exception as e:
        return False, f"✗ unreadable: {e}"


def main():
    total_files = 0
    total_kb    = 0
    warnings    = []

    print("\n" + "═" * 70)
    print("  REEtrieve RAG — Document Inventory")
    print("═" * 70)

    for label, folder, pattern, min_count in SOURCES:
        files = sorted(folder.glob(pattern)) if folder.exists() else []
        kb    = sum(f.stat().st_size for f in files if f.is_file()) // 1024

        status = "✓" if len(files) >= min_count else f"⚠ (expected ≥{min_count})"
        print(f"\n  {label}")
        print(f"    {len(files)} files  |  {kb:,} KB  {status}")

        total_files += len(files)
        total_kb    += kb

        # Tiny file check
        tiny = [f for f in files if f.is_file() and f.stat().st_size < MIN_FILE_KB * 1024]
        if tiny:
            for t in tiny:
                warnings.append(f"  TINY FILE ({t.stat().st_size // 1024} KB): {t}")

    # PDF quality scan
    print("\n" + "─" * 70)
    print("  PDF Quality Scan")
    print("─" * 70)
    all_pdfs = list(ROOT.rglob("*.pdf"))
    scanned  = []
    for pdf in sorted(all_pdfs):
        is_native, note = check_pdf(pdf)
        icon = "  ✓" if is_native else "  ⚠"
        print(f"{icon}  {pdf.relative_to(ROOT)}  —  {note}")
        if not is_native:
            scanned.append(pdf)

    # Summary
    print("\n" + "═" * 70)
    print(f"  TOTAL: {total_files} files  |  {total_kb:,} KB ({total_kb/1024:.1f} MB)")
    if total_files >= 60:
        print("  ✓ Sufficient volume for RAG chunking")
    else:
        print(f"  ⚠ Low volume ({total_files} files) — consider downloading more sources")

    if warnings:
        print("\n  Warnings:")
        for w in warnings:
            print(w)

    if scanned:
        print(f"\n  {len(scanned)} scanned PDFs need OCR before chunking:")
        for p in scanned:
            print(f"    {p.relative_to(ROOT)}")
        print("  Fix:  pip install ocrmypdf  then  ocrmypdf input.pdf output.pdf")

    print("═" * 70)
    return 1 if (warnings or scanned) else 0


if __name__ == "__main__":
    sys.exit(main())
