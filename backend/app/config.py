"""Central settings, read once from environment variables (.env in local development)."""
import os

from dotenv import load_dotenv

load_dotenv()


def _list(name: str, default: str = "") -> list[str]:
    return [x.strip() for x in os.getenv(name, default).split(",") if x.strip()]


class Settings:
    # Groq (OpenAI-compatible endpoint)
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_model: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    groq_base_url: str = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")

    # Auth / storage
    auth_disabled: bool = os.getenv("AUTH_DISABLED", "false").lower() == "true"  # local testing only
    admin_emails: set[str] = {e.lower() for e in _list("ADMIN_EMAILS")}
    firebase_credentials_json: str = os.getenv("FIREBASE_CREDENTIALS_JSON", "")
    firebase_credentials_path: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "")

    # Web
    allowed_origins: list[str] = _list("ALLOWED_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500")


settings = Settings()
