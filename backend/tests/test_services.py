import pandas as pd
import pytest

from app import services

SAMPLE = pd.DataFrame(
    {
        "month": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        "sales": [12000, 15000, 14000, 18000, 21000, 19000],
        "expenses": [8000, 9000, 85000, 11000, 12000, 11500],
    }
)


def test_summary_totals():
    s = services.summary(SAMPLE)
    assert s["total_sales"] == 99000
    assert s["best_month"] == "May"
    assert s["net_profit"] == 99000 - 136500


def test_anomaly_is_found_with_suggestion():
    found = services.find_anomalies(SAMPLE)
    assert len(found) == 1 and found[0]["month"] == "Mar"
    assert found[0]["suggested"] == 10000


def test_no_anomaly_in_clean_data():
    fixed = SAMPLE.copy()
    fixed.loc[2, "expenses"] = 8500
    assert services.find_anomalies(fixed) == []


def test_forecast_length_and_floor():
    fc = services.forecast(SAMPLE)
    assert len(fc["sales"]) == 3 and min(fc["expenses"]) >= 0


def test_csv_validation():
    with pytest.raises(ValueError):
        services.parse_csv("month,sales\nJan,1\nFeb,2\nMar,3")
    with pytest.raises(ValueError):
        services.parse_csv("month,sales,expenses\nJan,1,1")
    assert len(services.parse_csv("Month,Sales,Expenses\nJan,10,5\nFeb,12,6\nMar,9,4")) == 3
