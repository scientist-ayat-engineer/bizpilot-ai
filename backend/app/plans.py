"""Subscription plans. Prices are in PKR per month; change them here only."""

PLAN_DAYS = 30

PLANS = {
    "free": {"name": "Free", "price": 0, "reports_per_month": 3},
    "pro": {"name": "Pro", "price": 1499, "reports_per_month": 30},
    "biz": {"name": "Business", "price": 3999, "reports_per_month": 999},
}


def report_limit(plan: str) -> int:
    return PLANS.get(plan, PLANS["free"])["reports_per_month"]
