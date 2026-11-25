"""Pure data logic (no AI, no network): parsing, KPIs, anomaly detection, forecast.

The AI agents receive these verified numbers so they never have to do arithmetic.
"""
import io

import numpy as np
import pandas as pd

REQUIRED = ["month", "sales", "expenses"]


def parse_csv(text: str) -> pd.DataFrame:
    try:
        df = pd.read_csv(io.StringIO(text))
    except Exception as exc:  # malformed CSV
        raise ValueError("Could not read the CSV file.") from exc
    return clean(df)


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip().lower() for c in df.columns]
    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        raise ValueError("Missing column(s): " + ", ".join(missing) + ". Use month, sales, expenses.")
    df = df[REQUIRED]
    df["month"] = df["month"].astype(str).str.strip()
    df["sales"] = pd.to_numeric(df["sales"], errors="coerce")
    df["expenses"] = pd.to_numeric(df["expenses"], errors="coerce")
    df = df.dropna().reset_index(drop=True)
    if len(df) < 3:
        raise ValueError("Please provide at least 3 valid months of data.")
    if len(df) > 120:
        raise ValueError("Please provide at most 120 rows.")
    if (df["sales"] < 0).any() or (df["expenses"] < 0).any():
        raise ValueError("Sales and expenses cannot be negative.")
    return df


def summary(df: pd.DataFrame) -> dict:
    ts, te = float(df["sales"].sum()), float(df["expenses"].sum())
    first, last, prev = (float(df["sales"].iloc[i]) for i in (0, -1, -2))
    best = df.loc[df["sales"].idxmax()]
    profit = (df["sales"] - df["expenses"]).round(0).tolist()
    return {
        "months": len(df),
        "total_sales": round(ts),
        "total_expenses": round(te),
        "net_profit": round(ts - te),
        "margin_pct": round((ts - te) / ts * 100, 1) if ts else 0.0,
        "expense_ratio_pct": round(te / ts * 100, 1) if ts else 0.0,
        "best_month": str(best["month"]),
        "best_month_sales": round(float(best["sales"])),
        "sales_growth_pct": round((last - first) / first * 100, 1) if first else 0.0,
        "latest_change_pct": round((last - prev) / prev * 100, 1) if prev else 0.0,
        "monthly_profit": profit,
    }


def find_anomalies(df: pd.DataFrame) -> list[dict]:
    """Flag expenses more than 3x the median (usually an extra zero in a manual entry)."""
    exp = df["expenses"].tolist()
    median = float(np.median(exp))
    found = []
    for i, value in enumerate(exp):
        if median > 0 and value > 3 * median:
            near = [exp[j] for j in (i - 1, i + 1) if 0 <= j < len(exp)]
            found.append({"month": df["month"].iloc[i], "value": round(value), "suggested": round(sum(near) / len(near))})
    return found


def forecast(df: pd.DataFrame, months: int = 3) -> dict:
    n = len(df)
    out = {}
    for col in ("sales", "expenses"):
        slope, intercept = np.polyfit(np.arange(n), df[col].to_numpy(dtype=float), 1)
        out[col] = [max(0, round(intercept + slope * (n + k))) for k in range(months)]
    return out
