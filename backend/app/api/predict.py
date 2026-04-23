from datetime import date
from pathlib import Path
import re

import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["predict"])

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "tar_live_predictor.joblib"

positive_words = {
    "required", "support", "mission", "readiness", "official",
    "training", "organizational", "coordination", "planning",
    "aligned", "benefit", "objectives"
}

negative_words = {
    "bad", "problem", "weak", "missing", "invalid",
    "late", "incomplete", "unclear", "short"
}


class PredictRequest(BaseModel):
    destination_city: str
    start_date: date
    end_date: date
    justification: str
    has_packet: int = 1
    num_flags: int = 0
    num_high_flags: int = 0
    num_med_flags: int = 0
    num_low_flags: int = 0


def clean_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def simple_sentiment_score(text: str) -> int:
    words = str(text).lower().split()
    pos = sum(1 for w in words if w in positive_words)
    neg = sum(1 for w in words if w in negative_words)
    return pos - neg


def build_features(payload: PredictRequest) -> pd.DataFrame:
    trip_length_days = max((payload.end_date - payload.start_date).days, 1)
    justification_clean = clean_text(payload.justification)
    justification_len = len(payload.justification)
    is_short_justification = int(justification_len < 30)
    flag_density = payload.num_flags / max(trip_length_days, 1)
    risk_score = payload.num_high_flags * 9 + payload.num_med_flags * 6 + payload.num_low_flags * 3
    sentiment = simple_sentiment_score(justification_clean)

    row = {
        "destination_city": payload.destination_city,
        "trip_length_days": trip_length_days,
        "has_packet": payload.has_packet,
        "num_flags": payload.num_flags,
        "num_high_flags": payload.num_high_flags,
        "num_med_flags": payload.num_med_flags,
        "num_low_flags": payload.num_low_flags,
        "risk_score": risk_score,
        "justification_len": justification_len,
        "is_short_justification": is_short_justification,
        "flag_density": flag_density,
        "sentiment_score": sentiment,
        "justification_clean": justification_clean,
    }

    return pd.DataFrame([row])


def build_explanations(features: dict) -> list[str]:
    reasons = []

    if features["risk_score"] >= 20:
        reasons.append("High risk score increased review concern.")
    elif features["risk_score"] >= 10:
        reasons.append("Moderate risk score contributed to caution.")

    if features["num_high_flags"] >= 2:
        reasons.append("Multiple high-priority flags were detected.")
    elif features["num_flags"] >= 2:
        reasons.append("Several review flags were present.")

    if features["is_short_justification"] == 1:
        reasons.append("Justification was unusually short.")
    elif features["sentiment_score"] >= 2:
        reasons.append("Justification language reflected stronger mission alignment.")

    if features["has_packet"] == 0:
        reasons.append("Supporting packet was missing.")
    else:
        reasons.append("Supporting packet was included.")

    return reasons


@router.post("/predict")
def predict(payload: PredictRequest):
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=404, detail="Saved prediction model not found")

    try:
        model = joblib.load(MODEL_PATH)
        X_live = build_features(payload)

        prediction = model.predict(X_live)[0]

        probabilities = {}
        confidence = None

        if hasattr(model.named_steps["model"], "predict_proba"):
            proba = model.predict_proba(X_live)[0]
            classes = list(model.named_steps["model"].classes_)
            probabilities = {
                cls: round(float(p), 4) for cls, p in zip(classes, proba)
            }
            confidence = round(float(np.max(proba)), 4)

        feature_row = X_live.iloc[0].to_dict()

        return {
            "prediction": prediction,
            "confidence": confidence,
            "probabilities": probabilities,
            "features_used": feature_row,
            "explanations": build_explanations(feature_row),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")