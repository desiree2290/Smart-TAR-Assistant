import json
import random
from datetime import date, timedelta
from pathlib import Path
from typing import Dict, Any, List

from app.review import _run_phase3  # uses your existing phase3 engine


DESTS = ["San Diego", "San Jose", "Los Angeles", "Norfolk", "Arlington", "Alexandria"]
TRAVELERS = ["Test Traveler", "A. Smith", "D. Hodge", "J. Rivera", "K. Patel"]

OUT_PATH = Path("ml/data/raw/tar_cases.jsonl")


def _rand_date(start: date, end: date) -> date:
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, max(0, delta)))


def _make_base_tar() -> Dict[str, Any]:
    d0 = _rand_date(date(2026, 1, 1), date(2026, 6, 30))
    length = random.randint(1, 10)
    d1 = d0 + timedelta(days=length)

    dest = random.choice(DESTS)
    traveler = random.choice(TRAVELERS)

    # justification: sometimes short to induce a flag in Phase 2
    justification = "Conference travel." if random.random() < 0.20 else \
        "Attending conference to support program milestones and coordinate with stakeholders."

    return {
        "destination_city": dest,
        "start_date": d0.isoformat(),
        "end_date": d1.isoformat(),
        "traveler_name": traveler,
        "justification": justification,
    }


def _make_phase2_flags_for_scenario(tar: Dict[str, Any], scenario: str) -> List[Dict[str, Any]]:
    """
    scenario: 'approve' | 'clarify' | 'hold'
    Creates Phase 2 style flags that (when bridged) should push Phase 3 score
    into the desired risk band.

    With your scoring:
      LOW    < 35
      MEDIUM >= 35
      HIGH   >= 70
    and severities: LOW=3, MED=6, HIGH=9
    """
    flags: List[Dict[str, Any]] = []

    if scenario == "approve":
        # keep it clean; maybe an occasional LOW/none
        if random.random() < 0.10:
            flags.append({
                "type": "MISSING_RENTAL",
                "severity": "LOW",
                "description": "Rental car details are missing (ok if no rental needed).",
                "evidence": {},
            })
        return flags

    if scenario == "clarify":
        # Aim score ~ 35-69: e.g. 6+9+9 = 24 (too low)
        # Better: 6 + 9 + 9 + 9 = 33 (still low) -> need >= 35
        # So use: 6 + 9 + 9 + 9 + 3 = 36  
        flags.extend([
            {
                "type": "MISSING_JUSTIFICATION",
                "severity": "MED",
                "description": "Justification is too short. Add more detail on purpose/benefit.",
                "evidence": {},
            },
            {
                "type": "DESTINATION_MISMATCH_HOTEL",
                "severity": "HIGH",
                "description": "HOTEL_CITY does not match TAR destination.",
                "evidence": {"HOTEL_CITY": "HOTEL_CITY: (mismatch injected)"},
            },
            {
                "type": "MISSING_PARKING",
                "severity": "LOW",
                "description": "Airport parking estimate is missing (ok if not driving/parking).",
                "evidence": {},
            },
            {
                "type": "MISSING_RENTAL",
                "severity": "LOW",
                "description": "Rental car details are missing (ok if no rental needed).",
                "evidence": {},
            },
            {
                "type": "MISSING_FIELD",
                "severity": "HIGH",
                "description": "HOTEL_CHECKIN_DATE is missing/invalid (expected YYYY-MM-DD).",
                "evidence": {"HOTEL_CHECKIN_DATE": "HOTEL_CHECKIN_DATE: (missing injected)"},
            },
        ])
        return [
            {
            "type": "MISSING_JUSTIFICATION",
            "severity": "MED",
            "description": "Justification is too short. Add more detail on purpose/benefit.",
            "evidence": {},
            },
            {
                "type": "DESTINATION_MISMATCH_HOTEL",
                "severity": "HIGH",
                "description": "HOTEL_CITY does not match TAR destination.",
                "evidence": {"HOTEL_CITY": "HOTEL_CITY: (mismatch injected)"},
            },
            {
                "type": "MISSING_FIELD",
                "severity": "HIGH",
                "description": "HOTEL_CHECKIN_DATE is missing/invalid (expected YYYY-MM-DD).",
                "evidence": {"HOTEL_CHECKIN_DATE": "HOTEL_CHECKIN_DATE: (missing injected)"},
            },
            {
                "type": "MISSING_PARKING",
                "severity": "HIGH",
                "description": "Airport parking estimate is missing (clarify if needed).",
                "evidence": {},
            },
            {
                "type": "RENTAL_OUT_OF_RANGE",
                "severity": "HIGH",
                "description": "Rental dates are outside TAR travel window (clarify if rental is required).",
                "evidence": {},
            },
        ]

    if scenario == "hold":
        # Aim score >= 70: easiest is 8 HIGH flags -> 8*9=72 
        flags.extend([
            {
                "type": "MISSING_HOTEL",
                "severity": "HIGH",
                "description": "Hotel reservation details are missing from the packet.",
                "evidence": {},
            },
            {
                "type": "DESTINATION_MISMATCH_FLIGHT",
                "severity": "HIGH",
                "description": "FLIGHT_DESTINATION does not match TAR destination.",
                "evidence": {"FLIGHT_DESTINATION": "FLIGHT_DESTINATION: (mismatch injected)"},
            },
            {
                "type": "DESTINATION_MISMATCH_HOTEL",
                "severity": "HIGH",
                "description": "HOTEL_CITY does not match TAR destination.",
                "evidence": {"HOTEL_CITY": "HOTEL_CITY: (mismatch injected)"},
            },
            {
                "type": "DESTINATION_MISMATCH_MIE",
                "severity": "HIGH",
                "description": "MIE_LOCALITY does not match TAR destination.",
                "evidence": {"MIE_LOCALITY": "MIE_LOCALITY: (mismatch injected)"},
            },
            {
                "type": "FLIGHT_OUT_OF_RANGE",
                "severity": "HIGH",
                "description": "FLIGHT dates are outside TAR travel window.",
                "evidence": {},
            },
            {
                "type": "HOTEL_OUT_OF_RANGE",
                "severity": "HIGH",
                "description": "HOTEL dates are outside TAR travel window.",
                "evidence": {},
            },
            {
                "type": "PARKING_OUT_OF_RANGE",
                "severity": "HIGH",
                "description": "PARKING dates are outside TAR travel window.",
                "evidence": {},
            },
            {
                "type": "MISSING_FIELD",
                "severity": "HIGH",
                "description": "FLIGHT_RETURN_DATE is missing/invalid (expected YYYY-MM-DD).",
                "evidence": {"FLIGHT_RETURN_DATE": "FLIGHT_RETURN_DATE: (missing injected)"},
            },
        ])
        return flags

    raise ValueError(f"Unknown scenario: {scenario}")


def generate(n: int = 3000, seed: int = 7) -> None:
    random.seed(seed)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    targets = {"approve": n // 3, "clarify": n // 3, "hold": n - 2 * (n // 3)}
    counts = {"approve": 0, "clarify": 0, "hold": 0}

    with OUT_PATH.open("w", encoding="utf-8") as f:
        for label in ["approve", "clarify", "hold"]:
            for _ in range(targets[label]):
                tar = _make_base_tar()
                ph2_flags = _make_phase2_flags_for_scenario(tar, label)

                p3 = _run_phase3(
                    {
                        "traveler_name": tar["traveler_name"],
                        "start_date": tar["start_date"],
                        "end_date": tar["end_date"],
                        "destination_city": tar["destination_city"],
                    },
                    phase2_flags=ph2_flags
                )

                # Keep the actual label derived from risk_level for auditability
                derived = {"LOW": "approve", "MEDIUM": "clarify", "HIGH": "hold"}[p3["risk_level"]]

                row = {
                    "tar": tar,
                    "phase2_flags": ph2_flags,
                    "phase3": p3,
                    "label": derived,
                    "target_label": label,  # what we intended to generate
                }
                f.write(json.dumps(row) + "\n")
                counts[derived] += 1

    print(f"Wrote {sum(counts.values())} rows to {OUT_PATH}")
    print("Derived label counts:", counts)
    print("Target counts:", targets)


if __name__ == "__main__":
    generate()