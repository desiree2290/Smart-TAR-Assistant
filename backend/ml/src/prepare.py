import json
from pathlib import Path
from collections import Counter
from typing import Any, Dict, List, Tuple

import pandas as pd
from sklearn.model_selection import train_test_split
import joblib

from .features import build_feature_row, LABELS

IN_PATH = Path("ml/data/raw/tar_cases.jsonl")
OUT_DIR = Path("ml/data/processed")
ARTIFACTS = OUT_DIR / "artifacts.pkl"


def load_rows() -> List[Dict[str, Any]]:
    rows = []
    with IN_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            rows.append(json.loads(line))
    return rows


def compute_top_flag_codes(rows: List[Dict[str, Any]], top_n: int = 25) -> List[str]:
    ctr = Counter()
    for r in rows:
        for fl in r["phase3"]["flags"]:
            ctr[fl["code"]] += 1
    return [c for c, _ in ctr.most_common(top_n)]


def main(top_n_codes: int = 25, test_size: float = 0.2, seed: int = 7):
    rows = load_rows()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    top_codes = compute_top_flag_codes(rows, top_n=top_n_codes)

    X = []
    y = []
    for r in rows:
        X.append(build_feature_row(r, top_codes, include_flag_codes=False))
        y.append(r["label"])

    X_df = pd.DataFrame(X).fillna(0)
    y_ser = pd.Series(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X_df, y_ser, test_size=test_size, random_state=seed, stratify=y_ser
    )

    joblib.dump(
        {
            "X_train": X_train,
            "X_test": X_test,
            "y_train": y_train,
            "y_test": y_test,
            "top_codes": top_codes,
            "label_order": LABELS,
        },
        ARTIFACTS,
    )

    print(f"Saved processed artifacts to {ARTIFACTS}")
    print("Train size:", len(X_train), "Test size:", len(X_test))


if __name__ == "__main__":
    main()