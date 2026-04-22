"""
Extract structured claims from ESG/sustainability PDF reports.
Uses pdfplumber for text extraction + regex for key claim patterns.
"""
import re
import json
from pathlib import Path
import pdfplumber

CLAIM_PATTERNS = {
    "recycled_content_pct": r"(\d{1,3})\s*%\s*recycled",
    "cobalt_certified": r"(RMAP|OECD|RMI|certified)\s+cobalt",
    "lithium_source_country": r"lithium\s+(?:sourced?|from|origin[^a-z])\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
    "child_labor_audit": r"(?:no\s+)?child\s+lab(?:or|our)\s+(?:audit|verification|program)",
    "third_party_audit": r"third.party\s+(?:audit|assessment|verification)",
}


def extract_text_by_page(pdf_path: str) -> dict[int, str]:
    with pdfplumber.open(pdf_path) as pdf:
        return {i + 1: page.extract_text() or "" for i, page in enumerate(pdf.pages)}


def extract_claims(pdf_path: str) -> dict:
    pages = extract_text_by_page(pdf_path)
    full_text = " ".join(pages.values()).lower()
    claims = {"source_file": Path(pdf_path).name, "pages": len(pages), "findings": {}}

    for claim_key, pattern in CLAIM_PATTERNS.items():
        match = re.search(pattern, full_text, re.IGNORECASE)
        claims["findings"][claim_key] = match.group(0).strip() if match else None

    return claims


def batch_extract(pdf_dir: str) -> list[dict]:
    results = []
    for pdf in Path(pdf_dir).glob("*.pdf"):
        try:
            results.append(extract_claims(str(pdf)))
        except Exception as e:
            results.append({"source_file": pdf.name, "error": str(e)})
    return results


if __name__ == "__main__":
    import sys
    results = batch_extract(sys.argv[1] if len(sys.argv) > 1 else "data/raw")
    print(json.dumps(results, indent=2))
