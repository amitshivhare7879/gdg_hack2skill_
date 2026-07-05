"""Scoring engine (B8) — equity-adjusted demand + data-corroborated severity.

Everything except score_projects is a PURE function: no session, no network,
no model imports at module level (models are imported lazily inside the
orchestration shell so the pure functions stay importable standalone).

Backend returns raw 0-100 components; slider weights live in the frontend
(ADR-7). Never pre-weight here.
"""

import logging

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------- demand

PARTICIPATION_FLOOR = 0.35  # caps the equity boost at ~2.86x


def participation_index(literacy: float, connectivity: float) -> float:
    """How easily a ward's residents can register complaints (0.35–1.0)."""
    return max(PARTICIPATION_FLOOR, 0.5 * literacy + 0.5 * connectivity)


def equity_adjusted_demand(citizen_count: int, ward) -> float:
    """Citizen count boosted by 1/participation for low-literacy/-connectivity wards.

    `ward` is any object exposing literacy_rate and connectivity_rate
    (a Ward row or a SimpleNamespace in tests).
    """
    return citizen_count / participation_index(
        ward.literacy_rate, ward.connectivity_rate
    )


# ------------------------------------------------------------------- severity

SEVERITY_BASE = {"low": 1.0, "medium": 2.0, "high": 3.0}


def corroborated_severity(
    severity: str,
    category: str,
    indicators: dict,
    connectivity: float | None = None,
) -> tuple[float, str]:
    """Base severity times a govt-data corroboration multiplier.

    `connectivity` is passed separately because the water/sanitation rule
    keys off the ward's connectivity_rate, which lives on the Ward row, not
    in its indicators JSON. Missing indicators never boost (and never crash).
    Returns (score, evidence_sentence).
    """
    base = SEVERITY_BASE.get(severity, SEVERITY_BASE["medium"])
    indicators = indicators or {}

    if category == "education":
        dropout = indicators.get("school_dropout_rate")
        if dropout is not None and dropout > 0.15:
            return (
                base * 1.5,
                f"UDISE+: {dropout * 100:.0f}% dropout rate — severity corroborated 1.5x",
            )
    elif category == "health":
        phc = indicators.get("phc_per_10k")
        if phc is not None and phc < 1.0:
            return (
                base * 1.4,
                f"NHM: {phc:g} PHCs per 10k population (below 1.0 benchmark) — "
                "severity corroborated 1.4x",
            )
    elif category in ("electricity", "safety"):
        if indicators.get("streetlight_density") == "low":
            return (
                base * 1.3,
                "Ward infra data: low streetlight density — severity corroborated 1.3x",
            )
    elif category in ("water", "sanitation"):
        if connectivity is not None and connectivity < 0.6:
            return (
                base * 1.2,
                f"Low-infrastructure proxy: {connectivity * 100:.0f}% connectivity "
                "ward — severity corroborated 1.2x",
            )

    return base, "no corroborating indicator flagged"


# ------------------------------------------------------------------ normalize


def normalize(values: list[float]) -> list[float]:
    """Min-max normalize to 0-100. Single item or all-equal → all 100."""
    if not values:
        return []
    lo, hi = min(values), max(values)
    if hi == lo:
        return [100.0] * len(values)
    return [(v - lo) / (hi - lo) * 100.0 for v in values]


# -------------------------------------------------- orchestration shell (DB)


def score_projects(session) -> None:
    """Fill demand/severity components + evidence on every ProposedProject.

    The only impure function in this module: it reads/writes via the session
    but delegates all math to the pure functions above. Feasibility stays as
    seeded (ADR: feasibility comes from the seed data, not this engine).
    """
    from sqlmodel import select

    from models import Cluster, ProposedProject, Ward

    projects = session.exec(select(ProposedProject)).all()
    if not projects:
        logger.info("score_projects: no projects to score")
        return

    clusters = session.exec(select(Cluster)).all()
    clusters_by_id = {c.id: c for c in clusters}
    wards_by_slug = {w.slug: w for w in session.exec(select(Ward)).all()}

    demand_raws: list[float] = []
    severity_raws: list[float] = []
    per_project: list[tuple] = []  # (project, linked_ids, demand_ev, severity_ev)

    for project in projects:
        # Link clusters: explicit linked_cluster_ids unioned with
        # category + locality match.
        linked_ids = [
            i for i in (project.linked_cluster_ids or []) if i in clusters_by_id
        ]
        for cluster in clusters:
            if (
                cluster.category == project.category
                and cluster.locality == project.locality
                and cluster.id not in linked_ids
            ):
                linked_ids.append(cluster.id)
        linked = [clusters_by_id[i] for i in linked_ids]

        if not linked:
            per_project.append(
                (
                    project,
                    [],
                    "no linked complaint clusters",
                    "no linked complaint clusters",
                )
            )
            demand_raws.append(0.0)
            severity_raws.append(0.0)
            continue

        # ---- demand: sum of equity-adjusted demand over linked clusters
        demand_raw = 0.0
        total_complaints = 0
        total_citizens = 0
        boost_ward = None  # ward with the strongest equity boost, for the narrative
        for cluster in linked:
            ward = wards_by_slug.get(cluster.locality)
            total_complaints += cluster.complaint_count
            total_citizens += cluster.citizen_count
            if ward is None:
                logger.warning(
                    "score_projects: no ward for locality %r; demand unboosted",
                    cluster.locality,
                )
                demand_raw += cluster.citizen_count
                continue
            demand_raw += equity_adjusted_demand(cluster.citizen_count, ward)
            if boost_ward is None or participation_index(
                ward.literacy_rate, ward.connectivity_rate
            ) < participation_index(
                boost_ward.literacy_rate, boost_ward.connectivity_rate
            ):
                boost_ward = ward

        if boost_ward is not None:
            boost = 1.0 / participation_index(
                boost_ward.literacy_rate, boost_ward.connectivity_rate
            )
            demand_evidence = (
                f"{total_complaints} citizen complaints ({total_citizens} unique "
                f"citizens), equity-boosted {boost:.1f}x for "
                f"{boost_ward.literacy_rate * 100:.0f}% literacy ward"
            )
        else:
            demand_evidence = f"{total_complaints} citizen complaints ({total_citizens} unique citizens)"

        # ---- severity: max corroborated severity over linked clusters
        severity_raw = 0.0
        severity_evidence = "no corroborating indicator flagged"
        for cluster in linked:
            ward = wards_by_slug.get(cluster.locality)
            score, evidence = corroborated_severity(
                cluster.severity,
                cluster.category,
                ward.indicators if ward else {},
                connectivity=ward.connectivity_rate if ward else None,
            )
            if score > severity_raw:
                severity_raw = score
                severity_evidence = evidence

        per_project.append((project, linked_ids, demand_evidence, severity_evidence))
        demand_raws.append(demand_raw)
        severity_raws.append(severity_raw)

    demand_scores = normalize(demand_raws)
    severity_scores = normalize(severity_raws)

    for (project, linked_ids, demand_ev, severity_ev), d, s in zip(
        per_project, demand_scores, severity_scores
    ):
        project.demand_score = round(d)
        project.demand_evidence = demand_ev
        project.severity_score = round(s)
        project.severity_evidence = severity_ev
        project.linked_cluster_ids = linked_ids
        session.add(project)

    session.commit()
    logger.info("score_projects: scored %d projects", len(projects))
