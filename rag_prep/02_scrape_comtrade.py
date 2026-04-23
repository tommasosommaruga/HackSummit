"""
Step 1b — UN Comtrade public preview API.

Downloads annual trade flow data (exports + imports) for battery/REE
commodity codes, then converts each JSON to a human-readable text file
so the embedder can understand the rows.

Rate limit: ~100 req/min on the public endpoint. Script sleeps 0.8 s/call.
Runtime: ~10–15 min for all combinations.
"""

import json, pathlib, time
import requests
from tqdm import tqdm

OUT_JSON = pathlib.Path(__file__).parent / "data/raw/comtrade"
OUT_TEXT = pathlib.Path(__file__).parent / "data/raw/comtrade_text"
OUT_JSON.mkdir(parents=True, exist_ok=True)
OUT_TEXT.mkdir(parents=True, exist_ok=True)

# HS commodity codes — scope: REE, Cobalt, Nickel, Tin, Tungsten
COMMODITIES = {
    # Rare Earth Elements
    "280530": "Rare earth metals, scandium and yttrium (REE metal)",
    "284690": "Rare earth compounds (REO — oxides, chlorides, carbonates)",
    # Cobalt
    "810520": "Cobalt mattes, intermediates and unwrought cobalt",
    "282200": "Cobalt oxides and hydroxides (battery precursor)",
    # Nickel
    "260400": "Nickel ores and concentrates",
    "750110": "Nickel mattes",
    "750120": "Nickel oxide sinters and intermediates",
    # Tin
    "260900": "Tin ores and concentrates",
    "800110": "Tin — unwrought, not alloyed",
    # Tungsten
    "261100": "Tungsten ores and concentrates",
    "810194": "Tungsten — unwrought, including bars and rods",
    "284190": "Tungsten compounds (APT — ammonium paratungstate)",
}

YEARS   = list(range(2018, 2025))
FLOWS   = {"X": "Exports", "M": "Imports"}

# Public preview endpoint — no API key needed, max 500 rows per call
BASE_URL = "https://comtradeapi.un.org/public/v1/preview/C/A/HS"

SESSION  = requests.Session()
SESSION.headers.update({"Accept": "application/json",
                         "User-Agent": "REEtrieve-RAG/1.0"})


def fetch(hs: str, year: int, flow: str) -> list[dict] | None:
    params = {
        "cmdCode":      hs,
        "period":       str(year),
        "reporterCode": "0",    # 0 = World aggregate
        "flowCode":     flow,
        "partnerCode":  "0",
        "includeDesc":  "true",
    }
    try:
        r = SESSION.get(BASE_URL, params=params, timeout=30)
        r.raise_for_status()
        payload = r.json()
        return payload.get("data", [])
    except Exception as e:
        return None


def rows_to_text(rows: list[dict], hs: str, label: str, year: int, flow_label: str) -> str:
    """Convert raw Comtrade rows into a narrative-style text block for embedding."""
    header = (
        f"UN Comtrade Trade Flow Report\n"
        f"Commodity: {label} (HS {hs})\n"
        f"Year: {year}  |  Flow: {flow_label}  |  Source: UN Comtrade Public API\n"
        f"{'─' * 70}\n\n"
    )
    if not rows:
        return header + "No data available for this commodity/year/flow combination.\n"

    lines = []
    for r in rows:
        reporter = r.get("reporterDesc", "?")
        partner  = r.get("partnerDesc",  "?")
        qty_kg   = r.get("netWgt")
        value_usd= r.get("primaryValue")
        period   = r.get("period", year)

        qty_str   = f"{qty_kg:,.0f} kg"   if qty_kg   else "qty unknown"
        value_str = f"${value_usd:,.0f}"  if value_usd else "value unknown"

        lines.append(
            f"In {period}, {reporter} reported {flow_label.lower()} of {label} "
            f"{'to' if flow_label == 'Exports' else 'from'} {partner}: "
            f"{qty_str} valued at {value_str}."
        )

    # Aggregate summary (useful for mass-balance detection)
    valid_qty   = [r["netWgt"]       for r in rows if r.get("netWgt")]
    valid_val   = [r["primaryValue"] for r in rows if r.get("primaryValue")]
    total_qty   = sum(valid_qty)
    total_val   = sum(valid_val)

    summary = (
        f"\nAggregate ({len(rows)} reporting entities): "
        f"total volume {total_qty:,.0f} kg, "
        f"total declared value ${total_val:,.0f} USD.\n"
    )
    return header + "\n".join(lines) + summary


def main():
    tasks = [(hs, label, year, flow, flow_label)
             for hs, label in COMMODITIES.items()
             for year in YEARS
             for flow, flow_label in FLOWS.items()]

    new, skipped, failed = 0, 0, 0

    with tqdm(tasks, desc="Comtrade", unit="req") as bar:
        for hs, label, year, flow, flow_label in bar:
            slug = f"{hs}_{flow}_{year}"
            bar.set_postfix(commodity=hs[:6], year=year, flow=flow)

            json_dest = OUT_JSON  / f"{slug}.json"
            text_dest = OUT_TEXT  / f"{slug}.txt"

            if text_dest.exists():
                skipped += 1
                continue

            rows = fetch(hs, year, flow)
            time.sleep(0.8)

            if rows is None:
                failed += 1
                continue

            # Persist raw JSON (useful for programmatic mass-balance checks)
            json_dest.write_text(json.dumps({"hs": hs, "label": label,
                                              "year": year, "flow": flow,
                                              "data": rows}, indent=2))

            # Persist readable text (for embedding)
            text_dest.write_text(rows_to_text(rows, hs, label, year, flow_label),
                                 encoding="utf-8")
            new += 1

    print(f"\n✓ Comtrade done — {new} fetched, {skipped} skipped, {failed} failed")
    print(f"  JSON → {OUT_JSON}")
    print(f"  Text → {OUT_TEXT}")


if __name__ == "__main__":
    main()
