"""Gemini service layer (B4) — embed, cluster, label, relations, outbox, attach.

Discipline (backend/RULES.md):
- Every Gemini call: 10s timeout + try/except + fallback. Routes never 500
  because Gemini failed. Only embed_texts raises (its callers handle it).
- Enums validated on the way OUT of Gemini, never trusted.
- No sklearn/numpy — plain-Python cosine over lists.
- Labeling is per-CLUSTER, never per-complaint. Embeddings are batched.

Backup provider: generation calls (labels/relations/outbox) fall back to an
OpenAI-compatible LLM (default Groq/Llama 3.3 70B) when Gemini fails AND
config.LLM_API_KEY is set — see _generate_text. It is chat-only, so it does NOT
back up embeddings/clustering; that path already degrades safely to singletons
(POST) and precomputed clusters (seed).
"""

import json
import logging
import math
import time
from collections import Counter

import config
from services import dedup, scoring

logger = logging.getLogger(__name__)

CATEGORIES = {
    "water",
    "roads",
    "electricity",
    "education",
    "health",
    "sanitation",
    "safety",
    "other",
}
SEVERITIES = {"low", "medium", "high"}
RELATIONS = {"causes", "contributes_to", "related_to"}

_client_instance = None


def _client():
    """Memoized google-genai client with a hard 10s HTTP timeout."""
    global _client_instance
    if _client_instance is None:
        from google import genai
        from google.genai import types

        _client_instance = genai.Client(
            api_key=config.GEMINI_API_KEY,
            http_options=types.HttpOptions(timeout=config.GEMINI_TIMEOUT_S * 1000),
        )
    return _client_instance


def _cosine(a: list[float], b: list[float]) -> float:
    """Plain-Python cosine similarity. Zero vectors → 0.0."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def mask_phone(phone: str) -> str:
    """98XXXXX210 — the only shape a phone may leave the DB in."""
    return phone[:2] + "XXXXX" + phone[-3:]


# ------------------------------------------------------------------ embedding


def embed_texts(texts: list[str]) -> list[list[float]]:
    """ONE batched embedding call. Raises on any failure — callers handle."""
    response = _client().models.embed_content(model=config.EMBED_MODEL, contents=texts)
    return [list(e.values) for e in response.embeddings]


# ----------------------------------------------------------------- clustering


def cluster_complaints(items: list[tuple[str, list[float]]]) -> dict[str, int]:
    """Greedy agglomerative clustering over (complaint_id, embedding) pairs.

    Compare each embedding to running-mean centroids; join the best match
    >= config.SIMILARITY_THRESHOLD, else open a new cluster. Pure and
    deterministic. Returns {complaint_id: cluster_index}.
    """
    assignments: dict[str, int] = {}
    sums: list[list[float]] = []  # per-cluster component sums
    counts: list[int] = []  # per-cluster member counts

    for complaint_id, vec in items:
        best_idx = -1
        best_sim = -1.0
        for idx, (total, n) in enumerate(zip(sums, counts)):
            centroid = [t / n for t in total]
            sim = _cosine(vec, centroid)
            if sim > best_sim:
                best_sim = sim
                best_idx = idx

        if best_idx >= 0 and best_sim >= config.SIMILARITY_THRESHOLD:
            assignments[complaint_id] = best_idx
            counts[best_idx] += 1
            sums[best_idx] = [t + v for t, v in zip(sums[best_idx], vec)]
        else:
            assignments[complaint_id] = len(sums)
            sums.append(list(vec))
            counts.append(1)

    return assignments


# ------------------------------------------------------------------- labeling


def _gemini_generate(prompt: str, json_mode: bool) -> str:
    """ONE Gemini Flash call. Returns raw text. Raises on failure/empty."""
    from google.genai import types

    cfg = types.GenerateContentConfig(
        response_mime_type="application/json" if json_mode else None
    )
    response = _client().models.generate_content(
        model=config.FLASH_MODEL, contents=prompt, config=cfg
    )
    text = (response.text or "").strip()
    if not text:
        raise ValueError("empty response from Gemini")
    return text


def _backup_generate(prompt: str, json_mode: bool) -> str:
    """BACKUP: one OpenAI-compatible chat call (default Groq/Llama 3.3 70B).

    Raises on failure/empty. Only reached when Gemini failed and
    config.LLM_API_KEY is set. A LiteLLM-style "provider/" prefix on the
    configured model (e.g. "openai/llama-3.3-70b-versatile") is stripped.
    """
    import httpx

    model = (
        config.LLM_MODEL.split("/", 1)[1]
        if "/" in config.LLM_MODEL
        else config.LLM_MODEL
    )
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    response = httpx.post(
        f"{config.LLM_BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {config.LLM_API_KEY}"},
        json=payload,
        timeout=config.GEMINI_TIMEOUT_S,
    )
    response.raise_for_status()
    text = (response.json()["choices"][0]["message"]["content"] or "").strip()
    if not text:
        raise ValueError("empty response from backup LLM")
    return text


def _generate_text(prompt: str, json_mode: bool = False) -> str:
    """Gemini first; on failure fall back to the backup LLM IF a key is set.

    With no backup key (tests, and the default demo env) this is Gemini-only
    and re-raises exactly as before, so callers' own fallbacks fire unchanged.
    """
    try:
        return _gemini_generate(prompt, json_mode)
    except Exception:
        if not config.LLM_API_KEY:
            raise
        logger.warning(
            "Gemini generation failed — falling back to backup LLM", exc_info=True
        )
        return _backup_generate(prompt, json_mode)


def _flash_json(prompt: str):
    """ONE generation call in JSON mode (Gemini→backup); returns parsed payload."""
    return json.loads(_generate_text(prompt, json_mode=True))


def label_cluster(texts: list[str]) -> dict:
    """ONE Flash call for one cluster. Any failure → deterministic fallback."""
    fallback = {
        "label": texts[0][:80],
        "category": "other",
        "severity": "medium",
        "severity_rationale": "",
    }
    try:
        prompt = (
            "These citizen complaints have been grouped as one civic issue:\n"
            + "\n".join(f"- {t}" for t in texts)
            + "\nReturn JSON {label(<=90 chars, English), category(one of: "
            "water|roads|electricity|education|health|sanitation|safety|other), "
            "severity(low|medium|high), severity_rationale(<=140 chars)}"
        )
        data = _flash_json(prompt)
        label = str(data["label"]).strip()
        category = str(data["category"]).strip()
        severity = str(data["severity"]).strip()
        rationale = str(data.get("severity_rationale", "")).strip()
        if not label or category not in CATEGORIES or severity not in SEVERITIES:
            raise ValueError(f"invalid enum from Gemini: {data!r}")
        return {
            "label": label[:90],
            "category": category,
            "severity": severity,
            "severity_rationale": rationale[:140],
        }
    except Exception:
        logger.warning("label_cluster: Gemini failed, using fallback", exc_info=True)
        return fallback


# ------------------------------------------------------------------ relations


def infer_relations(clusters: list[dict]) -> list[dict]:
    """ONE Flash call TOTAL over all cluster summaries. Failure → []."""
    if len(clusters) < 2:
        return []
    try:
        summaries = [
            {
                "id": c["id"],
                "label": c["label"],
                "category": c["category"],
                "locality": c["locality"],
            }
            for c in clusters
        ]
        prompt = (
            "Identify up to 4 causal/contributing pairs among these civic "
            "problem clusters. Only pairs with a plausible physical or social "
            "mechanism. Return JSON list of {from_id, to_id, "
            "relation(causes|contributes_to|related_to), "
            "explanation(<=160 chars)}.\n" + json.dumps(summaries, ensure_ascii=False)
        )
        data = _flash_json(prompt)
        # Gemini returns a top-level array; a backup LLM's json_object mode may
        # wrap it in an object like {"pairs": [...]}. Accept either.
        if isinstance(data, dict):
            data = next((v for v in data.values() if isinstance(v, list)), [])
        valid_ids = {c["id"] for c in clusters}
        relations: list[dict] = []
        for item in data:
            if (
                isinstance(item, dict)
                and item.get("relation") in RELATIONS
                and item.get("from_id") in valid_ids
                and item.get("to_id") in valid_ids
                and item["from_id"] != item["to_id"]
            ):
                relations.append(
                    {
                        "from_id": item["from_id"],
                        "to_id": item["to_id"],
                        "relation": item["relation"],
                        "explanation": str(item.get("explanation", ""))[:160],
                    }
                )
        return relations
    except Exception:
        logger.warning("infer_relations: Gemini failed, returning []", exc_info=True)
        return []


# --------------------------------------------------------------------- outbox


def generate_outbox_message(cluster_label: str, language: str, count: int) -> str:
    """Flash-written status update in the citizen's language. Failure → template."""
    try:
        lang_name = "Hindi" if language == "hi" else "English"
        prompt = (
            f"Write a short (<=2 sentences) {lang_name} status update to a "
            f"citizen: their civic complaint about '{cluster_label}' has been "
            f"recorded and grouped with reports from {count} citizens, and is "
            "being tracked for their MP's prioritisation. Warm, factual, no "
            "promises of resolution. Return only the message text."
        )
        return _generate_text(prompt, json_mode=False)
    except Exception:
        logger.warning(
            "generate_outbox_message: Gemini failed, using template", exc_info=True
        )
        if language == "hi":
            return (
                "आपकी शिकायत दर्ज हो गई है। "
                f"'{cluster_label}' समस्या पर {count} नागरिकों की रिपोर्ट "
                "समूहित की गई हैं।"
            )
        return (
            "Your complaint has been recorded. "
            f"{count} citizen reports have been grouped under '{cluster_label}'."
        )


# ------------------------------------------------------- full-analysis (B4/B5)


def analyze_all(session) -> dict:
    """Full pipeline: embed → cluster → label → dedup → relations → score → outbox.

    Idempotent demo reset (POST /analyze): wipes clusters/relations/outbox and
    complaint.cluster_id before rebuilding. Raises only if embedding fails
    (seed.py catches and uses precomputed clusters).
    """
    from sqlmodel import select

    from models import Cluster, ClusterRelation, Complaint, OutboxMessage, Ward

    start = time.monotonic()
    complaints = list(session.exec(select(Complaint)).all())
    wards_by_slug = {w.slug: w for w in session.exec(select(Ward)).all()}

    # 1. embed everything in ONE call (raises to caller on Gemini failure —
    #    deliberately before the wipe so a Gemini outage keeps old state).
    if not complaints:
        return {
            "clusters_created": 0,
            "relations_found": 0,
            "outbox_generated": 0,
            "duration_ms": int((time.monotonic() - start) * 1000),
        }
    embeddings = embed_texts([c.text for c in complaints])

    # 2. greedy clustering (pure)
    assignments = cluster_complaints(
        [(c.id, vec) for c, vec in zip(complaints, embeddings)]
    )

    # 3. wipe previous analysis (idempotency — POST /analyze is a demo reset)
    for complaint in complaints:
        complaint.cluster_id = None
        session.add(complaint)
    for row in session.exec(select(OutboxMessage)).all():
        session.delete(row)
    for row in session.exec(select(ClusterRelation)).all():
        session.delete(row)
    for row in session.exec(select(Cluster)).all():
        session.delete(row)
    session.flush()

    # 4. build Cluster rows
    members_by_index: dict[int, list] = {}
    vec_by_id = {c.id: vec for c, vec in zip(complaints, embeddings)}
    for complaint in complaints:
        members_by_index.setdefault(assignments[complaint.id], []).append(complaint)

    clusters: list[Cluster] = []
    members_by_cluster_id: dict[str, list] = {}
    for _, members in sorted(members_by_index.items()):
        dims = len(vec_by_id[members[0].id])
        centroid = [
            sum(vec_by_id[m.id][d] for m in members) / len(members) for d in range(dims)
        ]
        locality = Counter(m.locality for m in members).most_common(1)[0][0]
        ward = wards_by_slug.get(locality)

        try:
            labeled = label_cluster([m.text for m in members])
        except Exception:  # label_cluster shouldn't raise, but belt & braces
            logger.warning("analyze_all: label_cluster raised", exc_info=True)
            labeled = {
                "label": members[0].text[:80],
                "category": "other",
                "severity": "medium",
                "severity_rationale": "",
            }

        cluster = Cluster(
            label=labeled["label"],
            category=labeled["category"],
            severity=labeled["severity"],
            severity_rationale=labeled["severity_rationale"],
            locality=locality,
            lat=ward.lat if ward else 0.0,
            lng=ward.lng if ward else 0.0,
            complaint_count=len(members),
            citizen_count=dedup.citizen_count(members),
            centroid=centroid,
        )
        session.add(cluster)
        session.flush()  # materialise cluster.id for FK + relations
        for m in members:
            m.cluster_id = cluster.id
            session.add(m)
        clusters.append(cluster)
        members_by_cluster_id[cluster.id] = members

    # 5. relations (ONE Flash call; failure → [])
    relations = infer_relations(
        [
            {
                "id": c.id,
                "label": c.label,
                "category": c.category,
                "locality": c.locality,
            }
            for c in clusters
        ]
    )
    for rel in relations:
        session.add(
            ClusterRelation(
                from_cluster_id=rel["from_id"],
                to_cluster_id=rel["to_id"],
                relation=rel["relation"],
                explanation=rel["explanation"],
            )
        )

    # 6. scoring pass (stub-safe; never fatal)
    try:
        scoring.score_projects(session)
    except Exception:
        logger.warning("analyze_all: scoring pass failed", exc_info=True)

    # 7. outbox: one message per distinct phone per cluster.
    #    Body generated once per (cluster, language) — per-cluster Flash
    #    discipline — then reused for every citizen in that language.
    outbox_generated = 0
    for cluster in clusters:
        seen_phones: set[str] = set()
        body_by_language: dict[str, str] = {}
        for m in members_by_cluster_id[cluster.id]:
            if m.phone is None or m.phone in seen_phones:
                continue
            seen_phones.add(m.phone)
            language = m.original_language if m.original_language == "hi" else "en"
            if language not in body_by_language:
                body_by_language[language] = generate_outbox_message(
                    cluster.label, language, cluster.citizen_count
                )
            session.add(
                OutboxMessage(
                    phone_masked=mask_phone(m.phone),
                    language=language,
                    cluster_label=cluster.label,
                    body=body_by_language[language],
                )
            )
            outbox_generated += 1

    session.commit()
    return {
        "clusters_created": len(clusters),
        "relations_found": len(relations),
        "outbox_generated": outbox_generated,
        "duration_ms": int((time.monotonic() - start) * 1000),
    }


# ------------------------------------------------------ incremental (POST path)


def attach_to_cluster(complaint, session) -> tuple[str, bool]:
    """Incremental clustering for one new complaint. NEVER raises.

    Embed one text → best stored centroid (same locality first, global if the
    locality misses) → attach and update counts/centroid, else create a
    singleton cluster. Any Gemini failure → singleton with fallback label.
    """
    from sqlmodel import select

    from models import Cluster

    try:
        vec = embed_texts([complaint.text])[0]

        candidates = [c for c in session.exec(select(Cluster)).all() if c.centroid]
        local = [c for c in candidates if c.locality == complaint.locality]

        def _best(pool):
            scored = [(_cosine(vec, c.centroid), c) for c in pool]
            return max(scored, key=lambda pair: pair[0]) if scored else (-1.0, None)

        best_sim, best = _best(local)
        if best_sim < config.SIMILARITY_THRESHOLD:
            best_sim, best = _best(candidates)

        if best is not None and best_sim >= config.SIMILARITY_THRESHOLD:
            n = best.complaint_count or len(_members(session, best.id))
            best.centroid = [(c * n + v) / (n + 1) for c, v in zip(best.centroid, vec)]
            complaint.cluster_id = best.id
            session.add(complaint)
            session.flush()
            members = _members(session, best.id)
            best.complaint_count = len(members)
            best.citizen_count = dedup.citizen_count(members)
            session.add(best)
            session.commit()
            return best.id, False

        # no match — new cluster, Gemini-labeled (label_cluster self-falls-back)
        labeled = label_cluster([complaint.text])
        return _create_singleton(complaint, session, vec, labeled), True

    except Exception:
        logger.warning(
            "attach_to_cluster: Gemini/embedding failed, creating fallback singleton",
            exc_info=True,
        )
        hint = getattr(complaint, "category_hint", None)
        labeled = {
            "label": complaint.text[:80],
            "category": hint if hint in CATEGORIES else "other",
            "severity": "medium",
            "severity_rationale": "",
        }
        return _create_singleton(complaint, session, None, labeled), True


def _members(session, cluster_id: str) -> list:
    from sqlmodel import select

    from models import Complaint

    return list(
        session.exec(select(Complaint).where(Complaint.cluster_id == cluster_id)).all()
    )


def _create_singleton(complaint, session, vec, labeled: dict) -> str:
    """Create a one-complaint cluster; locality coords from the ward, else 0.0."""
    from sqlmodel import select

    from models import Cluster, Ward

    ward = session.exec(select(Ward).where(Ward.slug == complaint.locality)).first()
    cluster = Cluster(
        label=labeled["label"],
        category=labeled["category"],
        severity=labeled["severity"],
        severity_rationale=labeled.get("severity_rationale", ""),
        locality=complaint.locality,
        lat=ward.lat if ward else 0.0,
        lng=ward.lng if ward else 0.0,
        complaint_count=1,
        citizen_count=1,
        centroid=vec,
    )
    session.add(cluster)
    session.flush()
    complaint.cluster_id = cluster.id
    session.add(complaint)
    session.commit()
    return cluster.id
