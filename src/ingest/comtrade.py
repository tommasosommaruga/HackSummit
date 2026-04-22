"""
Fetch lithium trade flow data from UN Comtrade API.
Commodity codes: 2825 (lithium oxide/hydroxide), 2602 (lithium ores), 8507 (batteries).
"""
import os
import time
import requests
import pandas as pd

BASE_URL = "https://comtradeapi.un.org/data/v1/get"
SUBSCRIPTION_KEY = os.environ.get("COMTRADE_API_KEY", "")

LITHIUM_COMMODITIES = {
    "2825": "lithium_oxide_hydroxide",
    "2602": "lithium_ores_concentrates",
    "850760": "li_ion_batteries",
}


def fetch_trade_flows(
    reporter_code: str,
    period: str,          # e.g. "2021,2022,2023"
    commodity_code: str,
    flow: str = "X",      # X=export, M=import
) -> pd.DataFrame:
    params = {
        "typeCode": "C",
        "freqCode": "A",
        "clCode": "HS",
        "reporterCode": reporter_code,
        "period": period,
        "cmdCode": commodity_code,
        "flowCode": flow,
        "partnerCode": "0",  # world
        "subscription-key": SUBSCRIPTION_KEY,
    }
    resp = requests.get(BASE_URL, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json().get("data", [])
    return pd.DataFrame(data)


def fetch_all_commodities(reporter_code: str, years: list[int]) -> pd.DataFrame:
    period = ",".join(str(y) for y in years)
    frames = []
    for code, label in LITHIUM_COMMODITIES.items():
        for flow in ("X", "M"):
            df = fetch_trade_flows(reporter_code, period, code, flow)
            if not df.empty:
                df["commodity_label"] = label
                df["flow_label"] = "export" if flow == "X" else "import"
                frames.append(df)
            time.sleep(0.5)  # rate limit
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
