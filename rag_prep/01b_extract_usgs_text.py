"""
Step 1b — Extract USGS PDFs to plain text for inspection and chunking.

Reads every PDF in data/raw/usgs/ with pdfplumber and writes a .txt
file to data/text/usgs/.  Text files are human-readable and let you
verify the RAG corpus before running the chunker.

Runtime: ~30 seconds for the full USGS corpus.
"""

import pathlib
import pdfplumber
from tqdm import tqdm

IN_DIR  = pathlib.Path(__file__).parent / "data/raw/usgs"
OUT_DIR = pathlib.Path(__file__).parent / "data/text/usgs"
OUT_DIR.mkdir(parents=True, exist_ok=True)

def extract_pdf(pdf_path: pathlib.Path) -> str:
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            text = page.extract_text() or ""
            if text.strip():
                pages.append(f"--- Page {i} ---\n{text.strip()}")
    return "\n\n".join(pages)

def main():
    pdfs = sorted(IN_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs found in {IN_DIR}")
        return

    new, skipped, failed = 0, 0, 0

    with tqdm(pdfs, desc="USGS text extraction", unit="pdf") as bar:
        for pdf_path in bar:
            bar.set_postfix(file=pdf_path.stem)
            out_path = OUT_DIR / (pdf_path.stem + ".txt")

            if out_path.exists():
                skipped += 1
                continue

            try:
                text = extract_pdf(pdf_path)
                if not text.strip():
                    tqdm.write(f"  ⚠ empty: {pdf_path.name}")
                    failed += 1
                    continue

                header = (
                    f"USGS Mineral Commodity Document\n"
                    f"File: {pdf_path.name}\n"
                    f"Extracted by: pdfplumber\n"
                    f"{'─' * 70}\n\n"
                )
                out_path.write_text(header + text, encoding="utf-8")
                new += 1
            except Exception as e:
                tqdm.write(f"  ✗ {pdf_path.name}: {e}")
                failed += 1

    total_chars = sum(p.stat().st_size for p in OUT_DIR.glob("*.txt"))
    print(f"\n✓ USGS text done — {new} extracted, {skipped} skipped, {failed} failed")
    print(f"  {len(list(OUT_DIR.glob('*.txt')))} text files in {OUT_DIR}")
    print(f"  Total size: {total_chars / 1_048_576:.1f} MB")

    # Quick content check — show first 300 chars of one file
    samples = sorted(OUT_DIR.glob("*.txt"))
    if samples:
        sample = samples[0]
        print(f"\n── Sample: {sample.name} ──")
        print(sample.read_text(encoding="utf-8")[:400])

if __name__ == "__main__":
    main()
