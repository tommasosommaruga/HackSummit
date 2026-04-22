"""
Fetch RMI (Responsible Minerals Initiative) Smelter/Refiner Audit List.

Source: https://www.responsibleminerals.org/rmap/smelter-refiner-lists/
Published: quarterly
Format: Excel, free download (registration required — free account)

This list tells you which refiners/smelters are:
  - Active/Compliant (RMAP audit passed)
  - Active/Participating (enrolled but not yet audited)
  - Suspended
  - Outreach (contacted but not enrolled)

This is the authoritative source for the `certified` boolean in mines.js
and the `audit_status` in companies.js.
"""
import requests
import pandas as pd
import json
from pathlib import Path

OUTPUT_DIR = Path('../data/raw')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Direct download URLs — update quarterly from RMI website
# Registration required: https://www.responsibleminerals.org/user/register
# After login, download links appear on: https://www.responsibleminerals.org/rmap/smelter-refiner-lists/
RMI_FILES = {
    'Co': 'https://www.responsibleminerals.org/system/files/2024-01/Cobalt_Smelter_List_January_2024.xlsx',
    'Ni': 'https://www.responsibleminerals.org/system/files/2024-01/Nickel_Smelter_List_January_2024.xlsx',
    'Sn': 'https://www.responsibleminerals.org/system/files/2024-01/Tin_Smelter_List_January_2024.xlsx',
    'Ta': 'https://www.responsibleminerals.org/system/files/2024-01/Tantalum_Smelter_List_January_2024.xlsx',
    'Au': 'https://www.responsibleminerals.org/system/files/2024-01/Gold_Smelter_List_January_2024.xlsx',
}

# Note: Lithium and Nickel are newer additions to RMAP — Li list started 2023
RMI_LI_URL = 'https://www.responsibleminerals.org/system/files/2024-01/Lithium_Refiner_List_January_2024.xlsx'

def parse_rmi_excel(filepath: Path) -> pd.DataFrame:
    """Parse standard RMI smelter list format."""
    df = pd.read_excel(filepath, sheet_name=0, header=0)
    # Normalize columns
    df.columns = [str(c).lower().strip().replace(' ', '_') for c in df.columns]

    # Key columns: smelter_name, country, audit_status (or rmap_status)
    status_col = next((c for c in df.columns if 'status' in c), None)
    name_col = next((c for c in df.columns if 'name' in c or 'smelter' in c), None)
    country_col = next((c for c in df.columns if 'country' in c), None)

    if not all([status_col, name_col, country_col]):
        print(f"  Columns found: {list(df.columns)}")
        return df

    return df[[name_col, country_col, status_col]].rename(columns={
        name_col: 'name',
        country_col: 'country',
        status_col: 'rmap_status',
    })


def run():
    print("=== RMI Smelter/Refiner Audit List Fetcher ===\n")
    print("NOTE: RMI requires free registration to download.")
    print("Register at: https://www.responsibleminerals.org/user/register\n")

    all_results = {}

    for element, url in {**RMI_FILES, 'Li': RMI_LI_URL}.items():
        filepath = OUTPUT_DIR / f'rmi_{element}_smelters.xlsx'

        if not filepath.exists():
            print(f"[{element}] Not cached. Manual download steps:")
            print(f"  1. Login to responsibleminerals.org")
            print(f"  2. Go to: https://www.responsibleminerals.org/rmap/smelter-refiner-lists/")
            print(f"  3. Download {element} list → save as {filepath}")
            print()
            continue

        print(f"[{element}] Parsing {filepath.name}...")
        df = parse_rmi_excel(filepath)
        print(f"  {len(df)} smelters found")

        compliant = df[df['rmap_status'].str.contains('Active|Compliant', case=False, na=False)]
        print(f"  {len(compliant)} active/compliant")

        all_results[element] = df.to_dict('records')

        # Show companies from our dataset
        our_companies = ['Ganfeng', 'Huayou', 'Umicore', 'Freeport', 'POSCO', 'Tianqi']
        for co in our_companies:
            match = df[df['name'].str.contains(co, case=False, na=False)]
            if len(match):
                for _, row in match.iterrows():
                    print(f"  → {co}: {row.get('rmap_status', 'unknown')}")

    if all_results:
        output_path = OUTPUT_DIR / 'rmi_smelters.json'
        with open(output_path, 'w') as f:
            json.dump(all_results, f, indent=2)
        print(f"\nSaved → {output_path}")

    print("\n=== WHAT TO DO WITH THIS DATA ===")
    print("1. Look up each company in companies.js against the RMI list")
    print("2. Update certified:true/false in mines.js based on upstream smelter status")
    print("3. Key insight: RMAP 'Active' means the SMELTER is audited,")
    print("   NOT that the mines upstream are conflict-free.")
    print("   Huayou passed RMAP but Amnesty still documented ASM child labor feeding into Huayou.")


if __name__ == '__main__':
    run()
