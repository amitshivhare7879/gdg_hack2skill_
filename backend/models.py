from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def _uuid() -> str:
    return str(uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Ward(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    slug: str = Field(unique=True, index=True)
    name: str
    lat: float
    lng: float
    population: int
    literacy_rate: float
    connectivity_rate: float
    indicators: dict = Field(default_factory=dict, sa_column=Column(JSON))
    sources: list = Field(default_factory=list, sa_column=Column(JSON))


class Complaint(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    text: str
    original_language: str
    locality: str = Field(index=True)
    category_hint: str
    phone: str | None = Field(default=None)
    photo_path: str | None = Field(default=None)
    cluster_id: str | None = Field(default=None, foreign_key="cluster.id", index=True)
    created_at: datetime = Field(default_factory=_utcnow)


class Cluster(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    label: str
    category: str
    severity: str
    severity_rationale: str = Field(default="")
    locality: str = Field(index=True)
    lat: float
    lng: float
    complaint_count: int = Field(default=0)
    citizen_count: int = Field(default=0)
    centroid: list | None = Field(default=None, sa_column=Column(JSON))


class ClusterRelation(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    from_cluster_id: str = Field(foreign_key="cluster.id")
    to_cluster_id: str = Field(foreign_key="cluster.id")
    relation: str
    explanation: str


class ProposedProject(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    title: str
    category: str
    locality: str
    feasibility_score: int
    feasibility_evidence: str
    linked_cluster_ids: list = Field(default_factory=list, sa_column=Column(JSON))
    demand_score: float = Field(default=0)
    demand_evidence: str = Field(default="")
    severity_score: float = Field(default=0)
    severity_evidence: str = Field(default="")
    data_sources: list = Field(default_factory=list, sa_column=Column(JSON))


class OutboxMessage(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    phone_masked: str
    language: str
    cluster_label: str
    body: str
    status: str = Field(default="queued")
    created_at: datetime = Field(default_factory=_utcnow)
