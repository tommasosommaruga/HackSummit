"""
Fetch US Department of Labor ILAB "List of Goods Produced by Child Labor or Forced Labor"

Source: https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods
Published: annually (2022 edition is latest as of 2024)
Format: Excel download, public domain

This is the authoritative list for which commodities in which countries
have documented child or forced labor in production.
"""
import requests
import pandas as pd
import json
from pathlib import Path

OUTPUT_DIR = Path('../data/raw')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Direct Excel download from DOL
# Check https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods for latest
DOL_ILAB_EXCEL_URL = "https://www.dol.gov/sites/dolgov/files/ILAB/child_labor_reports/tda2022/TVPRA_List_Of_Goods_2022.xlsx"

# Commodity keywords that map to our elements
COMMODITY_ELEMENT_MAP = {
    'cobalt': 'Co',
    'lithium': 'Li',
    'nickel': 'Ni',
    'manganese': 'Mn',
    'graphite': 'C',
    'copper': 'Cu',
    'coltan': 'Co',  # coltan = colombo-tantalite, often co-occurs with cobalt
    'tin': None,
    'gold': None,
    'tantalum': None,
}

def fetch_dol_ilab():
    filepath = OUTPUT_DIR / 'dol_ilab_2022.xlsx'

    if not filepath.exists():
        print(f"Downloading DOL ILAB list from:\n{DOL_ILAB_EXCEL_URL}\n")
        try:
            r = requests.get(DOL_ILAB_EXCEL_URL, timeout=60, headers={
                'User-Agent': 'Mozilla/5.0 (research)'
            })
            r.raise_for_status()
            filepath.write_bytes(r.content)
            print(f"Saved {filepath.name} ({len(r.content)//1024}KB)")
        except Exception as e:
            print(f"Download failed: {e}")
            print("\nManual steps:")
            print("1. Go to https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods")
            print("2. Click 'Download the Full List (Excel)'")
            print("3. Save as data/raw/dol_ilab_2022.xlsx")
            return None
    else:
        print(f"Using cached {filepath.name}")

    df = pd.read_excel(filepath, sheet_name=0)
    print(f"Loaded {len(df)} rows, columns: {list(df.columns)}")
    return df


def parse_ilab(df: pd.DataFrame) -> dict:
    """
    Returns: {country_name: [commodity1, commodity2, ...]}
    Only commodities matching COMMODITY_ELEMENT_MAP keys.
    """
    results = {}

    # Typical columns: Country, Good, Child Labor, Forced Labor
    # Normalize column names
    df.columns = [c.lower().strip().replace(' ', '_') for c in df.columns]
    print(f"Columns: {list(df.columns)}")

    country_col = next((c for c in df.columns if 'country' in c), None)
    good_col = next((c for c in df.columns if 'good' in c or 'commodity' in c), None)

    if not country_col or not good_col:
        print("Could not find country/good columns. Printing first 5 rows:")
        print(df.head())
        return results

    for _, row in df.iterrows():
        country = str(row[country_col]).strip()
        good = str(row[good_col]).strip().lower()

        if country == 'nan' or good == 'nan':
            continue

        matched_element = None
        for keyword, element in COMMODITY_ELEMENT_MAP.items():
            if keyword in good:
                matched_element = keyword
                break

        if matched_element:
            if country not in results:
                results[country] = []
            results[country].append(matched_element)

    return results


def run():
    print("=== DOL ILAB Child/Forced Labor Goods List ===\n")
    df = fetch_dol_ilab()

    if df is not None:
        flagged = parse_ilab(df)
        print(f"\nCountries with flagged mineral commodities: {len(flagged)}")
        for country, goods in sorted(flagged.items()):
            print(f"  {country}: {goods}")

        output_path = OUTPUT_DIR / 'dol_ilab_minerals.json'
        with open(output_path, 'w') as f:
            json.dump(flagged, f, indent=2)
        print(f"\nSaved → {output_path}")
        print("Use this to update dol_ilab_goods[] in child_labor.js")

    print("\n=== FULL LIST (all goods, not just minerals) ===")
    print("Interactive search: https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods")
    print("Key mineral findings from 2022 edition:")
    print("  DRC:     Cobalt ✓ (child labor), Gold ✓, Cassiterite ✓, Tantalum ✓")
    print("  Bolivia: Silver ✓ (mining broadly), Tin ✓")
    print("  Mali:    Gold ✓ (lithium mining not yet listed but governance same)")
    print("  Philippines: Gold ✓")
    print("  Note: Lithium as standalone commodity not yet on list (lobbied against)")
    print("        But informal Li mining in Bolivia falls under 'mining' category")


if __name__ == '__main__':
    run()
