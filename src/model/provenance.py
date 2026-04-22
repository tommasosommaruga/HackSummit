"""
Track A — Bayesian provenance model.
Given a battery manufactured in year T, estimate P(high-risk origin) based on
historical mine output, refinery throughput, and trade flow priors.
"""
import numpy as np
import pandas as pd
from dataclasses import dataclass, field


# Temporal lag: ore mined in year T-lag ends up in batteries manufactured in year T
EXTRACTION_TO_BATTERY_LAG = 2  # years (conservative; range 1–3)


@dataclass
class MinePrior:
    mine_id: str
    country: str
    risk_level: float          # 0.0 (clean) to 1.0 (high-risk ASM)
    annual_output_kg: dict     # {year: kg}  e.g. {2021: 5_000_000}


@dataclass
class ProvenanceModel:
    mines: list[MinePrior]
    lag: int = EXTRACTION_TO_BATTERY_LAG

    def _supply_share(self, manufacture_year: int) -> pd.DataFrame:
        """
        Compute each mine's share of total lithium supply
        for the extraction year corresponding to manufacture_year.
        """
        source_year = manufacture_year - self.lag
        rows = []
        for m in self.mines:
            output = m.annual_output_kg.get(source_year, 0)
            rows.append({"mine_id": m.mine_id, "risk": m.risk_level, "output_kg": output})
        df = pd.DataFrame(rows)
        total = df["output_kg"].sum()
        df["share"] = df["output_kg"] / total if total > 0 else 0
        return df

    def p_high_risk(self, manufacture_year: int, risk_threshold: float = 0.6) -> float:
        """
        P(battery contains high-risk ore) = sum of market share of mines
        with risk_level >= risk_threshold, weighted by output.
        """
        df = self._supply_share(manufacture_year)
        high_risk_share = df.loc[df["risk"] >= risk_threshold, "share"].sum()
        return float(np.clip(high_risk_share, 0.0, 1.0))

    def confidence_interval(
        self, manufacture_year: int, n_samples: int = 10_000, risk_threshold: float = 0.6
    ) -> tuple[float, float, float]:
        """
        Bootstrap CI over output uncertainty (±20% noise on each mine's annual output).
        Returns (p5, median, p95).
        """
        source_year = manufacture_year - self.lag
        samples = []
        rng = np.random.default_rng(42)
        for _ in range(n_samples):
            total = 0.0
            high_risk = 0.0
            for m in self.mines:
                base = m.annual_output_kg.get(source_year, 0)
                noisy = base * rng.uniform(0.8, 1.2)
                total += noisy
                if m.risk_level >= risk_threshold:
                    high_risk += noisy
            samples.append(high_risk / total if total > 0 else 0.0)
        arr = np.array(samples)
        return float(np.percentile(arr, 5)), float(np.median(arr)), float(np.percentile(arr, 95))

    def trust_score(self, manufacture_year: int) -> dict:
        p = self.p_high_risk(manufacture_year)
        p5, median, p95 = self.confidence_interval(manufacture_year)
        return {
            "manufacture_year": manufacture_year,
            "source_year": manufacture_year - self.lag,
            "p_high_risk": round(p, 3),
            "ci_p5": round(p5, 3),
            "ci_p95": round(p95, 3),
            "trust_score": round((1 - median) * 100, 1),  # 0–100, higher = cleaner
        }
