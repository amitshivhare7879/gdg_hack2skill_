"""Seed loader with Gemini-down fallback (task B3).

On startup with an empty DB: load seed_data/*.json, then try the full
Gemini analysis pipeline (services.ai.analyze_all — task B4). If that is
unavailable or fails for ANY reason, fall back to the pre-computed
`precomputed_cluster` keys shipped in complaints.json so the demo never
depends on Gemini being up.
"""

import json
import logging
from collections import Counter
from pathlib import Path

from sqlmodel import Session, select

from database import engine
from models import Cluster, Complaint, OutboxMessage, Ward
from models import ProposedProject

logger = logging.getLogger(__name__)

SEED_DIR = Path(__file__).parent / "seed_data"

LABEL_MAX_LEN = 80

OUTBOX_TEMPLATES = {
    "hi": (
        "आपकी शिकायत दर्ज हो गई है। '{label}' समस्या पर {count} नागरिकों की "
        "रिपोर्ट समूहित की गई हैं।"
    ),
    "en": (
        "Your complaint has been registered. Reports from {count} citizens "
        "have been grouped under '{label}'."
    ),
}


def _load_json(name: str) -> list[dict]:
    path = SEED_DIR / name
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def mask_phone(phone: str) -> str:
    return phone[:2] + "XXXXX" + phone[-3:]


def _citizen_count(complaints: list[Complaint]) -> int:
    """Distinct non-null phones + one per null-phone complaint."""
    phones = {c.phone for c in complaints if c.phone}
    nulls = sum(1 for c in complaints if not c.phone)
    return len(phones) + nulls


def _majority(values: list[str]) -> str:
    return Counter(values).most_common(1)[0][0]


def fallback_cluster_from_seed(session: Session, side_dict: dict[str, str]) -> None:
    """Cluster complaints by their precomputed seed keys — zero Gemini calls."""
    complaints = list(session.exec(select(Complaint)))
    wards = {w.slug: w for w in session.exec(select(Ward))}

    groups: dict[str, list[Complaint]] = {}
    for complaint in complaints:
        key = side_dict.get(complaint.id)
        if key is None:
            key = f"orphan-{complaint.id}"
        groups.setdefault(key, []).append(complaint)

    for key, group in groups.items():
        locality = _majority([c.locality for c in group])
        ward = wards.get(locality)
        longest = max(group, key=lambda c: len(c.text))
        cluster = Cluster(
            label=longest.text[:LABEL_MAX_LEN],
            category=_majority([c.category_hint for c in group]),
            severity="medium",
            severity_rationale="",
            locality=locality,
            lat=ward.lat if ward else 0.0,
            lng=ward.lng if ward else 0.0,
            complaint_count=len(group),
            citizen_count=_citizen_count(group),
            centroid=None,
        )
        session.add(cluster)
        session.flush()  # obtain cluster.id for FK assignment
        for complaint in group:
            complaint.cluster_id = cluster.id
            session.add(complaint)

    logger.warning("SEEDED VIA FALLBACK — Gemini unavailable")


def _try_scoring(session: Session) -> None:
    try:
        from services.scoring import score_projects

        score_projects(session)
        logger.info("seed: project scoring pass completed")
    except Exception:
        logger.warning(
            "seed: services.scoring unavailable — projects keep "
            "demand_score=0 / severity_score=0 (feasibility as seeded)",
            exc_info=True,
        )


def _build_outbox_stubs(session: Session) -> int:
    """One queued message per distinct (phone, cluster). Never stores raw phone."""
    existing = session.exec(select(OutboxMessage)).first()
    if existing is not None:
        return 0

    clusters = {cl.id: cl for cl in session.exec(select(Cluster))}
    seen: set[tuple[str, str]] = set()
    created = 0
    for complaint in session.exec(select(Complaint)):
        if not complaint.phone or not complaint.cluster_id:
            continue
        pair = (complaint.phone, complaint.cluster_id)
        if pair in seen:
            continue
        seen.add(pair)
        cluster = clusters[complaint.cluster_id]
        template = OUTBOX_TEMPLATES.get(
            complaint.original_language, OUTBOX_TEMPLATES["en"]
        )
        session.add(
            OutboxMessage(
                phone_masked=mask_phone(complaint.phone),
                language=complaint.original_language,
                cluster_label=cluster.label,
                body=template.format(label=cluster.label, count=cluster.citizen_count),
                status="queued",
            )
        )
        created += 1
    return created


def seed_if_empty() -> None:
    """Idempotent startup seed. Safe to call on every boot."""
    try:
        with Session(engine) as session:
            if session.exec(select(Complaint)).first() is not None:
                logger.info("seed: complaints already present — skipping")
                return

            for row in _load_json("wards.json"):
                session.add(Ward(**row))

            side_dict: dict[str, str] = {}
            for row in _load_json("complaints.json"):
                side_dict[row["id"]] = row.pop("precomputed_cluster", "")
                session.add(Complaint(**row))

            for row in _load_json("projects.json"):
                row.pop("linked_categories", None)  # not a model field
                row.setdefault("data_sources", [])
                session.add(ProposedProject(**row))

            session.flush()

            try:
                from services.ai import analyze_all

                analyze_all(session)
                logger.info("seed: clustered via Gemini analyze_all")
            except Exception:
                logger.warning(
                    "seed: analyze_all unavailable or failed — using "
                    "precomputed seed clusters",
                    exc_info=True,
                )
                fallback_cluster_from_seed(session, side_dict)

            _try_scoring(session)
            outbox_created = _build_outbox_stubs(session)

            session.commit()
            logger.info(
                "seed: done — %d complaints, %d clusters, %d outbox messages",
                len(side_dict),
                len(list(session.exec(select(Cluster)))),
                outbox_created,
            )
    except Exception:
        logger.exception("seed_if_empty failed — DB left unseeded")
