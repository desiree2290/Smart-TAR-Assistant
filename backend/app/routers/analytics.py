from fastapi import APIRouter
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import TravelRequest
from fastapi import Depends
from collections import Counter
from pathlib import Path
import json

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/model-metrics")
def get_model_metrics():
    path = Path("app/analytics_data/model_metrics.json")

    if not path.exists():
        return {"error": "metrics not generated yet"}

    return json.loads(path.read_text(encoding="utf-8"))


@router.get("/request-stats")
def get_request_stats(db: Session = Depends(get_db)):
    rows = db.query(TravelRequest).all()

    statuses = [str(r.status or "unknown").lower() for r in rows]
    counts = Counter(statuses)

    destination_counts = Counter(
        str(r.destination_city or "Unknown") for r in rows
    )

    top_destinations = [
        {"name": name, "value": count}
        for name, count in destination_counts.most_common(5)
    ]

    return {
        "total_requests": len(rows),
        "status_counts": {
            "submitted": counts.get("submitted", 0),
            "approved": counts.get("approved", 0),
            "disapproved": counts.get("disapproved", 0),
            "kickback": counts.get("kickback", 0),
        },
        "top_destinations": top_destinations,
    }