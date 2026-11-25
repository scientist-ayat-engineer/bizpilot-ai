"""BizPilot AI - FastAPI backend."""
import json
import logging
from datetime import timedelta
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response, StreamingResponse
from pydantic import BaseModel, Field, model_validator

from . import services
from .auth import admin_user, current_user, is_admin
from .config import settings
from .db import current_plan, grant_plan, now, reports_used, store
from .plans import PLANS, report_limit

log = logging.getLogger("bizpilot")
app = FastAPI(title="BizPilot AI", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


# ---------- request models ----------
class Row(BaseModel):
    month: str = Field(max_length=30)
    sales: float
    expenses: float


class DataIn(BaseModel):
    rows: list[Row] | None = None
    csv: str | None = Field(default=None, max_length=200_000)

    @model_validator(mode="after")
    def one_source(self):
        if not self.rows and not self.csv:
            raise ValueError("Send either rows or csv.")
        return self

    def frame(self):
        import pandas as pd

        try:
            if self.rows:
                return services.clean(pd.DataFrame([r.model_dump() for r in self.rows]))
            return services.parse_csv(self.csv)
        except ValueError as exc:
            raise HTTPException(422, str(exc))


class ChatIn(DataIn):
    question: str = Field(min_length=1, max_length=500)


class PayIn(BaseModel):
    plan: Literal["pro", "biz"]
    method: Literal["JazzCash", "Easypaisa", "Bank transfer"]
    tid: str = Field(min_length=4, max_length=40)
    phone: str = Field(min_length=7, max_length=20)


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# ---------- basic ----------
@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/docs")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)  # the API has no icon; this stops the browser's 404 message


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/me")
def me(user: dict = Depends(current_user)):
    plan = current_plan(user["uid"])
    return {
        "email": user["email"],
        "plan": plan,
        "plan_name": PLANS[plan]["name"],
        "reports_limit": report_limit(plan),
        "reports_used": reports_used(user["uid"]),
        "is_admin": is_admin(user),
    }


@app.get("/api/plans")
def plans():
    return PLANS


# ---------- analysis ----------
@app.post("/api/analyze")
async def analyze(body: DataIn, user: dict = Depends(current_user)):
    from .agents import stream_analysis

    df = body.frame()
    uid = user["uid"]
    plan = current_plan(uid)
    if reports_used(uid) >= report_limit(plan):
        raise HTTPException(402, f"You have used all reports on the {PLANS[plan]['name']} plan this month. Please upgrade.")

    facts, anomalies, fc = services.summary(df), services.find_anomalies(df), services.forecast(df)

    async def events():
        messages = []
        try:
            async for msg in stream_analysis(df.to_string(index=False), facts, anomalies):
                messages.append(msg)
                yield sse("agent", msg)
            report_id = store.add(
                "reports",
                {
                    "uid": uid,
                    "created": now().isoformat(),
                    "title": f"Executive report, {df['month'].iloc[0]} to {df['month'].iloc[-1]}",
                    "facts": facts,
                    "anomalies": anomalies,
                    "forecast": fc,
                    "messages": messages,
                },
            )
            yield sse("done", {"report_id": report_id, "facts": facts, "anomalies": anomalies, "forecast": fc})
        except Exception:
            log.exception("analysis failed")
            yield sse("error", {"message": "The AI team could not finish. Please try again in a moment."})

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/api/chat")
async def chat(body: ChatIn, user: dict = Depends(current_user)):
    from .agents import chat_answer

    df = body.frame()
    try:
        answer = await chat_answer(body.question, df.to_string(index=False), services.summary(df))
    except Exception:
        log.exception("chat failed")
        raise HTTPException(502, "The assistant is unavailable right now. Please try again.")
    return {"answer": answer}


@app.get("/api/reports")
def my_reports(user: dict = Depends(current_user)):
    rows = store.where("reports", "uid", user["uid"])
    rows.sort(key=lambda r: r["created"], reverse=True)
    return rows[:20]


# ---------- billing (manual JazzCash / Easypaisa / bank transfer, verified by an admin) ----------
@app.post("/api/payments", status_code=201)
def submit_payment(body: PayIn, user: dict = Depends(current_user)):
    tid = body.tid.strip()
    if any(p["tid"].lower() == tid.lower() for p in store.where("payments")):
        raise HTTPException(409, "This transaction ID was already submitted.")
    pid = store.add(
        "payments",
        {
            "uid": user["uid"],
            "email": user["email"],
            "plan": body.plan,
            "amount": PLANS[body.plan]["price"],
            "method": body.method,
            "tid": tid,
            "phone": body.phone.strip(),
            "status": "pending",
            "created": now().isoformat(),
        },
    )
    return {"id": pid, "status": "pending"}


@app.get("/api/payments")
def my_payments(user: dict = Depends(current_user)):
    return sorted(store.where("payments", "uid", user["uid"]), key=lambda p: p["created"], reverse=True)


@app.get("/api/admin/payments")
def admin_payments(status: str = "pending", _: dict = Depends(admin_user)):
    rows = [p for p in store.where("payments") if p["status"] == status]
    return sorted(rows, key=lambda p: p["created"])


def _decide(pid: str, status: str):
    p = store.get("payments", pid)
    if not p:
        raise HTTPException(404, "Payment not found.")
    if p["status"] != "pending":
        raise HTTPException(409, "This payment was already reviewed.")
    store.update("payments", pid, {"status": status, "reviewed": now().isoformat()})
    if status == "approved":
        grant_plan(p["uid"], p["plan"])
    return {"id": pid, "status": status}


@app.post("/api/admin/payments/{pid}/approve")
def approve(pid: str, _: dict = Depends(admin_user)):
    return _decide(pid, "approved")


@app.post("/api/admin/payments/{pid}/reject")
def reject(pid: str, _: dict = Depends(admin_user)):
    return _decide(pid, "rejected")