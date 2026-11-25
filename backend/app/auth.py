"""Firebase ID-token verification. The browser sends: Authorization: Bearer <token>."""
from fastapi import Depends, Header, HTTPException

from .config import settings


def current_user(authorization: str = Header(default="")) -> dict:
    if settings.auth_disabled:  # local testing only, never enable in production
        return {"uid": "dev-user", "email": "dev@local"}
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(401, "Please sign in.")
    try:
        from firebase_admin import auth

        decoded = auth.verify_id_token(token)
    except Exception:
        raise HTTPException(401, "Your login is invalid or expired. Please sign in again.")
    return {"uid": decoded["uid"], "email": decoded.get("email", "")}


def is_admin(user: dict) -> bool:
    return settings.auth_disabled or user["email"].lower() in settings.admin_emails


def admin_user(user: dict = Depends(current_user)) -> dict:
    if not is_admin(user):
        raise HTTPException(403, "Admins only.")
    return user
