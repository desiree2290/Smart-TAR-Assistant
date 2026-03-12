from pathlib import Path
import joblib

from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix

ARTIFACTS = Path("ml/data/processed/artifacts.pkl")
MODEL_PATH = Path("app/models/tar_risk_model.joblib")
FEATURES_PATH = Path("app/models/feature_columns.joblib")
REPORT = Path("ml/reports/model_report_v1.md")


def main():
    data = joblib.load(ARTIFACTS)
    X_train, y_train = data["X_train"], data["y_train"]
    X_test, y_test = data["X_test"], data["y_test"]

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    FEATURES_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)

    clf = LogisticRegression(
        max_iter=2000,
        solver="lbfgs"
)
    clf.fit(X_train, y_train)

    preds = clf.predict(X_test)

    rep = classification_report(y_test, preds, digits=3)
    cm = confusion_matrix(y_test, preds, labels=["approve", "clarify", "hold"])

    joblib.dump(clf, MODEL_PATH)
    joblib.dump(list(X_train.columns), FEATURES_PATH)

    REPORT.write_text(
        "# Model Report v1 (Logistic Regression)\n\n"
        "## Classification Report\n\n"
        f"```\n{rep}\n```\n\n"
        "## Confusion Matrix (approve, clarify, hold)\n\n"
        f"```\n{cm}\n```\n",
        encoding="utf-8",
    )

    print(f"Saved model to {MODEL_PATH}")
    print(f"Saved report to {REPORT}")


if __name__ == "__main__":
    main()