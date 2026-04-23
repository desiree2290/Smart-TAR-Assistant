from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import TravelRequest, AIReview
from fastapi import Depends
from collections import Counter
from pathlib import Path
import json

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

DATA_DIR = Path(__file__).resolve().parent.parent / "analytics_data"
ANALYTICS_FILE = DATA_DIR / "analytics_data.json"

@router.get("")
def get_analytics():
    if not ANALYTICS_FILE.exists():
        raise HTTPException(status_code=404, detail="analytics_data.json not found")

    try:
        with open(ANALYTICS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid analytics JSON")

@router.get("/model-metrics")
@router.get("/model-metrics")
def get_model_metrics():
    if not ANALYTICS_FILE.exists():
        raise HTTPException(status_code=404, detail="analytics_data.json not found")

    data = json.loads(ANALYTICS_FILE.read_text(encoding="utf-8"))

    model_metrics = data.get("model_metrics", {})

    return {
        "models": {
            "logistic_regression": model_metrics.get("logistic_regression", {}),
            "random_forest": model_metrics.get("random_forest", {})
        },
        "summary": model_metrics.get("summary_metrics", {}),
        "confusion_matrix": model_metrics.get("confusion_matrix", []),
        "class_counts": model_metrics.get("class_counts", {}),
        "training_curves": model_metrics.get("training_curves", {})
    }

@router.get("/request-stats")
def get_request_stats():
    if not ANALYTICS_FILE.exists():
        raise HTTPException(status_code=404, detail="analytics_data.json not found")

    data = json.loads(ANALYTICS_FILE.read_text(encoding="utf-8"))
    request_stats = data.get("request_stats", {})

    return {
        "total_requests": request_stats.get("total_requests", 0),
        "status_counts": request_stats.get("status_counts", {}),
        "top_destinations": request_stats.get("top_destinations", []),
    }


@router.get("/flag-breakdown")
def get_flag_breakdown(db: Session = Depends(get_db)):
    rows = db.query(AIReview).all()

    flag_counter = Counter()

    for row in rows:
        try:
            flags = json.loads(row.flags_json or "[]")
        except Exception:
            flags = []

        for flag in flags:
            flag_type = str(flag.get("type") or "UNKNOWN").strip()
            flag_counter[flag_type] += 1

    return {
        "flag_breakdown": [
            {"name": name, "value": count}
            for name, count in flag_counter.most_common()
        ]
    }

