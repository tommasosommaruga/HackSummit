"""
Step 1e — OCR scan all PDFs in data/raw/.

Strategy (two-pass):

  Pass 1 — ocrmypdf (fast, best quality)
    Runs on any PDF where pdfplumber extracts < MIN_CHARS_PER_PAGE chars
    on average. Adds an invisible text layer to scanned pages and writes
    an OCR'd copy to data/raw/ocr/<source>/<name>.pdf

  Pass 2 — pytesseract page-by-page fallback
    For PDFs that still yield poor text after ocrmypdf (rare — mostly
    low-DPI or multi-column scans), renders each page as a 300 DPI image
    and runs tesseract directly, saving a .txt sidecar in data/raw/ocr_text/.

After this script, the chunker (05_chunk.py) is re-run and will
automatically prefer OCR'd versions over originals.

Usage:
    python 06_ocr_pdfs.py              # only process PDFs that need OCR
    python 06_ocr_pdfs.py --all        # force re-OCR everything
    python 06_ocr_pdfs.py --check      # dry run: report which PDFs need OCR, exit
"""

import argparse, pathlib, shutil, subprocess, sys, json
import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from tqdm import tqdm

# ── config ────────────────────────────────────────────────────────────────────
RAW_ROOT      = pathlib.Path(__file__).parent / "data/raw"
OCR_ROOT      = pathlib.Path(__file__).parent / "data/raw/ocr"        # OCR'd PDFs
OCR_TEXT_ROOT = pathlib.Path(__file__).parent / "data/raw/ocr_text"   # sidecar .txt fallback
OCR_ROOT.mkdir(parents=True, exist_ok=True)
OCR_TEXT_ROOT.mkdir(parents=True, exist_ok=True)

# A page is considered "needs OCR" if average extractable chars is below this
MIN_CHARS_PER_PAGE = 80

# DPI for page-image rendering in pytesseract fallback
RENDER_DPI = 300

# ocrmypdf flags:
#   --skip-text    don't re-OCR pages that already have a text layer
#   --optimize 1   lossless image optimization
#   --language     eng is enough; add +fra or +chi_sim if needed
OCRMYPDF_FLAGS = ["--skip-text", "--optimize", "1", "--language", "eng", "--quiet"]


# ── helpers ───────────────────────────────────────────────────────────────────

def avg_chars_per_page(pdf_path: pathlib.Path) -> float:
    """Quick scan: average extractable chars per page using pdfplumber."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            if not pdf.pages:
                return 0.0
            chars = [len((p.extract_text() or "").strip()) for p in pdf.pages]
            return sum(chars) / len(chars)
    except Exception:
        return 0.0


def needs_ocr(pdf_path: pathlib.Path) -> bool:
    return avg_chars_per_page(pdf_path) < MIN_CHARS_PER_PAGE


def ocr_output_path(pdf_path: pathlib.Path) -> pathlib.Path:
    """Mirror the source subfolder structure under ocr/."""
    rel = pdf_path.relative_to(RAW_ROOT)
    out = OCR_ROOT / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    return out


def run_ocrmypdf(src: pathlib.Path, dst: pathlib.Path) -> bool:
    """Return True on success."""
    cmd = ["ocrmypdf"] + OCRMYPDF_FLAGS + [str(src), str(dst)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode not in (0, 6):   # 6 = "already has text, skipped"
        tqdm.write(f"  ✗ ocrmypdf failed on {src.name}: {result.stderr.strip()[:120]}")
        return False
    return True


def pytesseract_fallback(pdf_path: pathlib.Path) -> pathlib.Path | None:
    """
    Render every page as a 300 DPI image, run tesseract, save a .txt sidecar.
    Returns the sidecar path on success, None on failure.
    """
    try:
        images = convert_from_path(pdf_path, dpi=RENDER_DPI)
    except Exception as e:
        tqdm.write(f"  ✗ pdf2image failed on {pdf_path.name}: {e}")
        return None

    pages_text = []
    for i, img in enumerate(images, 1):
        try:
            text = pytesseract.image_to_string(img, lang="eng")
            pages_text.append(f"--- Page {i} ---\n{text.strip()}")
        except Exception as e:
            tqdm.write(f"  ✗ tesseract failed on {pdf_path.name} p{i}: {e}")
            pages_text.append(f"--- Page {i} ---\n[OCR failed]")

    rel      = pdf_path.relative_to(RAW_ROOT)
    sidecar  = OCR_TEXT_ROOT / rel.with_suffix(".txt")
    sidecar.parent.mkdir(parents=True, exist_ok=True)
    sidecar.write_text("\n\n".join(pages_text), encoding="utf-8")
    return sidecar


def verify_ocr_quality(pdf_path: pathlib.Path) -> float:
    """Re-check average chars/page after OCR."""
    return avg_chars_per_page(pdf_path)


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--all",   action="store_true", help="Force re-OCR all PDFs")
    parser.add_argument("--check", action="store_true", help="Dry run: report only")
    args = parser.parse_args()

    # Collect all PDFs in raw/ excluding the ocr/ subfolder itself
    all_pdfs = [
        p for p in sorted(RAW_ROOT.rglob("*.pdf"))
        if "ocr" not in p.parts
    ]

    if not all_pdfs:
        print("No PDFs found in data/raw/ — run the scrapers first.")
        sys.exit(0)

    # ── Pass 1: classify ──────────────────────────────────────────────────────
    print(f"\n{'═'*60}")
    print(f"  OCR Scanner — {len(all_pdfs)} PDFs found")
    print(f"{'═'*60}")
    print(f"  Scanning text density (MIN = {MIN_CHARS_PER_PAGE} chars/page)…\n")

    need, ok, results = [], [], []
    for pdf in tqdm(all_pdfs, desc="Classifying", unit="PDF"):
        avg = avg_chars_per_page(pdf)
        flag = needs_ocr(pdf) or args.all
        results.append((pdf, avg, flag))
        if flag:
            need.append(pdf)
        else:
            ok.append(pdf)

    # Print classification table
    print(f"\n  {'File':<50} {'Avg chars/pg':>13}  {'Status'}")
    print(f"  {'─'*50} {'─'*13}  {'─'*14}")
    for pdf, avg, flag in sorted(results, key=lambda x: x[1]):
        rel    = str(pdf.relative_to(RAW_ROOT))
        status = "⚠ NEEDS OCR" if flag else "✓ text-native"
        print(f"  {rel:<50} {avg:>12.0f}  {status}")

    print(f"\n  Summary: {len(ok)} text-native  |  {len(need)} need OCR")

    if args.check:
        print("\n  --check mode: no OCR performed.")
        sys.exit(0)

    if not need:
        print("\n  ✓ All PDFs are text-native. Nothing to do.")
        sys.exit(0)

    # ── Pass 2: ocrmypdf ──────────────────────────────────────────────────────
    print(f"\n{'─'*60}")
    print(f"  Pass 1 — ocrmypdf  ({len(need)} files)")
    print(f"{'─'*60}")

    still_poor = []
    with tqdm(need, desc="ocrmypdf", unit="PDF") as bar:
        for pdf in bar:
            bar.set_postfix(file=pdf.name[:30])
            dst = ocr_output_path(pdf)

            if dst.exists() and not args.all:
                tqdm.write(f"  skip (already OCR'd): {pdf.name}")
                continue

            ok_ocr = run_ocrmypdf(pdf, dst)
            if not ok_ocr:
                still_poor.append(pdf)
                continue

            # Verify quality improved
            after = verify_ocr_quality(dst)
            if after < MIN_CHARS_PER_PAGE:
                tqdm.write(f"  ⚠ still poor after ocrmypdf ({after:.0f} chars/pg): {pdf.name}")
                still_poor.append(pdf)
            else:
                tqdm.write(f"  ✓ {pdf.name}  →  {after:.0f} chars/pg")

    # ── Pass 3: pytesseract fallback for stubborn PDFs ────────────────────────
    if still_poor:
        print(f"\n{'─'*60}")
        print(f"  Pass 2 — pytesseract fallback  ({len(still_poor)} files)")
        print(f"  (renders pages as {RENDER_DPI} DPI images, slower)")
        print(f"{'─'*60}")

        with tqdm(still_poor, desc="tesseract", unit="PDF") as bar:
            for pdf in bar:
                bar.set_postfix(file=pdf.name[:30])
                sidecar = pytesseract_fallback(pdf)
                if sidecar:
                    size_kb = sidecar.stat().st_size // 1024
                    tqdm.write(f"  ✓ sidecar: {sidecar.relative_to(pathlib.Path(__file__).parent)}  ({size_kb} KB)")
                else:
                    tqdm.write(f"  ✗ complete failure: {pdf.name} — manual review needed")

    # ── Update chunk sources map ──────────────────────────────────────────────
    # Write a JSON map so 05_chunk.py can prefer OCR'd versions automatically
    source_map = {}
    for pdf, avg, flag in results:
        ocr_path = ocr_output_path(pdf)
        txt_path = OCR_TEXT_ROOT / pdf.relative_to(RAW_ROOT).with_suffix(".txt")
        if flag and ocr_path.exists():
            source_map[str(pdf.relative_to(RAW_ROOT))] = str(ocr_path.relative_to(RAW_ROOT))
        elif flag and txt_path.exists():
            source_map[str(pdf.relative_to(RAW_ROOT))] = str(txt_path.relative_to(RAW_ROOT))

    map_file = pathlib.Path(__file__).parent / "data/raw/ocr_map.json"
    map_file.write_text(json.dumps(source_map, indent=2))

    print(f"\n{'═'*60}")
    print(f"  ✓ OCR complete")
    print(f"  OCR'd PDFs  →  {OCR_ROOT}")
    print(f"  TXT sidecars →  {OCR_TEXT_ROOT}")
    print(f"  Source map   →  {map_file}")
    print(f"\n  Now re-run:  python 05_chunk.py  (will use OCR'd versions)")
    print(f"{'═'*60}")


if __name__ == "__main__":
    main()
