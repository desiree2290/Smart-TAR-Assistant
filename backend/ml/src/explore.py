import json
from collections import Counter, defaultdict
from pathlib import Path

import matplotlib.pyplot as plt

IN_PATH = Path("ml/data/raw/tar_cases.jsonl")
FIG_DIR = Path("ml/reports/figures")
REPORT = Path("ml/reports/eda_summary.md")


def load_rows():
    rows = []
    with IN_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            rows.append(json.loads(line))
    return rows


def main():
    rows = load_rows()
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)

    labels = [r["label"] for r in rows]
    label_counts = Counter(labels)

    # risk score distribution by label
    scores_by_label = defaultdict(list)
    for r in rows:
        scores_by_label[r["label"]].append(r["phase3"]["risk_score"])

        # flag count distribution by label
    flag_counts_by_label = defaultdict(list)
    for r in rows:
        flag_counts_by_label[r["label"]].append(len(r["phase3"]["flags"]))

    # Plot: label distribution
    plt.figure()
    plt.bar(label_counts.keys(), label_counts.values())
    plt.title("Label Distribution")
    plt.savefig(FIG_DIR / "label_distribution.png", bbox_inches="tight")
    plt.close()

    # Plot: average risk score by label
    avg_scores = {k: sum(v) / max(1, len(v)) for k, v in scores_by_label.items()}
    plt.figure()
    plt.bar(avg_scores.keys(), avg_scores.values())
    plt.title("Avg Risk Score by Label")
    plt.savefig(FIG_DIR / "avg_score_by_label.png", bbox_inches="tight")
    plt.close()

        # Plot: average flag count by label
    avg_flag_counts = {k: sum(v) / max(1, len(v)) for k, v in flag_counts_by_label.items()}
    plt.figure()
    plt.bar(avg_flag_counts.keys(), avg_flag_counts.values())
    plt.title("Avg Flag Count by Label")
    plt.savefig(FIG_DIR / "avg_flag_count_by_label.png", bbox_inches="tight")
    plt.close()

    # Top flag codes overall
    flag_counts = Counter()
    for r in rows:
        for fl in r["phase3"]["flags"]:
            flag_counts[fl["code"]] += 1

    top_flags = flag_counts.most_common(10)

    md = []
    md.append("# EDA Summary\n")
    md.append("## Label Counts\n")
    for k, v in label_counts.items():
        md.append(f"- **{k}**: {v}\n")

    md.append("\n## Top 10 Flag Codes\n")
    for code, n in top_flags:
        md.append(f"- {code}: {n}\n")

    md.append("\n## Figures\n")
    md.append("- label_distribution.png\n")
    md.append("- avg_score_by_label.png\n")
    md.append("- avg_flag_count_by_label.png\n")

    REPORT.write_text("".join(md), encoding="utf-8")
    print(f"Wrote {REPORT} and figures to {FIG_DIR}")


if __name__ == "__main__":
    main()