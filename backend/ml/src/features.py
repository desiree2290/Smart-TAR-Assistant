from datetime import datetime
from typing import Any, Dict, List
from collections import Counter

LABELS = ["approve", "clarify", "hold"]


def _days_between(start: str, end: str) -> int:
    try:
        s = datetime.strptime(start, "%Y-%m-%d")
        e = datetime.strptime(end, "%Y-%m-%d")
        return max(0, (e - s).days)
    except Exception:
        return 0


from datetime import datetime
from typing import Any, Dict, List
from collections import Counter

LABELS = ["approve", "clarify", "hold"]


def _days_between(start: str, end: str) -> int:
    try:
        s = datetime.strptime(start, "%Y-%m-%d")
        e = datetime.strptime(end, "%Y-%m-%d")
        return max(0, (e - s).days)
    except Exception:
        return 0


def build_feature_row(
    row: Dict[str, Any],
    top_codes: List[str],
    include_flag_codes: bool = False,
) -> Dict[str, Any]:
    tar = row["tar"]
    p3 = row["phase3"]

    flags = p3.get("flags", [])
    codes = [f.get("code", "") for f in flags]
    code_counts = Counter(codes)

    num_high_flags = sum(1 for f in flags if (f.get("severity") or 0) >= 9)
    num_med_flags = sum(1 for f in flags if (f.get("severity") or 0) == 6)
    num_low_flags = sum(1 for f in flags if (f.get("severity") or 0) == 3)

    feats: Dict[str, Any] = {
        "num_flags": len(flags),
        "num_high_flags": num_high_flags,
        "num_med_flags": num_med_flags,
        "num_low_flags": num_low_flags,
        "trip_length_days": _days_between(
            tar.get("start_date", ""),
            tar.get("end_date", "")
        ),
        "justification_len": len(tar.get("justification", "") or ""),
        "has_packet": 1 if row.get("tar", {}).get("packet", False) else 0,
    }

    if include_flag_codes:
        for c in top_codes:
            feats[f"code_{c}"] = 1 if code_counts.get(c, 0) > 0 else 0

    return feats