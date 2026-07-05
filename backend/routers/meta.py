"""Meta endpoints (B5): GET /api/health, GET /api/localities."""

from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from database import get_session
from models import Cluster, Complaint, Ward

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/health")
def health(session: Session = Depends(get_session)) -> dict:
    complaints = session.exec(select(func.count()).select_from(Complaint)).one()
    clusters = session.exec(select(func.count()).select_from(Cluster)).one()
    return {"status": "ok", "complaints": complaints, "clusters": clusters}


@router.get("/localities")
def localities(session: Session = Depends(get_session)) -> dict:
    wards = session.exec(select(Ward)).all()
    return {
        "localities": [
            {
                "slug": w.slug,
                "name": w.name,
                "lat": w.lat,
                "lng": w.lng,
                "population": w.population,
                "literacy_rate": w.literacy_rate,
                "connectivity_rate": w.connectivity_rate,
            }
            for w in wards
        ]
    }
