"""
Track B — Geo-forensic laundering hub visualization.
Builds a GeoJSON FeatureCollection of flagged countries with surplus metadata.
"""
import json
import pandas as pd

# ISO-3166 alpha-3 → approximate centroid (lon, lat) for common transit nations
COUNTRY_CENTROIDS = {
    "CHN": (104.0, 35.0),
    "COD": (24.0, -2.0),
    "ZMB": (27.0, -13.0),
    "CHL": (-71.0, -30.0),
    "ARG": (-64.0, -34.0),
    "BOL": (-65.0, -17.0),
    "AUS": (134.0, -25.0),
    "IDN": (120.0, -5.0),
    "PHL": (122.0, 12.0),
    "MYS": (112.0, 2.0),
}


def balance_to_geojson(balance_df: pd.DataFrame) -> dict:
    """
    balance_df: output of mass_balance.multi_year_scan()
    Columns expected: reporter_code (ISO-3), year, surplus_kg, exports, production, imports
    """
    features = []
    for _, row in balance_df.iterrows():
        code = row["reporter_code"]
        centroid = COUNTRY_CENTROIDS.get(code, (0.0, 0.0))
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": centroid},
            "properties": {
                "country": code,
                "year": int(row["year"]),
                "surplus_tonnes": round(row["surplus_kg"] / 1000, 1),
                "exports_tonnes": round(row["exports"] / 1000, 1),
                "production_tonnes": round(row["production"] / 1000, 1),
                "imports_tonnes": round(row["imports"] / 1000, 1),
                "laundering_flag": True,
            },
        })
    return {"type": "FeatureCollection", "features": features}


def save_geojson(balance_df: pd.DataFrame, output_path: str) -> None:
    geojson = balance_to_geojson(balance_df)
    with open(output_path, "w") as f:
        json.dump(geojson, f, indent=2)
    print(f"Saved {len(geojson['features'])} flagged countries → {output_path}")
