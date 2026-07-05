"""Citizen-facing endpoints (B5): POST /api/complaints, GET /api/clusters,
GET /api/hotspots.

POST /api/complaints accepts BOTH bodies the contract allows
("multipart if photo present, else JSON"): the handler takes a raw
Request and branches on Content-Type — multipart/form-data (or classic
urlencoded forms) is parsed with request.form() (photo supported), anything
else is parsed as JSON (no photo). One route, no duplicated logic.

RULES.md #6: raw `phone` never leaves this module — only phone_masked
(written to the outbox), and no response dict below contains a phone field.
"""

import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from starlette.datastructures import UploadFile

from database import get_session
from models import Cluster, ClusterRelation, Complaint, OutboxMessage
from services import dedup
from services.ai import attach_to_cluster, generate_outbox_message, mask_phone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["complaints"])

MEDIA_DIR = Path(__file__).resolve().parent.parent / "media"

LANGUAGES = {"hi", "en"}


def _iso_z(dt: datetime) -> str:
    """Contract timestamp shape: 2026-07-05T10:12:00Z (always UTC, Z suffix)."""
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


async def _parse_body(request: Request) -> tuple[dict, UploadFile | None]:
    """Return (fields, photo) from either a multipart form or a JSON body."""
    content_type = request.headers.get("content-type", "")
    if content_type.startswith(
        ("multipart/form-data", "application/x-www-form-urlencoded")
    ):
        form = await request.form()
        photo = form.get("photo")
        if not isinstance(photo, UploadFile):
            photo = None
        fields = {k: v for k, v in form.items() if isinstance(v, str)}
        return fields, photo

    try:
        data = await request.json()
    except Exception:
        raise HTTPException(
            status_code=422,
            detail="Body must be multipart/form-data or valid JSON",
        ) from None
    if not isinstance(data, dict):
        raise HTTPException(status_code=422, detail="JSON body must be an object")
    return {k: v for k, v in data.items() if isinstance(v, str)}, None


@router.post("/complaints", status_code=201)
async def create_complaint(
    request: Request, session: Session = Depends(get_session)
) -> dict:
    fields, photo = await _parse_body(request)

    text = (fields.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="text is required")

    original_language = fields.get("original_language") or "en"
    if original_language not in LANGUAGES:
        raise HTTPException(
            status_code=422, detail='original_language must be "hi" or "en"'
        )

    phone = (fields.get("phone") or "").strip() or None

    complaint = Complaint(
        text=text,
        original_language=original_language,
        locality=(fields.get("locality") or "").strip(),
        category_hint=(fields.get("category_hint") or "").strip(),
        phone=phone,
    )

    if photo is not None:
        MEDIA_DIR.mkdir(exist_ok=True)
        photo_path = MEDIA_DIR / f"{complaint.id}.jpg"
        photo_path.write_bytes(await photo.read())
        complaint.photo_path = f"media/{complaint.id}.jpg"

    session.add(complaint)
    # Incremental clustering — Gemini-failure-safe by design (never raises;
    # worst case it creates a fallback-labelled singleton cluster).
    cluster_id, is_new_cluster = attach_to_cluster(complaint, session)

    cluster = session.get(Cluster, cluster_id)
    members = list(
        session.exec(select(Complaint).where(Complaint.cluster_id == cluster_id)).all()
    )
    cluster.complaint_count = len(members)
    cluster.citizen_count = dedup.citizen_count(members)
    session.add(cluster)

    if phone is not None:
        session.add(
            OutboxMessage(
                phone_masked=mask_phone(phone),
                language=original_language,
                cluster_label=cluster.label,
                body=generate_outbox_message(
                    cluster.label, original_language, cluster.citizen_count
                ),
            )
        )

    session.commit()
    session.refresh(cluster)

    if is_new_cluster:
        message = "Your complaint has been recorded as a new issue."
    else:
        similar = max(cluster.complaint_count - 1, 1)
        message = (
            "Your complaint has been recorded and grouped with "
            f"{similar} similar reports."
        )

    return {
        "id": complaint.id,
        "cluster_id": cluster.id,
        "cluster_label": cluster.label,
        "is_new_cluster": is_new_cluster,
        "message": message,
    }


def _complaint_dict(c: Complaint) -> dict:
    has_photo = c.photo_path is not None
    out = {
        "id": c.id,
        "text": c.text,
        "original_language": c.original_language,
        "has_photo": has_photo,
        "created_at": _iso_z(c.created_at),
    }
    if has_photo:
        out["photo_url"] = f"/media/{Path(c.photo_path).name}"
    return out


@router.get("/clusters")
def get_clusters(
    locality: str | None = None,
    limit: int | None = None,
    offset: int = 0,
    session: Session = Depends(get_session),
) -> dict:
    """List clusters, optionally filtered by locality and paginated.

    Pagination is opt-in: omit `limit` to get the full set (back-compat).
    `stats` is always computed over the FULL filtered set — never just the
    returned page — so a paginated dashboard grid never under-counts the
    StatBar totals.
    """
    query = select(Cluster)
    if locality:
        query = query.where(Cluster.locality == locality)
    clusters = list(session.exec(query).all())

    total = len(clusters)
    stats = {
        "complaints": sum(c.complaint_count for c in clusters),
        "citizens": sum(c.citizen_count for c in clusters),
    }
    if not clusters:
        return {"clusters": [], "total": 0, "stats": stats}

    page = clusters if limit is None else clusters[offset : offset + limit]

    labels_by_id = {c.id: c.label for c in session.exec(select(Cluster)).all()}
    relations = session.exec(select(ClusterRelation)).all()

    out = []
    for cluster in page:
        complaints = session.exec(
            select(Complaint).where(Complaint.cluster_id == cluster.id)
        ).all()

        related = []
        for rel in relations:
            if rel.from_cluster_id == cluster.id:
                other_id = rel.to_cluster_id
            elif rel.to_cluster_id == cluster.id:
                other_id = rel.from_cluster_id
            else:
                continue
            related.append(
                {
                    "cluster_id": other_id,
                    "label": labels_by_id.get(other_id, ""),
                    "relation": rel.relation,
                    "explanation": rel.explanation,
                }
            )

        out.append(
            {
                "id": cluster.id,
                "label": cluster.label,
                "category": cluster.category,
                "severity": cluster.severity,
                "severity_rationale": cluster.severity_rationale,
                "complaint_count": cluster.complaint_count,
                "citizen_count": cluster.citizen_count,
                "locality": cluster.locality,
                "lat": cluster.lat,
                "lng": cluster.lng,
                "complaints": [_complaint_dict(c) for c in complaints],
                "related": related,
            }
        )
    return {"clusters": out, "total": total, "stats": stats}


@router.get("/hotspots")
def get_hotspots(
    limit: int | None = None,
    offset: int = 0,
    session: Session = Depends(get_session),
) -> dict:
    """List map hotspots. Pagination is opt-in (the map fetches the full set)."""
    clusters = list(session.exec(select(Cluster)).all())
    total = len(clusters)
    page = clusters if limit is None else clusters[offset : offset + limit]
    return {
        "hotspots": [
            {
                "cluster_id": c.id,
                "label": c.label,
                "category": c.category,
                "lat": c.lat,
                "lng": c.lng,
                "complaint_count": c.complaint_count,
                "severity": c.severity,
            }
            for c in page
        ],
        "total": total,
    }
