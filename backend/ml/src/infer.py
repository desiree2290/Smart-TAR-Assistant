from typing import Dict, Any, List
from pathlib import Path

import joblib
import pandas as pd

from .features import build_feature_row

MODEL_PATH = Path("ml/models/model_v1_logreg.pkl")
ARTIFACTS = Path("ml/data/processed/artifacts.pkl")


class TarActionPredictor:
    def __init__(self):
        saved = joblib.load(MODEL_PATH)
        self.model = saved["model"]
        self.columns: List[str] = saved["columns"]

        data = joblib.load(ARTIFACTS)
        self.top_codes = data["top_codes"]

    def predict(self, row: Dict[str, Any]) -> Dict[str, Any]:
        feats = build_feature_row(
            row,
            self.top_codes,
            include_flag_codes=False,
        )

        X = pd.DataFrame([feats]).reindex(columns=self.columns, fill_value=0)

        pred = self.model.predict(X)[0]
        proba = self.model.predict_proba(X)[0]
        classes = list(self.model.classes_)

        return {
            "predicted_action": pred,
            "probabilities": {c: round(float(p), 4) for c, p in zip(classes, proba)},
        }