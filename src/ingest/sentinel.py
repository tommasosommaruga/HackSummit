"""
Pull Sentinel-2 imagery patches around known mine coordinates via Copernicus Data Space.
Requires: sentinelhub or direct STAC API.
"""
import os
import requests
import pandas as pd
from dataclasses import dataclass

STAC_URL = "https://catalogue.dataspace.copernicus.eu/stac/collections/SENTINEL-2/items"
TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"


@dataclass
class MineCoord:
    name: str
    lat: float
    lon: float
    country: str
    risk_level: str  # high / medium / low


def get_access_token() -> str:
    resp = requests.post(TOKEN_URL, data={
        "grant_type": "client_credentials",
        "client_id": os.environ["CDSE_CLIENT_ID"],
        "client_secret": os.environ["CDSE_CLIENT_SECRET"],
    })
    resp.raise_for_status()
    return resp.json()["access_token"]


def bbox_from_coord(lat: float, lon: float, delta: float = 0.1) -> str:
    return f"{lon - delta},{lat - delta},{lon + delta},{lat + delta}"


def query_imagery(mine: MineCoord, start: str, end: str, max_cloud: int = 20) -> list[dict]:
    """Return list of available Sentinel-2 scene metadata for a mine site."""
    params = {
        "bbox": bbox_from_coord(mine.lat, mine.lon),
        "datetime": f"{start}/{end}",
        "limit": 20,
        "filter": f"eo:cloud_cover<{max_cloud}",
    }
    resp = requests.get(STAC_URL, params=params, timeout=30)
    resp.raise_for_status()
    features = resp.json().get("features", [])
    return [
        {
            "scene_id": f["id"],
            "date": f["properties"]["datetime"][:10],
            "cloud_pct": f["properties"].get("eo:cloud_cover"),
            "mine": mine.name,
            "lat": mine.lat,
            "lon": mine.lon,
        }
        for f in features
    ]


def scenes_to_df(mines: list[MineCoord], start: str, end: str) -> pd.DataFrame:
    rows = []
    for mine in mines:
        rows.extend(query_imagery(mine, start, end))
    return pd.DataFrame(rows)
