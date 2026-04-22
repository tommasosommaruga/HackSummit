"""
Track C — Consumer Trust Score dashboard (Streamlit).
Run: streamlit run src/ui/app.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import streamlit as st
import pandas as pd
import json

from src.model.provenance import ProvenanceModel, MinePrior
from src.model.mass_balance import multi_year_scan

st.set_page_config(page_title="Lithium Truth Score", page_icon="🔋", layout="wide")

# ── Sidebar ──────────────────────────────────────────────────────────────────
st.sidebar.title("Battery Parameters")
product_name = st.sidebar.text_input("Product / Model", value="Generic EV 2024")
manufacture_year = st.sidebar.slider("Manufacture Year", 2020, 2025, 2024)

st.sidebar.markdown("---")
st.sidebar.caption("Mine risk priors (demo data)")

# ── Demo mine data ────────────────────────────────────────────────────────────
demo_mines = [
    MinePrior("KOB_DRC_01", "COD", risk_level=0.95,
              annual_output_kg={2020: 8_000_000, 2021: 9_500_000, 2022: 10_000_000, 2023: 9_000_000}),
    MinePrior("ATL_CHL_01", "CHL", risk_level=0.15,
              annual_output_kg={2020: 12_000_000, 2021: 13_000_000, 2022: 14_000_000, 2023: 15_000_000}),
    MinePrior("PIL_ARG_01", "ARG", risk_level=0.20,
              annual_output_kg={2020: 5_000_000, 2021: 6_000_000, 2022: 7_500_000, 2023: 8_000_000}),
    MinePrior("ASM_BOL_01", "BOL", risk_level=0.80,
              annual_output_kg={2020: 2_000_000, 2021: 3_000_000, 2022: 3_500_000, 2023: 4_000_000}),
]

model = ProvenanceModel(mines=demo_mines)
result = model.trust_score(manufacture_year)

# ── Main panel ────────────────────────────────────────────────────────────────
st.title(f"🔋 {product_name}")
st.caption(f"Manufactured: {manufacture_year}  |  Ore sourced from: ~{result['source_year']}")

col1, col2, col3 = st.columns(3)
score = result["trust_score"]
color = "green" if score >= 70 else "orange" if score >= 40 else "red"

col1.metric("Trust Score", f"{score} / 100")
col2.metric("P(High-Risk Origin)", f"{result['p_high_risk']:.1%}")
col3.metric("95% CI Range", f"{result['ci_p5']:.1%} – {result['ci_p95']:.1%}")

st.markdown(f"### :{color}[{'✓ Low Risk' if score >= 70 else '⚠ Moderate Risk' if score >= 40 else '✗ High Risk'}]")

st.markdown("---")
st.subheader("Mine Supply Breakdown")
supply_df = model._supply_share(manufacture_year)
supply_df["risk_label"] = supply_df["risk"].apply(
    lambda r: "High" if r >= 0.6 else "Medium" if r >= 0.3 else "Low"
)
supply_df["output_tonnes"] = (supply_df["output_kg"] / 1000).round(1)
st.dataframe(
    supply_df[["mine_id", "risk_label", "output_tonnes", "share"]].rename(columns={
        "mine_id": "Mine", "risk_label": "Risk", "output_tonnes": "Output (t)", "share": "Market Share"
    }),
    use_container_width=True,
)

st.markdown("---")
st.subheader("How This Score Is Computed")
st.markdown("""
1. **Temporal lag**: Ore mined ~2 years before manufacture date is the likely source.
2. **Market share weighting**: Each mine's contribution proportional to annual output.
3. **Risk weighting**: ASM/conflict mines score 0.6–1.0; certified operations score 0–0.3.
4. **Bootstrap CI**: 10,000 samples with ±20% output uncertainty per mine.
5. **Trust Score** = `(1 − median_high_risk_share) × 100`
""")

st.caption("Demo data only. Replace `demo_mines` with real UN Comtrade + USGS data for production use.")
