"""
Fetch real child labor statistics from ILO ILOSTAT API.

Source: ILO ILOSTAT bulk download facility
Dataset: SDG indicator 8.7.1 — "Proportion and number of children aged 5-17 years
         engaged in child labour"
API docs: https://ilostat.ilo.org/resources/ilostat-developer-tools/

No API key required for bulk data.
"""
import requests
import pandas as pd
import json

# ILO ILOSTAT API — SDG 8.7.1 child labour indicator
# Dataset ID: SDG_0871_SEX_AGE_RT (rate by sex and age)
ILOSTAT_URL = "https://sdmx.ilo.org/rest/data/ILO,DF_SDG_0871_SEX_AGE_RT,1.0"

# Countries we care about (ISO 3166-1 alpha-2, which ILO uses)
TARGET_COUNTRIES = {
    'CD': 'COD',  # DRC
    'ZM': 'ZMB',  # Zambia
    'ZW': 'ZWE',  # Zimbabwe
    'BO': 'BOL',  # Bolivia
    'AR': 'ARG',  # Argentina
    'CL': 'CHL',  # Chile
    'ID': 'IDN',  # Indonesia
    'PH': 'PHL',  # Philippines
    'MZ': 'MOZ',  # Mozambique
    'ZA': 'ZAF',  # South Africa
    'CN': 'CHN',  # China
    'RU': 'RUS',  # Russia
    'AU': 'AUS',  # Australia
    'PT': 'PRT',  # Portugal
}

def fetch_ilo_child_labor():
    """
    Alternative: use the bulk CSV download which doesn't require auth.
    Direct URL for SDG 8.7.1:
    https://ilostat.ilo.org/bulk-download/?id=SDG_0871_SEX_AGE_RT
    """
    print("Downloading ILO SDG 8.7.1 bulk data...")

    # Bulk CSV download — no auth needed
    url = "https://www.ilo.org/shinyapps/bulkexplorer57/session/c4f10b7f6b67e3a2f4fc42ca6f5a0e4a/download/downloadData?w="

    # Simpler: use the ILOSTAT API for specific countries
    results = {}

    for iso2, iso3 in TARGET_COUNTRIES.items():
        try:
            # Filter: SEX=T (total), AGE=Y5-17, latest observation
            api_url = f"https://sdmx.ilo.org/rest/data/ILO,DF_SDG_0871_SEX_AGE_RT,1.0/{iso2}.T.Y5T17"
            resp = requests.get(api_url, headers={"Accept": "application/json"}, timeout=20)

            if resp.status_code == 200:
                data = resp.json()
                # Parse SDMX-JSON format
                series = data.get('data', {}).get('dataSets', [{}])[0].get('series', {})
                if series:
                    # Get most recent observation
                    obs = list(series.values())[0].get('observations', {})
                    if obs:
                        latest_key = max(obs.keys(), key=lambda k: int(k))
                        value = obs[latest_key][0]
                        results[iso3] = {
                            'ilo_pct': round(value, 1),
                            'country_iso2': iso2,
                        }
                        print(f"  {iso3}: {value:.1f}%")
            else:
                print(f"  {iso3}: HTTP {resp.status_code}")

        except Exception as e:
            print(f"  {iso3}: error — {e}")

    return results


def fetch_via_bulk_download():
    """
    More reliable: download the full bulk CSV from ILOSTAT.

    Steps:
    1. Go to https://ilostat.ilo.org/data/
    2. Search "SDG 8.7.1"
    3. Download → "All countries" CSV

    OR use this direct download:
    """
    # This is the direct bulk download URL for child labour rate dataset
    bulk_url = "https://www.ilo.org/ilostat-files/WEB_bulk_download/indicator/SDG_0871_SEX_AGE_RT.csv.gz"

    print(f"Downloading bulk dataset from:\n{bulk_url}\n")
    print("Run: wget -O child_labor.csv.gz '{bulk_url}' && gunzip child_labor.csv.gz")
    print("Then filter: country, sex=T (total), age=Y5T17, latest year")

    # If you have the file:
    # df = pd.read_csv('child_labor.csv')
    # df_filtered = df[
    #     (df['sex'] == 'T') &
    #     (df['classif1'] == 'AGE_5T17') &
    #     (df['ref_area'].isin(TARGET_COUNTRIES.keys()))
    # ].sort_values('time').groupby('ref_area').last()
    # return df_filtered[['ref_area', 'obs_value', 'time']].to_dict('records')


if __name__ == '__main__':
    print("=== ILO ILOSTAT Child Labor Fetcher ===\n")
    print("METHOD 1: API fetch (may be slow/rate-limited)")
    results = fetch_ilo_child_labor()

    print("\nMETHOD 2: Bulk download (recommended for production)")
    fetch_via_bulk_download()

    if results:
        print("\n=== RESULTS (paste into child_labor.js) ===")
        for iso3, data in results.items():
            print(f"  {iso3}: {data['ilo_pct']}%")

        with open('../data/raw/ilo_child_labor.json', 'w') as f:
            json.dump(results, f, indent=2)
        print("\nSaved to data/raw/ilo_child_labor.json")
