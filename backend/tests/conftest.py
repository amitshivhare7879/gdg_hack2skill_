"""Shared fixtures — in-memory DB + mocked Gemini. NO test may hit the network."""

import json
from types import SimpleNamespace

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import config
import models  # noqa: F401  (register tables on SQLModel.metadata)
from services import ai


@pytest.fixture
def session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


@pytest.fixture(autouse=True)
def _no_real_gemini(monkeypatch):
    """Safety net: unmocked client access fails loudly instead of hitting the API."""
    monkeypatch.setattr(ai, "_client_instance", None)

    def _blocked():
        raise AssertionError(
            "test tried to build a real Gemini client — install fake_gemini"
        )

    monkeypatch.setattr(ai, "_client", _blocked)
    # Disable the backup LLM by default so no test hits a real endpoint even if
    # the dev's environment has LLM_API_KEY set. Backup-path tests opt back in.
    monkeypatch.setattr(config, "LLM_API_KEY", "")


class FakeGemini:
    """Stands in for the google-genai client.

    embed_fn(text) -> vector, or raises to exercise embed fallbacks.
    respond_fn(prompt) -> str (Flash reply), or raises for Flash fallbacks.
    Records every call so tests can assert batching / call counts.
    """

    def __init__(self, embed_fn=None, respond_fn=None):
        self.embed_fn = embed_fn
        self.respond_fn = respond_fn
        self.embed_calls: list[list[str]] = []
        self.generate_calls: list[str] = []
        self.models = SimpleNamespace(
            embed_content=self._embed_content,
            generate_content=self._generate_content,
        )

    def _embed_content(self, *, model, contents, config=None):
        texts = list(contents) if isinstance(contents, list) else [contents]
        self.embed_calls.append(texts)
        if self.embed_fn is None:
            raise ConnectionError("embed unavailable (fake)")
        return SimpleNamespace(
            embeddings=[SimpleNamespace(values=self.embed_fn(t)) for t in texts]
        )

    def _generate_content(self, *, model, contents, config=None):
        self.generate_calls.append(contents)
        if self.respond_fn is None:
            raise ConnectionError("flash unavailable (fake)")
        return SimpleNamespace(text=self.respond_fn(contents))


@pytest.fixture
def fake_gemini(monkeypatch):
    """Factory: install a FakeGemini as services.ai._client and return it."""

    def _install(embed_fn=None, respond_fn=None) -> FakeGemini:
        fake = FakeGemini(embed_fn=embed_fn, respond_fn=respond_fn)
        monkeypatch.setattr(ai, "_client", lambda: fake)
        return fake

    return _install


@pytest.fixture
def fake_backup_llm(monkeypatch):
    """Enable the backup LLM with a canned httpx.post response (no network).

    _install(content) sets a backup key and patches httpx.post to return
    `content` as the chat completion. Returns a recorder whose .calls holds
    each request.
    """
    import httpx

    def _install(content: str):
        monkeypatch.setattr(config, "LLM_API_KEY", "test-llm-key")
        recorder = SimpleNamespace(calls=[])

        class _Resp:
            def raise_for_status(self):
                pass

            def json(self):
                return {"choices": [{"message": {"content": content}}]}

        def _post(url, *, headers=None, json=None, timeout=None):
            recorder.calls.append({"url": url, "json": json, "headers": headers})
            return _Resp()

        monkeypatch.setattr(httpx, "post", _post)
        return recorder

    return _install


def label_json(label, category, severity, rationale=""):
    return json.dumps(
        {
            "label": label,
            "category": category,
            "severity": severity,
            "severity_rationale": rationale,
        }
    )


def smart_responder(labels_by_keyword: dict[str, str] | None = None):
    """Route Flash prompts: relation prompts → [], label prompts → canned JSON,
    outbox prompts → plain text. Keeps analyze_all tests readable."""

    def _respond(prompt: str) -> str:
        if "causal/contributing pairs" in prompt:
            return "[]"
        if "Return JSON {label" in prompt:
            if labels_by_keyword:
                for keyword, payload in labels_by_keyword.items():
                    if keyword in prompt:
                        return payload
            return label_json("Generic civic issue", "other", "medium")
        return "Test outbox message body."

    return _respond
