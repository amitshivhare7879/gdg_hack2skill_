"""TDD tests for services/scoring.py — written BEFORE the implementation (B8).

Pure-function tests use types.SimpleNamespace as a ward stand-in (no DB, no
network). score_projects is exercised against an in-memory SQLite session.
"""

from types import SimpleNamespace

import pytest
from sqlmodel import Session, SQLModel, create_engine, select

from models import Cluster, ProposedProject, Ward
from services.scoring import (
    SEVERITY_BASE,
    corroborated_severity,
    equity_adjusted_demand,
    normalize,
    participation_index,
    score_projects,
)

BANGANGA = SimpleNamespace(literacy_rate=0.68, connectivity_rate=0.54)
VIJAY_NAGAR = SimpleNamespace(literacy_rate=0.91, connectivity_rate=0.88)


# ---------------------------------------------------------------- participation
def test_participation_index_floors_at_035():
    # 0.5*0.2 + 0.5*0.2 = 0.2 → floored to 0.35 (caps equity boost at ~2.86x)
    assert participation_index(0.2, 0.2) == pytest.approx(0.35)
    assert participation_index(0.0, 0.0) == pytest.approx(0.35)


def test_participation_index_above_floor_is_mean():
    assert participation_index(0.8, 0.6) == pytest.approx(0.7)
    assert participation_index(0.91, 0.88) == pytest.approx(0.895)


# ------------------------------------------------------- equity-adjusted demand
def test_low_literacy_ward_6_citizens_beats_high_literacy_8():
    # THE DEMO CLAIM: banganga (lit .68, conn .54) with 6 citizens must outrank
    # vijay-nagar (lit .91, conn .88) with 8 citizens on equity-adjusted demand.
    banganga_demand = equity_adjusted_demand(6, BANGANGA)
    vijay_nagar_demand = equity_adjusted_demand(8, VIJAY_NAGAR)
    assert banganga_demand > vijay_nagar_demand


def test_equity_adjusted_demand_is_count_over_participation():
    # banganga participation = 0.5*0.68 + 0.5*0.54 = 0.61
    assert equity_adjusted_demand(6, BANGANGA) == pytest.approx(6 / 0.61)


# ------------------------------------------------------- corroborated severity
def test_severity_base_table():
    assert SEVERITY_BASE == {"low": 1.0, "medium": 2.0, "high": 3.0}


def test_education_cluster_high_dropout_gets_15x():
    score, evidence = corroborated_severity(
        "high", "education", {"school_dropout_rate": 0.22}
    )
    assert score == pytest.approx(3.0 * 1.5)
    assert "22%" in evidence
    assert "dropout" in evidence.lower()


def test_education_low_dropout_no_boost():
    score, evidence = corroborated_severity(
        "medium", "education", {"school_dropout_rate": 0.10}
    )
    assert score == pytest.approx(2.0)
    assert evidence == "no corroborating indicator flagged"


def test_health_low_phc_gets_14x():
    score, evidence = corroborated_severity("medium", "health", {"phc_per_10k": 0.6})
    assert score == pytest.approx(2.0 * 1.4)
    assert "0.6" in evidence


def test_health_missing_indicator_no_boost():
    score, evidence = corroborated_severity("medium", "health", {})
    assert score == pytest.approx(2.0)
    assert evidence == "no corroborating indicator flagged"


@pytest.mark.parametrize("category", ["electricity", "safety"])
def test_streetlight_low_density_gets_13x(category):
    score, evidence = corroborated_severity(
        "high", category, {"streetlight_density": "low"}
    )
    assert score == pytest.approx(3.0 * 1.3)
    assert "streetlight" in evidence.lower()


@pytest.mark.parametrize("category", ["water", "sanitation"])
def test_water_sanitation_low_connectivity_gets_12x(category):
    score, evidence = corroborated_severity("medium", category, {}, connectivity=0.54)
    assert score == pytest.approx(2.0 * 1.2)
    assert "54%" in evidence


def test_water_high_connectivity_no_boost():
    score, evidence = corroborated_severity("medium", "water", {}, connectivity=0.88)
    assert score == pytest.approx(2.0)
    assert evidence == "no corroborating indicator flagged"


def test_uncorroborated_category_returns_base_and_flag_sentence():
    score, evidence = corroborated_severity(
        "low", "roads", {"school_dropout_rate": 0.9}
    )
    assert score == pytest.approx(1.0)
    assert evidence == "no corroborating indicator flagged"


# ----------------------------------------------------------------- normalize
def test_normalize_maps_to_0_100_range():
    assert normalize([10.0, 20.0, 30.0]) == pytest.approx([0.0, 50.0, 100.0])


def test_normalize_single_project_returns_100():
    # div-by-zero guard: one project must not crash and should read as top score
    assert normalize([42.0]) == pytest.approx([100.0])


def test_normalize_all_equal_returns_100s():
    assert normalize([5.0, 5.0, 5.0]) == pytest.approx([100.0, 100.0, 100.0])


def test_normalize_empty_returns_empty():
    assert normalize([]) == []


# ------------------------------------------------------------- score_projects
@pytest.fixture()
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def _seed(session):
    session.add(
        Ward(
            slug="banganga",
            name="Banganga",
            lat=22.7448,
            lng=75.8320,
            population=62000,
            literacy_rate=0.68,
            connectivity_rate=0.54,
            indicators={"school_dropout_rate": 0.22, "streetlight_density": "low"},
        )
    )
    session.add(
        Ward(
            slug="vijay-nagar",
            name="Vijay Nagar",
            lat=22.7533,
            lng=75.8937,
            population=84000,
            literacy_rate=0.91,
            connectivity_rate=0.88,
            indicators={"school_dropout_rate": 0.05},
        )
    )
    edu_cluster = Cluster(
        label="School building crumbling in Banganga",
        category="education",
        severity="high",
        locality="banganga",
        lat=22.7448,
        lng=75.8320,
        complaint_count=9,
        citizen_count=6,
    )
    road_cluster = Cluster(
        label="Potholes on Vijay Nagar main road",
        category="roads",
        severity="medium",
        locality="vijay-nagar",
        lat=22.7533,
        lng=75.8937,
        complaint_count=10,
        citizen_count=8,
    )
    session.add(edu_cluster)
    session.add(road_cluster)
    session.add(
        ProposedProject(
            title="Primary school building repair — Banganga Ward",
            category="education",
            locality="banganga",
            feasibility_score=88,
            feasibility_evidence="Est. Rs 18L, 3-month timeline",
        )
    )
    session.add(
        ProposedProject(
            title="Road resurfacing — Vijay Nagar",
            category="roads",
            locality="vijay-nagar",
            feasibility_score=70,
            feasibility_evidence="Est. Rs 40L",
        )
    )
    session.commit()
    return edu_cluster, road_cluster


def test_score_projects_writes_normalized_components_and_links(session):
    edu_cluster, road_cluster = _seed(session)
    score_projects(session)

    projects = {p.title: p for p in session.exec(select(ProposedProject)).all()}
    edu = projects["Primary school building repair — Banganga Ward"]
    roads = projects["Road resurfacing — Vijay Nagar"]

    # clusters linked by category + locality
    assert edu.linked_cluster_ids == [edu_cluster.id]
    assert roads.linked_cluster_ids == [road_cluster.id]

    # scores are min-max normalized to 0-100
    for p in (edu, roads):
        assert 0 <= p.demand_score <= 100
        assert 0 <= p.severity_score <= 100

    # demo claim end-to-end: 6 equity-boosted citizens beat 8 well-connected ones
    assert edu.demand_score > roads.demand_score
    # education severity is corroborated (3.0*1.5) vs roads uncorroborated (2.0)
    assert edu.severity_score > roads.severity_score

    # feasibility untouched
    assert edu.feasibility_score == 88

    # evidence strings follow the contract style
    assert "9 citizen complaints (6 unique citizens)" in edu.demand_evidence
    assert "68% literacy" in edu.demand_evidence
    assert "equity-boosted" in edu.demand_evidence
    assert "dropout" in edu.severity_evidence.lower()
    assert roads.severity_evidence == "no corroborating indicator flagged"


def test_score_projects_respects_explicit_linked_cluster_ids(session):
    edu_cluster, road_cluster = _seed(session)
    # pin the roads project explicitly to the education cluster
    roads = session.exec(
        select(ProposedProject).where(
            ProposedProject.title == "Road resurfacing — Vijay Nagar"
        )
    ).one()
    roads.linked_cluster_ids = [edu_cluster.id]
    session.add(roads)
    session.commit()

    score_projects(session)
    session.refresh(roads)
    # explicit links respected, and the category/locality match is unioned in
    assert edu_cluster.id in roads.linked_cluster_ids
    assert road_cluster.id in roads.linked_cluster_ids


def test_score_projects_with_no_matching_clusters_is_safe(session):
    session.add(
        ProposedProject(
            title="Orphan project",
            category="other",
            locality="nowhere",
            feasibility_score=50,
            feasibility_evidence="",
        )
    )
    session.commit()
    score_projects(session)
    orphan = session.exec(
        select(ProposedProject).where(ProposedProject.title == "Orphan project")
    ).one()
    assert orphan.demand_score == 100  # sole project → normalized to 100
    assert "no linked" in orphan.demand_evidence.lower()
