"""Analysis endpoints (B5): POST /api/analyze, GET /api/priorities,
GET /api/outbox.

POST /api/analyze is a demo-reset utility and must NEVER 500 (RULES.md #3):
if the full Gemini pipeline fails (no key, timeout, quota), current clusters
are kept and the current counts are returned as the stats.
"""

import logging
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from database import get_session
from models import Cluster, ClusterRelation, OutboxMessage, ProposedProject
from services.ai import analyze_all

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analysis"])

OUTBOX_CHANNEL = "whatsapp (production)"  # contract literal — not a model field


def _iso_z(dt: datetime) -> str:
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _count(session: Session, model) -> int:
    return session.exec(select(func.count()).select_from(model)).one()


@router.post("/analyze")
def analyze(session: Session = Depends(get_session)) -> dict:
    start = time.monotonic()
    try:
        return analyze_all(session)
    except Exception:
        logger.warning(
            "POST /analyze: analyze_all failed — keeping current clusters "
            "and returning current counts",
            exc_info=True,
        )
        session.rollback()
        return {
            "clusters_created": _count(session, Cluster),
            "relations_found": _count(session, ClusterRelation),
            "outbox_generated": _count(session, OutboxMessage),
            "duration_ms": int((time.monotonic() - start) * 1000),
        }


@router.get("/priorities")
def priorities(session: Session = Depends(get_session)) -> dict:
    projects = session.exec(select(ProposedProject)).all()
    return {
        "projects": [
            {
                "id": p.id,
                "title": p.title,
                "category": p.category,
                "locality": p.locality,
                "demand_score": int(round(p.demand_score)),
                "demand_evidence": p.demand_evidence,
                "severity_score": int(round(p.severity_score)),
                "severity_evidence": p.severity_evidence,
                "feasibility_score": int(round(p.feasibility_score)),
                "feasibility_evidence": p.feasibility_evidence,
                "linked_cluster_ids": p.linked_cluster_ids or [],
                "data_sources": p.data_sources or [],
            }
            for p in projects
        ]
    }


@router.get("/outbox")
def outbox(session: Session = Depends(get_session)) -> dict:
    messages = session.exec(
        select(OutboxMessage).order_by(OutboxMessage.created_at.desc())  # type: ignore[attr-defined]
    ).all()
    return {
        "messages": [
            {
                "id": m.id,
                "phone_masked": m.phone_masked,
                "language": m.language,
                "cluster_label": m.cluster_label,
                "body": m.body,
                "status": m.status,
                "channel": OUTBOX_CHANNEL,
                "created_at": _iso_z(m.created_at),
            }
            for m in messages
        ]
    }
