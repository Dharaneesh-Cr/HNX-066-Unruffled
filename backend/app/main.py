from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .core.config import DEMO_MODE
from .db import database

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.initialize_database()
    logger.info(
        "Sahayaa API startup demo_mode=%s database_path=%s",
        DEMO_MODE,
        database.DATABASE_PATH.resolve(),
    )
    database.approve_pending_demo_finder_organizations()
    yield

app = FastAPI(
    title="Sahayaa API",
    version="1.0.0",
    description="Backend for HNX-066 Unruffled",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"name": "Sahayaa API", "status": "ok", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
