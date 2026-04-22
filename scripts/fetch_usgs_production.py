"""
Fetch real mine production data from USGS National Minerals Information Center.

Source: USGS Mineral Commodity Summaries (MCS) — published January each year
        https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries

Also: USGS Minerals Yearbook — more detailed, published 2 years behind
        https://www.usgs.gov/centers/national-minerals-information-center/minerals-yearbook-metals-and-minerals

Data is PUBLIC DOMAIN. No API key needed.

This script:
1. Downloads the latest MCS Excel file
2. Parses production tables for Li, Co, Ni, Mn, graphite, Cu
3. Outputs JSON ready to paste into mines.js
"""
import requests
import pandas as pd
import json
from pathlib import Path
import re

OUTPUT_DIR = Path('../data/raw')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Direct download URLs for MCS data files (updated annually by USGS)
# Check https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries
# for the latest year's files
MCS_FILES = {
    'Li': {
        'url': 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-lithium.xlsx',
        'sheet': 'T1',
        'commodity': 'Lithium',
        'unit': 'kt LCE',
    },
    'Co': {
        'url': 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-cobalt.xlsx',
        'sheet': 'T1',
        'commodity': 'Cobalt',
        'unit': 'kt',
    },
    'Ni': {
        'url': 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-nickel.xlsx',
        'sheet': 'T1',
        'commodity': 'Nickel',
        'unit': 'kt',
    },
    'Mn': {
        'url': 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-manganese.xlsx',
        'sheet': 'T1',
        'commodity': 'Manganese',
        'unit': 'kt',
    },
    'C': {
        'url': 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-graphite.xlsx',
        'sheet': 'T1',
        'commodity': 'Graphite (natural)',
        'unit': 'kt',
    },
    'Cu': {
        'url': 'https://pubs.usgs.gov/periodicals/mcs2024/mcs2024-copper.xlsx',
        'sheet': 'T1',
        'commodity': 'Copper',
        'unit': 'kt',
    },
}

def download_mcs(element: str, meta: dict) -> pd.DataFrame | None:
    filepath = OUTPUT_DIR / f'usgs_mcs_{element}.xlsx'

    if not filepath.exists():
        print(f"  Downloading {meta['commodity']}...")
        try:
            r = requests.get(meta['url'], timeout=60)
            r.raise_for_status()
            filepath.write_bytes(r.content)
            print(f"  Saved {filepath.name} ({len(r.content)//1024}KB)")
        except Exception as e:
            print(f"  FAILED: {e}")
            print(f"  Manual download: {meta['url']}")
            return None
    else:
        print(f"  Using cached {filepath.name}")

    try:
        # MCS tables use a specific format — production by country is usually in rows
        # Row structure varies by commodity; this handles the common pattern
        df = pd.read_excel(filepath, sheet_name=0, header=None)
        print(f"  Loaded {df.shape[0]} rows × {df.shape[1]} cols")
        return df
    except Exception as e:
        print(f"  Parse error: {e}")
        return None


def parse_production_table(df: pd.DataFrame, element: str) -> dict:
    """
    MCS production tables typically look like:

    Country     | 2022 | 2023e
    Australia   | 86   | 92
    Chile       | 39   | 44
    ...
    World total | 180  | 200

    This parser extracts country rows and year columns.
    Returns: {country: {year: kt}}
    """
    results = {}

    # Find rows that look like country data (non-empty string in col 0, numbers in other cols)
    for i, row in df.iterrows():
        cell = str(row.iloc[0]).strip()
        if not cell or cell.lower() in ('nan', 'country', 'world', 'total', 'other'):
            continue
        if any(kw in cell.lower() for kw in ['footnote', 'source', 'usgs', 'see', 'note', '--']):
            continue
        if len(cell) > 40:
            continue

        # Try to extract numeric values from remaining columns
        nums = {}
        for j in range(1, min(len(row), 6)):
            val = row.iloc[j]
            try:
                n = float(str(val).replace(',', '').replace('e', '').strip())
                if 0 < n < 100_000:
                    nums[j] = n
            except (ValueError, TypeError):
                continue

        if len(nums) >= 1:
            results[cell] = nums

    return results


def run():
    print("=== USGS MCS Production Fetcher ===\n")
    all_data = {}

    for element, meta in MCS_FILES.items():
        print(f"\n[{element}] {meta['commodity']}")
        df = download_mcs(element, meta)
        if df is not None:
            parsed = parse_production_table(df, element)
            all_data[element] = parsed
            print(f"  Found {len(parsed)} country rows")
            for country, vals in list(parsed.items())[:5]:
                print(f"    {country}: {vals}")

    # Save raw
    output_path = OUTPUT_DIR / 'usgs_production_raw.json'
    with open(output_path, 'w') as f:
        json.dump(all_data, f, indent=2)
    print(f"\nSaved raw data → {output_path}")
    print("\nManual alternative if download fails:")
    print("  1. Go to https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries")
    print("  2. Click each mineral → Download Excel")
    print("  3. Table 1 = world mine production by country, last 2 years")
    print("  4. Table 4 (some minerals) = reserves by country")


if __name__ == '__main__':
    run()
