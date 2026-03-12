from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

import joblib
import pandas as pd

# Path to backend/app/models
MODEL_DIR = Path(__file__).resolve().parent / "models"

# Lazy-loaded globals so the model is only loaded once
_model = None
_feature_columns = None


def load_ml_assets():
    """
    Load the trained ML model and feature column list.
    Uses lazy loading so it only loads the first time.
    """
    global _model, _feature_columns

    if _model is None:
        _model = joblib.load(MODEL_DIR / "tar_risk_model.joblib")
        _feature_columns = joblib.load(MODEL_DIR / "feature_columns.joblib")

    return _model, _feature_columns


def estimate_trip_days(start_date: Optional[str], end_date: Optional[str]) -> int:
    """
    Estimate trip duration in days from ISO date strings.
    Returns 0 if dates are missing or invalid.
    """
    try:
        if not start_date or not end_date:
            return 0

        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)

        return max((end - start).days, 0)
    except Exception:
        return 0


def build_ml_features(extracted_fields: Dict[str, Any], flags: List[Dict[str, Any]]) -> Dict[str, Any]:
    tar = extracted_fields.get("tar", {})
    mode = extracted_fields.get("mode", "")

    start_date = tar.get("start_date")
    end_date = tar.get("end_date")
    justification = (tar.get("justification") or "").strip()

    num_high_flags = sum(1 for f in flags if str(f.get("severity", "")).upper() == "HIGH")
    num_med_flags = sum(1 for f in flags if str(f.get("severity", "")).upper() in ("MED", "MEDIUM"))
    num_low_flags = sum(1 for f in flags if str(f.get("severity", "")).upper() == "LOW")

    features = {
        "num_flags": len(flags),
        "num_high_flags": num_high_flags,
        "num_med_flags": num_med_flags,
        "num_low_flags": num_low_flags,
        "trip_length_days": estimate_trip_days(start_date, end_date),
        "justification_len": len(justification),
        "has_packet": int(mode == "packet"),
    }

    return features


def run_ml_inference(extracted_fields: Dict[str, Any], flags: List[str]) -> Dict[str, Any]:
    """
    Run the trained model against the current TAR review features.
    Returns prediction, confidence, and feature data.
    Fails safely if model loading or prediction has an issue.
    """
    try:
        model, feature_columns = load_ml_assets()

        feature_row = build_ml_features(extracted_fields, flags)
        df = pd.DataFrame([feature_row])

        # Add any missing columns expected by training
        for col in feature_columns:
            if col not in df.columns:
                df[col] = 0

        # Keep only the columns in the exact training order
        df = df[feature_columns]

        prediction = model.predict(df)[0]

        confidence = None
        probabilities = None

        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(df)[0]
            probabilities = [float(p) for p in probs]
            confidence = float(max(probs))

        return {
            "ml_prediction": int(prediction) if str(prediction).isdigit() else prediction,
            "ml_confidence": confidence,
            "ml_probabilities": probabilities,
            "ml_features_used": feature_row,
            "ml_error": None,
        }

    except Exception as e:
        return {
            "ml_prediction": None,
            "ml_confidence": None,
            "ml_probabilities": None,
            "ml_features_used": None,
            "ml_error": str(e),
        }