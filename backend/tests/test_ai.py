"""B4 tests — services/dedup.py + services/ai.py. All Gemini calls mocked."""

import json
from types import SimpleNamespace

import pytest
from sqlmodel import select

import config
from models import Cluster, ClusterRelation, Complaint, OutboxMessage, Ward
from services import ai
from services.dedup import citizen_count
from tests.conftest import label_json, smart_responder

# --------------------------------------------------------------------- dedup


def _c(phone):
    return SimpleNamespace(phone=phone)


def test_citizen_count_all_unique_phones():
    complaints = [_c("9893101001"), _c("9893101002"), _c("9893101003")]
    assert citizen_count(complaints) == 3


def test_citizen_count_planted_duplicates():
    complaints = [
        _c("9893101001"),
        _c("9893101001"),  # same citizen, second report
        _c("9893101002"),
        _c("9893101002"),  # same citizen again
        _c("9893101003"),
    ]
    assert citizen_count(complaints) == 3


def test_citizen_count_all_null_phones_each_counts_as_unique():
    complaints = [_c(None), _c(None), _c(None), _c(None)]
    assert citizen_count(complaints) == 4


# --------------------------------------------------------------------- cosine


def test_cosine_identical_orthogonal_and_zero():
    assert ai._cosine([1.0, 0.0], [1.0, 0.0]) == pytest.approx(1.0)
    assert ai._cosine([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)
    assert ai._cosine([0.0, 0.0], [1.0, 0.0]) == 0.0


# --------------------------------------------------------- cluster_complaints


def test_cluster_complaints_two_orthogonal_groups(monkeypatch):
    monkeypatch.setattr(config, "SIMILARITY_THRESHOLD", 0.8)
    items = [
        ("a1", [1.0, 0.0, 0.0]),
        ("b1", [0.0, 1.0, 0.0]),
        ("a2", [0.99, 0.05, 0.0]),
        ("b2", [0.05, 0.99, 0.0]),
        ("a3", [1.0, 0.01, 0.0]),
    ]
    result = ai.cluster_complaints(items)
    assert result["a1"] == result["a2"] == result["a3"]
    assert result["b1"] == result["b2"]
    assert result["a1"] != result["b1"]
    assert len(set(result.values())) == 2


def test_cluster_complaints_exactly_at_threshold_joins(monkeypatch):
    monkeypatch.setattr(config, "SIMILARITY_THRESHOLD", 0.8)
    # cosine([1,0], [0.8, 0.6]) == 0.8 exactly → joins (>= threshold)
    result = ai.cluster_complaints([("a", [1.0, 0.0]), ("b", [0.8, 0.6])])
    assert result["a"] == result["b"]


def test_cluster_complaints_just_below_threshold_splits(monkeypatch):
    monkeypatch.setattr(config, "SIMILARITY_THRESHOLD", 0.8)
    below = [0.79, (1 - 0.79**2) ** 0.5]  # cosine with [1,0] = 0.79
    result = ai.cluster_complaints([("a", [1.0, 0.0]), ("b", below)])
    assert result["a"] != result["b"]


def test_cluster_complaints_empty_input():
    assert ai.cluster_complaints([]) == {}


# -------------------------------------------------------------- label_cluster


def test_label_cluster_happy_path(fake_gemini):
    fake = fake_gemini(
        respond_fn=lambda prompt: label_json(
            "Potholes on Scheme 54 main road", "roads", "high", "Accidents reported"
        )
    )
    result = ai.label_cluster(["Huge potholes on Scheme 54", "सड़क पर गड्ढे"])
    assert result == {
        "label": "Potholes on Scheme 54 main road",
        "category": "roads",
        "severity": "high",
        "severity_rationale": "Accidents reported",
    }
    assert len(fake.generate_calls) == 1  # ONE Flash call per cluster


def test_label_cluster_invalid_enum_falls_back(fake_gemini):
    fake_gemini(
        respond_fn=lambda prompt: label_json("Some label", "potholes", "extreme")
    )
    texts = ["Huge potholes on Scheme 54 main road near Sayaji Square" * 3]
    result = ai.label_cluster(texts)
    assert result == {
        "label": texts[0][:80],
        "category": "other",
        "severity": "medium",
        "severity_rationale": "",
    }


def test_label_cluster_gemini_exception_falls_back(fake_gemini):
    fake_gemini(respond_fn=None)  # every Flash call raises
    result = ai.label_cluster(["No water supply in our lane"])
    assert result["label"] == "No water supply in our lane"
    assert result["category"] == "other"
    assert result["severity"] == "medium"


def test_label_cluster_truncates_overlong_label(fake_gemini):
    fake_gemini(respond_fn=lambda prompt: label_json("x" * 200, "water", "low"))
    assert len(ai.label_cluster(["text"])["label"]) == 90


# ------------------------------------------------------------ infer_relations


CLUSTER_SUMMARIES = [
    {
        "id": "c1",
        "label": "Broken street lights",
        "category": "electricity",
        "locality": "banganga",
    },
    {
        "id": "c2",
        "label": "Night-time chain snatching",
        "category": "safety",
        "locality": "banganga",
    },
]


def test_infer_relations_happy_path_validates_ids_and_enum(fake_gemini):
    fake = fake_gemini(
        respond_fn=lambda prompt: json.dumps(
            [
                {
                    "from_id": "c1",
                    "to_id": "c2",
                    "relation": "contributes_to",
                    "explanation": "Dark streets enable night crime",
                },
                {"from_id": "c1", "to_id": "c2", "relation": "correlates"},  # bad enum
                {
                    "from_id": "c9",
                    "to_id": "c2",
                    "relation": "causes",
                    "explanation": "unknown id",
                },  # bad id
                {
                    "from_id": "c2",
                    "to_id": "c2",
                    "relation": "causes",
                    "explanation": "self loop",
                },  # self-relation
            ]
        )
    )
    result = ai.infer_relations(CLUSTER_SUMMARIES)
    assert result == [
        {
            "from_id": "c1",
            "to_id": "c2",
            "relation": "contributes_to",
            "explanation": "Dark streets enable night crime",
        }
    ]
    assert len(fake.generate_calls) == 1  # ONE Flash call total


def test_infer_relations_garbage_json_returns_empty(fake_gemini):
    fake_gemini(respond_fn=lambda prompt: "I think the clusters are related because")
    assert ai.infer_relations(CLUSTER_SUMMARIES) == []


def test_infer_relations_gemini_down_returns_empty(fake_gemini):
    fake_gemini(respond_fn=None)
    assert ai.infer_relations(CLUSTER_SUMMARIES) == []


def test_infer_relations_fewer_than_two_clusters_no_call(fake_gemini):
    fake = fake_gemini(respond_fn=lambda prompt: "[]")
    assert ai.infer_relations([CLUSTER_SUMMARIES[0]]) == []
    assert fake.generate_calls == []


# --------------------------------------------------- generate_outbox_message


def test_outbox_message_happy_path(fake_gemini):
    fake_gemini(respond_fn=lambda prompt: "आपकी शिकायत समूहित की गई है।")
    body = ai.generate_outbox_message("Street lights broken", "hi", 6)
    assert body == "आपकी शिकायत समूहित की गई है।"


def test_outbox_message_fallback_hindi(fake_gemini):
    fake_gemini(respond_fn=None)
    body = ai.generate_outbox_message("Street lights broken", "hi", 6)
    assert body == (
        "आपकी शिकायत दर्ज हो गई है। 'Street lights broken' समस्या पर "
        "6 नागरिकों की रिपोर्ट समूहित की गई हैं।"
    )


def test_outbox_message_fallback_english(fake_gemini):
    fake_gemini(respond_fn=None)
    body = ai.generate_outbox_message("Street lights broken", "en", 6)
    assert body == (
        "Your complaint has been recorded. 6 citizen reports have been "
        "grouped under 'Street lights broken'."
    )


# ------------------------------------------- backup LLM provider (Groq/Llama)


def test_gemini_preferred_backup_not_called(fake_gemini, fake_backup_llm):
    """When Gemini succeeds, the backup LLM is never touched."""
    fake_gemini(
        respond_fn=lambda prompt: label_json("Potholes on main road", "roads", "high")
    )
    backup = fake_backup_llm(label_json("SHOULD NOT BE USED", "other", "low"))
    result = ai.label_cluster(["Huge potholes on the main road"])
    assert result["label"] == "Potholes on main road"
    assert backup.calls == []


def test_label_falls_back_to_backup_when_gemini_down(fake_gemini, fake_backup_llm):
    """Gemini generation fails + backup key set → label comes from the backup."""
    fake_gemini(respond_fn=None)  # every Gemini Flash call raises
    backup = fake_backup_llm(
        label_json("Streetlights dead in Banganga", "electricity", "high")
    )
    result = ai.label_cluster(["स्ट्रीट लाइट खराब है", "street lights not working"])
    assert result == {
        "label": "Streetlights dead in Banganga",
        "category": "electricity",
        "severity": "high",
        "severity_rationale": "",
    }
    assert len(backup.calls) == 1
    call = backup.calls[0]
    assert call["url"] == f"{config.LLM_BASE_URL}/chat/completions"
    assert call["json"]["response_format"] == {"type": "json_object"}  # JSON mode
    assert call["headers"]["Authorization"] == "Bearer test-llm-key"


def test_backup_strips_litellm_provider_prefix(
    fake_gemini, fake_backup_llm, monkeypatch
):
    """LLM_MODEL="openai/llama-3.3-70b-versatile" → raw call uses the bare id."""
    monkeypatch.setattr(config, "LLM_MODEL", "openai/llama-3.3-70b-versatile")
    fake_gemini(respond_fn=None)
    backup = fake_backup_llm(label_json("Water shortage", "water", "high"))
    ai.label_cluster(["no water for 3 days"])
    assert backup.calls[0]["json"]["model"] == "llama-3.3-70b-versatile"


def test_outbox_falls_back_to_backup(fake_gemini, fake_backup_llm):
    fake_gemini(respond_fn=None)
    backup = fake_backup_llm("आपकी शिकायत बैकअप द्वारा दर्ज की गई है।")
    body = ai.generate_outbox_message("Street lights broken", "hi", 6)
    assert body == "आपकी शिकायत बैकअप द्वारा दर्ज की गई है।"
    assert len(backup.calls) == 1
    assert "response_format" not in backup.calls[0]["json"]  # plain-text mode


def test_relations_accepts_backup_json_object_wrapping(fake_gemini, fake_backup_llm):
    """A backup LLM's json_object mode may wrap the array in an object."""
    fake_gemini(respond_fn=None)
    summaries = [
        {
            "id": "c1",
            "label": "Dead streetlights",
            "category": "electricity",
            "locality": "banganga",
        },
        {
            "id": "c2",
            "label": "Chain snatching at night",
            "category": "safety",
            "locality": "banganga",
        },
    ]
    fake_backup_llm(
        json.dumps(
            {
                "pairs": [
                    {
                        "from_id": "c1",
                        "to_id": "c2",
                        "relation": "contributes_to",
                        "explanation": "Dark streets enable night crime",
                    }
                ]
            }
        )
    )
    relations = ai.infer_relations(summaries)
    assert relations == [
        {
            "from_id": "c1",
            "to_id": "c2",
            "relation": "contributes_to",
            "explanation": "Dark streets enable night crime",
        }
    ]


def test_no_backup_key_means_template_fallback(fake_gemini, monkeypatch):
    """Default (no backup key): Gemini failure → template fallback, no HTTP call."""
    import httpx

    fake_gemini(respond_fn=None)

    def _boom(*args, **kwargs):
        raise AssertionError("backup LLM must not be called without a key")

    monkeypatch.setattr(httpx, "post", _boom)
    body = ai.generate_outbox_message("Street lights broken", "en", 6)
    assert body.startswith("Your complaint has been recorded.")


def test_backup_empty_response_falls_through_to_template(fake_gemini, fake_backup_llm):
    """Backup up but returns empty → caller's own fallback still fires."""
    fake_gemini(respond_fn=None)
    fake_backup_llm("")  # empty content → _backup_generate raises
    body = ai.generate_outbox_message("Street lights broken", "en", 6)
    assert body.startswith("Your complaint has been recorded.")


# ------------------------------------------------------------------ fixtures


WARDS = [
    dict(
        slug="vijay-nagar",
        name="Vijay Nagar",
        lat=22.7533,
        lng=75.8937,
        population=84000,
        literacy_rate=0.91,
        connectivity_rate=0.88,
    ),
    dict(
        slug="banganga",
        name="Banganga",
        lat=22.7448,
        lng=75.8320,
        population=62000,
        literacy_rate=0.68,
        connectivity_rate=0.54,
    ),
]


def _seed_wards(session):
    for ward in WARDS:
        session.add(Ward(**ward))
    session.commit()


def _embed_by_keyword(text: str) -> list[float]:
    if "water" in text:
        return [1.0, 0.0, 0.0]
    if "pothole" in text:
        return [0.0, 1.0, 0.0]
    return [0.0, 0.0, 1.0]  # streetlight group


EIGHT_COMPLAINTS = [
    # water cluster — banganga — 3 complaints, 2 citizens (planted phone dup)
    (
        "No water supply in our lane for five days",
        "hi",
        "banganga",
        "water",
        "9000000001",
    ),
    (
        "Still no water supply, tanker never came",
        "hi",
        "banganga",
        "water",
        "9000000001",
    ),
    ("water pipeline broken near temple", "en", "banganga", "water", "9000000002"),
    # roads cluster — vijay-nagar — 3 complaints, 3 citizens
    ("Huge pothole on Scheme 54 road", "en", "vijay-nagar", "roads", "9000000003"),
    ("pothole burst my scooter tyre", "en", "vijay-nagar", "roads", "9000000004"),
    (
        "Every pothole fills with rain, invisible at night",
        "hi",
        "vijay-nagar",
        "roads",
        "9000000005",
    ),
    # streetlight cluster — banganga — 2 complaints, 2 citizens (one anonymous)
    ("streetlight dead for three weeks", "hi", "banganga", "electricity", "9000000006"),
    ("streetlight outage makes lane unsafe", "en", "banganga", "electricity", None),
]


def _seed_complaints(session):
    for text, lang, locality, hint, phone in EIGHT_COMPLAINTS:
        session.add(
            Complaint(
                text=text,
                original_language=lang,
                locality=locality,
                category_hint=hint,
                phone=phone,
            )
        )
    session.commit()


def _analyze_responder():
    """Label prompts → keyword-matched labels; relation prompt → one valid pair
    built from the real cluster ids embedded in the prompt; outbox → text."""

    def _respond(prompt: str) -> str:
        if "causal/contributing pairs" in prompt:
            summaries = json.loads(prompt[prompt.index("\n[") + 1 :])
            water = next(s for s in summaries if s["category"] == "water")
            light = next(s for s in summaries if s["category"] == "electricity")
            return json.dumps(
                [
                    {
                        "from_id": water["id"],
                        "to_id": light["id"],
                        "relation": "related_to",
                        "explanation": "Same underserved ward infrastructure",
                    }
                ]
            )
        if "Return JSON {label" in prompt:
            # NB: route on complaint-only words — the prompt's enum list
            # always contains "water"/"roads"/... so those can't be keys.
            if "pothole" in prompt:
                return label_json("Potholes on Scheme 54", "roads", "medium")
            if "streetlight" in prompt:
                return label_json(
                    "Street lights dead in Banganga", "electricity", "high"
                )
            return label_json("Water supply failure in Banganga", "water", "high")
        return "Aapki shikayat darj ho gayi hai."

    return _respond


# ---------------------------------------------------------------- analyze_all


def test_analyze_all_end_to_end(session, fake_gemini, monkeypatch):
    monkeypatch.setattr(config, "SIMILARITY_THRESHOLD", 0.82)
    _seed_wards(session)
    _seed_complaints(session)
    fake = fake_gemini(embed_fn=_embed_by_keyword, respond_fn=_analyze_responder())

    result = ai.analyze_all(session)

    assert result["clusters_created"] == 3
    assert result["relations_found"] == 1
    # distinct phones per cluster: water 2 + roads 3 + light 1 = 6
    assert result["outbox_generated"] == 6
    assert isinstance(result["duration_ms"], int)

    # ONE batched embed call for all 8 complaints
    assert len(fake.embed_calls) == 1
    assert len(fake.embed_calls[0]) == 8

    clusters = session.exec(select(Cluster)).all()
    assert len(clusters) == 3
    by_category = {c.category: c for c in clusters}
    water = by_category["water"]
    assert water.label == "Water supply failure in Banganga"
    assert water.complaint_count == 3
    assert water.citizen_count == 2  # planted phone dup collapsed
    assert water.locality == "banganga"
    assert water.lat == pytest.approx(22.7448)  # from majority ward
    assert water.centroid == [1.0, 0.0, 0.0]
    light = by_category["electricity"]
    assert light.complaint_count == 2
    assert light.citizen_count == 2  # None phone counts as unique citizen

    # every complaint got a cluster_id
    complaints = session.exec(select(Complaint)).all()
    assert all(c.cluster_id is not None for c in complaints)

    relations = session.exec(select(ClusterRelation)).all()
    assert len(relations) == 1
    assert relations[0].from_cluster_id == water.id
    assert relations[0].relation == "related_to"

    outbox = session.exec(select(OutboxMessage)).all()
    assert len(outbox) == 6
    masked = {m.phone_masked for m in outbox}
    assert "90XXXXX001" in masked
    assert all("XXXXX" in m.phone_masked for m in outbox)
    assert all(m.status == "queued" for m in outbox)


def test_analyze_all_idempotent_on_second_run(session, fake_gemini, monkeypatch):
    monkeypatch.setattr(config, "SIMILARITY_THRESHOLD", 0.82)
    _seed_wards(session)
    _seed_complaints(session)
    fake = fake_gemini(embed_fn=_embed_by_keyword, respond_fn=_analyze_responder())

    first = ai.analyze_all(session)
    second = ai.analyze_all(session)

    assert second["clusters_created"] == first["clusters_created"] == 3
    assert len(session.exec(select(Cluster)).all()) == 3  # not 6
    assert len(session.exec(select(ClusterRelation)).all()) == 1
    assert len(session.exec(select(OutboxMessage)).all()) == 6
    assert len(fake.embed_calls) == 2  # one batched call per run


def test_analyze_all_empty_db_returns_zeros(session, fake_gemini):
    fake = fake_gemini(embed_fn=_embed_by_keyword)
    result = ai.analyze_all(session)
    assert result["clusters_created"] == 0
    assert result["relations_found"] == 0
    assert result["outbox_generated"] == 0
    assert fake.embed_calls == []  # no pointless API call


def test_analyze_all_raises_when_embedding_fails(session, fake_gemini):
    """seed.py catches this and falls back to precomputed clusters."""
    _seed_wards(session)
    _seed_complaints(session)
    fake_gemini(embed_fn=None)  # embed raises
    with pytest.raises(Exception):
        ai.analyze_all(session)
    assert session.exec(select(Cluster)).all() == []  # old state not half-wiped


# ---------------------------------------------------------- attach_to_cluster


def _existing_cluster(session):
    """One water cluster in banganga with two member complaints."""
    cluster = Cluster(
        label="Water supply failure in Banganga",
        category="water",
        severity="high",
        locality="banganga",
        lat=22.7448,
        lng=75.8320,
        complaint_count=2,
        citizen_count=2,
        centroid=[1.0, 0.0, 0.0],
    )
    session.add(cluster)
    session.commit()
    for phone in ("9000000001", "9000000002"):
        session.add(
            Complaint(
                text="No water supply here",
                original_language="hi",
                locality="banganga",
                category_hint="water",
                phone=phone,
                cluster_id=cluster.id,
            )
        )
    session.commit()
    return cluster


def test_attach_to_cluster_joins_existing(session, fake_gemini, monkeypatch):
    monkeypatch.setattr(config, "SIMILARITY_THRESHOLD", 0.82)
    _seed_wards(session)
    cluster = _existing_cluster(session)
    fake = fake_gemini(embed_fn=_embed_by_keyword, respond_fn=smart_responder())

    new = Complaint(
        text="water tanker never arrives",
        original_language="en",
        locality="banganga",
        category_hint="water",
        phone="9000000001",
    )
    session.add(new)
    session.commit()

    cluster_id, is_new = ai.attach_to_cluster(new, session)

    assert cluster_id == cluster.id
    assert is_new is False
    assert new.cluster_id == cluster.id
    session.refresh(cluster)
    assert cluster.complaint_count == 3
    assert cluster.citizen_count == 2  # phone dup with existing member
    assert cluster.centroid == pytest.approx([1.0, 0.0, 0.0])  # running mean
    assert len(fake.embed_calls) == 1 and len(fake.embed_calls[0]) == 1


def test_attach_to_cluster_creates_new_singleton(session, fake_gemini, monkeypatch):
    monkeypatch.setattr(config, "SIMILARITY_THRESHOLD", 0.82)
    _seed_wards(session)
    existing = _existing_cluster(session)
    fake_gemini(
        embed_fn=_embed_by_keyword,
        respond_fn=lambda prompt: label_json(
            "Street light outage in Banganga", "electricity", "high"
        ),
    )

    new = Complaint(
        text="streetlight dead on our lane",
        original_language="hi",
        locality="banganga",
        category_hint="electricity",
        phone="9000000009",
    )
    session.add(new)
    session.commit()

    cluster_id, is_new = ai.attach_to_cluster(new, session)

    assert is_new is True
    assert cluster_id != existing.id
    created = session.get(Cluster, cluster_id)
    assert created.label == "Street light outage in Banganga"
    assert created.category == "electricity"
    assert created.complaint_count == 1
    assert created.citizen_count == 1
    assert created.centroid == [0.0, 0.0, 1.0]
    assert created.lat == pytest.approx(22.7448)  # ward coords
    assert new.cluster_id == cluster_id


def test_attach_to_cluster_gemini_down_never_raises(session, fake_gemini, monkeypatch):
    monkeypatch.setattr(config, "SIMILARITY_THRESHOLD", 0.82)
    _seed_wards(session)
    _existing_cluster(session)
    fake_gemini(embed_fn=None, respond_fn=None)  # everything raises

    text = "streetlight dead on our lane " * 5
    new = Complaint(
        text=text,
        original_language="hi",
        locality="banganga",
        category_hint="electricity",
        phone="9000000009",
    )
    session.add(new)
    session.commit()

    cluster_id, is_new = ai.attach_to_cluster(new, session)  # must not raise

    assert is_new is True
    created = session.get(Cluster, cluster_id)
    assert created.label == text[:80]
    assert created.category == "electricity"  # valid category_hint honoured
    assert created.severity == "medium"
    assert created.centroid is None
    assert new.cluster_id == cluster_id


def test_attach_to_cluster_bad_category_hint_falls_back_to_other(
    session, fake_gemini, monkeypatch
):
    monkeypatch.setattr(config, "SIMILARITY_THRESHOLD", 0.82)
    fake_gemini(embed_fn=None, respond_fn=None)
    new = Complaint(
        text="some complaint",
        original_language="en",
        locality="nowhere-ward",
        category_hint="not-a-category",
        phone=None,
    )
    session.add(new)
    session.commit()

    cluster_id, is_new = ai.attach_to_cluster(new, session)

    created = session.get(Cluster, cluster_id)
    assert is_new is True
    assert created.category == "other"
    assert created.lat == 0.0 and created.lng == 0.0  # no ward → 0.0 fallback
