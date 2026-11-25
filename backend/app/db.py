"""Storage layer. Firestore in production, an in-memory store for local testing (AUTH_DISABLED=true)."""
import json
import uuid
from datetime import datetime, timedelta, timezone

from .config import settings
from .plans import PLAN_DAYS


def now() -> datetime:
    return datetime.now(timezone.utc)


class MemoryStore:
    def __init__(self):
        self.data = {"users": {}, "reports": {}, "payments": {}}

    def get_user(self, uid):
        return dict(self.data["users"].get(uid, {}))

    def set_user(self, uid, fields):
        self.data["users"].setdefault(uid, {}).update(fields)

    def add(self, col, fields):
        i = uuid.uuid4().hex[:12]
        self.data[col][i] = {**fields, "id": i}
        return i

    def get(self, col, i):
        return self.data[col].get(i)

    def update(self, col, i, fields):
        self.data[col][i].update(fields)

    def where(self, col, field=None, value=None):
        return [dict(d) for d in self.data[col].values() if field is None or d.get(field) == value]


class FirestoreStore:
    def __init__(self, client):
        self.db = client

    def get_user(self, uid):
        return self.db.collection("users").document(uid).get().to_dict() or {}

    def set_user(self, uid, fields):
        self.db.collection("users").document(uid).set(fields, merge=True)

    def add(self, col, fields):
        ref = self.db.collection(col).document()
        ref.set({**fields, "id": ref.id})
        return ref.id

    def get(self, col, i):
        doc = self.db.collection(col).document(i).get()
        return doc.to_dict() if doc.exists else None

    def update(self, col, i, fields):
        self.db.collection(col).document(i).update(fields)

    def where(self, col, field=None, value=None):
        from google.cloud.firestore_v1.base_query import FieldFilter

        q = self.db.collection(col)
        if field:
            q = q.where(filter=FieldFilter(field, "==", value))
        return [d.to_dict() for d in q.stream()]


def build_store():
    has_creds = settings.firebase_credentials_json or settings.firebase_credentials_path
    if not has_creds:
        if settings.auth_disabled:
            return MemoryStore()
        raise RuntimeError("Set FIREBASE_CREDENTIALS_JSON (or FIREBASE_CREDENTIALS_PATH), or AUTH_DISABLED=true for local testing.")
    import firebase_admin
    from firebase_admin import credentials, firestore

    if not firebase_admin._apps:
        cred = (
            credentials.Certificate(json.loads(settings.firebase_credentials_json))
            if settings.firebase_credentials_json
            else credentials.Certificate(settings.firebase_credentials_path)
        )
        firebase_admin.initialize_app(cred)
    return FirestoreStore(firestore.client())


store = build_store()


def current_plan(uid: str) -> str:
    user = store.get_user(uid)
    plan, expires = user.get("plan", "free"), user.get("plan_expires")
    if plan != "free" and expires and datetime.fromisoformat(expires) < now():
        return "free"
    return plan


def grant_plan(uid: str, plan: str) -> None:
    store.set_user(uid, {"plan": plan, "plan_expires": (now() + timedelta(days=PLAN_DAYS)).isoformat()})


def reports_used(uid: str) -> int:
    n = now()
    count = 0
    for r in store.where("reports", "uid", uid):
        d = datetime.fromisoformat(r["created"])
        count += d.year == n.year and d.month == n.month
    return count
