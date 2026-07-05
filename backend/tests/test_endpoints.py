"""Endpoint smoke tests (task B6).

Boots the real app against a shared in-memory DB seeded via the Gemini-DOWN
fallback path (the autouse `_no_real_gemini` fixture in conftest guarantees no
network). Every route must return its contract-shaped payload — and never 500 —
with Gemini unavailable. This is the demo-cannot-crash guarantee, as a test.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import database
import seed


@pytest.fixture
def client(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    # get_session() reads database.engine at call time; seed.py bound its own.
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(seed, "engine", engine)
    seed.seed_if_empty()  # Gemini-down → precomputed-cluster fallback (20 clusters)

    import main

    with TestClient(main.app) as c:
        # Re-seat the app's session dependency onto the test engine.
        main.app.dependency_overrides[database.get_session] = lambda: iter(
            [Session(engine)]
        ).__next__()
        yield c
    main.app.dependency_overrides.clear()


def _no_phone_leak(payload) -> bool:
    """Recursively assert no raw `phone` key ever escapes an endpoint."""
    if isinstance(payload, dict):
        if "phone" in payload:
            return False
        return all(_no_phone_leak(v) for v in payload.values())
    if isinstance(payload, list):
        return all(_no_phone_leak(v) for v in payload)
    return True


def test_health_reports_seeded_counts(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["complaints"] == 66
    assert body["clusters"] == 20


def test_localities_shape(client):
    r = client.get("/api/localities")
    assert r.status_code == 200
    localities = r.json()["localities"]
    assert len(localities) == 5
    assert set(localities[0]) == {
        "slug",
        "name",
        "lat",
        "lng",
        "population",
        "literacy_rate",
        "connectivity_rate",
    }


def test_clusters_all(client):
    r = client.get("/api/clusters")
    assert r.status_code == 200
    clusters = r.json()["clusters"]
    assert len(clusters) == 20
    c = clusters[0]
    assert set(c) >= {
        "id",
        "label",
        "category",
        "severity",
        "severity_rationale",
        "complaint_count",
        "citizen_count",
        "locality",
        "lat",
        "lng",
        "complaints",
        "related",
    }
    assert c["complaints"][0]["created_at"].endswith("Z")


def test_clusters_filtered_by_locality(client):
    r = client.get("/api/clusters", params={"locality": "banganga"})
    assert r.status_code == 200
    clusters = r.json()["clusters"]
    assert clusters
    assert all(c["locality"] == "banganga" for c in clusters)


def test_clusters_unknown_locality_is_empty_not_500(client):
    r = client.get("/api/clusters", params={"locality": "nowhere"})
    assert r.status_code == 200
    body = r.json()
    assert body["clusters"] == []
    assert body["total"] == 0
    assert body["stats"] == {"complaints": 0, "citizens": 0}


def test_clusters_pagination_limit_offset(client):
    full = client.get("/api/clusters").json()
    assert full["total"] == 20
    assert len(full["clusters"]) == 20
    # stats are computed over the FULL set, not the page
    assert full["stats"]["complaints"] > 0

    page1 = client.get("/api/clusters", params={"limit": 6, "offset": 0}).json()
    assert page1["total"] == 20  # total is the full count, not the page size
    assert len(page1["clusters"]) == 6
    assert page1["stats"] == full["stats"]  # unchanged by paging

    page2 = client.get("/api/clusters", params={"limit": 6, "offset": 6}).json()
    ids1 = {c["id"] for c in page1["clusters"]}
    ids2 = {c["id"] for c in page2["clusters"]}
    assert ids1.isdisjoint(ids2)  # no overlap between pages


def test_outbox_and_priorities_and_hotspots_expose_total(client):
    for path, key in [
        ("/api/outbox", "messages"),
        ("/api/priorities", "projects"),
        ("/api/hotspots", "hotspots"),
    ]:
        body = client.get(path).json()
        assert body["total"] == len(body[key])
        limited = client.get(path, params={"limit": 2}).json()
        assert limited["total"] == body["total"]
        assert len(limited[key]) == min(2, body["total"])


def test_hotspots_shape(client):
    r = client.get("/api/hotspots")
    assert r.status_code == 200
    hotspots = r.json()["hotspots"]
    assert len(hotspots) == 20
    assert set(hotspots[0]) == {
        "cluster_id",
        "label",
        "category",
        "lat",
        "lng",
        "complaint_count",
        "severity",
    }


def test_priorities_shape(client):
    r = client.get("/api/priorities")
    assert r.status_code == 200
    projects = r.json()["projects"]
    assert len(projects) == 7
    p = projects[0]
    assert set(p) == {
        "id",
        "title",
        "category",
        "locality",
        "demand_score",
        "demand_evidence",
        "severity_score",
        "severity_evidence",
        "feasibility_score",
        "feasibility_evidence",
        "linked_cluster_ids",
        "data_sources",
    }


def test_outbox_masks_phone_and_sets_channel(client):
    import re

    r = client.get("/api/outbox")
    assert r.status_code == 200
    messages = r.json()["messages"]
    assert messages
    assert _no_phone_leak(r.json())
    for m in messages:
        assert re.fullmatch(r"\d{2}XXXXX\d{3}", m["phone_masked"])
        assert m["channel"] == "whatsapp (production)"
        assert m["status"] == "queued"


def test_post_complaint_json_creates_and_clusters(client):
    r = client.post(
        "/api/complaints",
        json={
            "text": "टेस्ट शिकायत: पानी नहीं आ रहा",
            "original_language": "hi",
            "locality": "banganga",
            "category_hint": "water",
            "phone": "9876543210",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert set(body) == {
        "id",
        "cluster_id",
        "cluster_label",
        "is_new_cluster",
        "message",
    }
    assert _no_phone_leak(body)
    # New complaint bumps the live count.
    assert client.get("/api/health").json()["complaints"] == 67


def test_post_complaint_missing_text_is_422(client):
    r = client.post("/api/complaints", json={"original_language": "en"})
    assert r.status_code == 422


def test_analyze_never_500s_when_gemini_down(client):
    r = client.post("/api/analyze")
    assert r.status_code == 200
    assert set(r.json()) == {
        "clusters_created",
        "relations_found",
        "outbox_generated",
        "duration_ms",
    }
