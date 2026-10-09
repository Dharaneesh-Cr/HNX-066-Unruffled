import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

DATABASE_PATH = BACKEND_DIR / "sahayaa.db"
UPLOADS_DIR = BACKEND_DIR / "uploads"
JWT_SECRET_PATH = BACKEND_DIR / ".jwt_secret"
JWT_ALGORITHM = "HS256"
JWT_LIFETIME_SECONDS = 60 * 60
PUBLIC_API_BASE_URL = "http://localhost:8000/api"
DEMO_MODE = os.getenv("SAHAYAA_DEMO_MODE", "false").strip().lower() == "true"
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
AUTO_APPROVE_FINDER_ORGS = (
    os.getenv("SAHAYAA_AUTO_APPROVE_FINDER_ORGS", "false").strip().lower() == "true"
)
if DEMO_MODE and APP_ENV in {"prod", "production"}:
    raise RuntimeError("SAHAYAA_DEMO_MODE cannot be enabled in production")


