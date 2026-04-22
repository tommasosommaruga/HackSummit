"""
Mass-balance anomaly detector.
Flag countries where exports exceed plausible supply (domestic production + legal imports).
"""
import pandas as pd
import numpy as np


def compute_mass_balance(
    trade_df: pd.DataFrame,
    production_df: pd.DataFrame,
    year: int,
    tolerance: float = 0.10,  # 10% margin for measurement error
) -> pd.DataFrame:
    """
    trade_df: columns [reporter_code, year, flow_label, qty_kg]
    production_df: columns [country_code, year, production_kg]

    Returns rows where export_kg > (production_kg + import_kg) * (1 + tolerance).
    These are laundering candidates.
    """
    t = trade_df[trade_df["year"] == year].copy()
    exports = t[t["flow_label"] == "export"].groupby("reporter_code")["qty_kg"].sum()
    imports = t[t["flow_label"] == "import"].groupby("reporter_code")["qty_kg"].sum()
    prod = production_df[production_df["year"] == year].set_index("country_code")["production_kg"]

    balance = pd.DataFrame({"exports": exports, "imports": imports, "production": prod}).fillna(0)
    balance["max_legitimate_supply"] = (balance["production"] + balance["imports"]) * (1 + tolerance)
    balance["surplus_kg"] = balance["exports"] - balance["max_legitimate_supply"]
    balance["laundering_flag"] = balance["surplus_kg"] > 0
    balance["year"] = year

    return balance[balance["laundering_flag"]].sort_values("surplus_kg", ascending=False)


def multi_year_scan(
    trade_df: pd.DataFrame,
    production_df: pd.DataFrame,
    years: list[int],
) -> pd.DataFrame:
    frames = [compute_mass_balance(trade_df, production_df, y) for y in years]
    return pd.concat(frames).reset_index()
