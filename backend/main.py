import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import FRONTEND_ORIGIN
from database import init_db
from routers import analysis, complaints, meta

logger = logging.getLogger(__name__)

MEDIA_DIR = Path(__file__).parent / "media"
MEDIA_DIR.mkdir(exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        from seed import seed_if_empty

        seed_if_empty()
    except ImportError:
        logger.warning("seed module not available yet — starting with empty DB")
    except Exception:
        logger.exception("seed_if_empty failed — starting without seed data")
    yield


app = FastAPI(title="JanVikas AI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:3000"],
    # Accept any local-dev origin regardless of how the browser reaches the
    # frontend: localhost, 127.0.0.1, a fallback port (e.g. 3001), or a
    # private-LAN IP. Browsers treat each of these as a distinct origin, so an
    # exact-match list silently breaks with a CORS error when the tab is opened
    # via 127.0.0.1 instead of localhost.
    allow_origin_regex=(
        r"http://(localhost|127\.0\.0\.1|"
        r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"192\.168\.\d{1,3}\.\d{1,3}|"
        r"172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?"
    ),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

app.include_router(meta.router)
app.include_router(complaints.router)
app.include_router(analysis.router)
