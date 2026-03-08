# app/review.py

import re
from datetime import datetime
from typing import Dict, Any, Optional

from app.phase3.risk_engine import RiskEngine
from app.phase3.rules import MissingRequiredFieldRule, DateOrderRule
from app.phase3.summary_engine import SummaryEngine

from ml.src.infer import TarActionPredictor

LABEL_RE = re.compile(r"^([A-Z0-9_]+):\s*(.*)\s*$")

# Airport code -> city mapping for parking heuristics
AIRPORT_CODES = {
    "SAN": "san diego",
    "SJC": "san jose",
    "LAX": "los angeles",
}

_PREDICTOR = None

# -------------------------
# Utility helpers
# -------------------------

def _get_predictor():
    global _PREDICTOR
    if _PREDICTOR is None:
        _PREDICTOR = TarActionPredictor()
    return _PREDICTOR

def _parse_iso_date(s: str) -> Optional[str]:
    s = (s or "").strip()
    if not s:
        return None
    try:
        datetime.strptime(s, "%Y-%m-%d")
        return s
    except ValueError:
        return None


def _norm_loc(s: str) -> str:
    return " ".join((s or "").strip().lower().replace(",", " ").split())


def _norm_city(s: str) -> str:
    return " ".join((s or "").lower().replace(",", "").replace(".", "").split())


def _in_window(d: Optional[str], start: str, end: str) -> bool:
    if not d:
        return True
    return start <= d <= end


# -------------------------
# Packet parsing
# -------------------------

def _extract_packet_fields(doc_text: str) -> Dict[str, Any]:
    fields: Dict[str, str] = {}
    evidence: Dict[str, str] = {}

    for line in (doc_text or "").splitlines():
        line = line.strip()
        m = LABEL_RE.match(line)
        if not m:
            continue
        label, value = m.group(1), m.group(2).strip()
        fields[label] = value
        evidence[label] = line

    return {"packet_fields": fields, "packet_evidence": evidence}


def _is_packet(doc_text: Optional[str]) -> bool:
    if not doc_text:
        return False

    markers = [
        "TAR SUPPORTING DOCUMENTS PACKET",
        "FLIGHT_DESTINATION:",
        "HOTEL_CITY:",
        "RENTAL_PICKUP_CITY:",
        "PARKING_LOCATION:",
        "MIE_LOCALITY:",
    ]

    t = doc_text.upper()
    return any(m in t for m in markers)


def parking_matches_destination(parking: str, dest: str) -> bool:
    parking = (parking or "").strip()
    dest = (dest or "").strip()

    if not parking or not dest:
        return True

    p_upper = parking.upper()
    d_norm = _norm_city(dest)

    first = p_upper.split()[0] if p_upper.split() else ""
    if first in AIRPORT_CODES:
        return AIRPORT_CODES[first] in d_norm

    p_norm = _norm_city(parking)
    return (p_norm in d_norm) or (d_norm in p_norm)


# -------------------------
# Main Review Engine
# -------------------------

def run_review(request_payload: Dict[str, Any], doc_text: Optional[str]) -> Dict[str, Any]:

    destination = request_payload["destination_city"].strip()
    start_date = request_payload["start_date"].strip()
    end_date = request_payload["end_date"].strip()
    justification = request_payload["justification"].strip()
    traveler = request_payload["traveler_name"].strip()

    flags: list[dict[str, Any]] = []
    questions: list[str] = []

    # -------------------------
    # Rule 0: Justification
    # -------------------------

    if len(justification) < 30:
        flags.append({
            "type": "MISSING_JUSTIFICATION",
            "severity": "MED",
            "description": "Justification is too short. Add more detail on purpose/benefit."
        })
        questions.append("Can you expand the justification with purpose and expected benefit?")

    tar_for_phase3 = {
        "traveler_name": traveler,
        "start_date": start_date,
        "end_date": end_date,
        "destination_city": destination,
        "justification": justification,
    }
    
    # -------------------------
    # Packet Path
    # -------------------------

    if doc_text and _is_packet(doc_text):

        pkt = _extract_packet_fields(doc_text)
        pf = pkt["packet_fields"]
        ev = pkt["packet_evidence"]

        tar_dest_norm = _norm_loc(destination)
        tar_start = _parse_iso_date(start_date) or start_date
        tar_end = _parse_iso_date(end_date) or end_date

        def add_flag(rule_type: str, severity: str, description: str, labels: list[str]):
            flags.append({
                "type": rule_type,
                "severity": severity,
                "description": description,
                "evidence": {lab: ev.get(lab) for lab in labels}
            })

        def missing_section(rule_type: str, severity: str, msg: str, labels: list[str]) -> bool:
            if all(not (pf.get(l, "") or "").strip() for l in labels):
                add_flag(rule_type, severity, msg, labels)
                return True
            return False

        def dest_mismatch(label: str, rule_type: str, *, required: bool = True):
            val = (pf.get(label, "") or "").strip()
            if not val:
                if required:
                    add_flag("MISSING_FIELD", "MED", f"{label} is missing from packet.", [label])
                return

            if tar_dest_norm and _norm_loc(val) != tar_dest_norm:
                add_flag(rule_type, "HIGH",
                         f"{label} does not match TAR destination.",
                         ["TAR_DESTINATION", label])
                questions.append(
                    f"{label} shows '{val}', but TAR destination is '{destination}'. Which is correct?"
                )

        def date_pair_check(start_lab: str, end_lab: str, rule_prefix: str, *, required: bool = True):

            s_raw = (pf.get(start_lab, "") or "").strip()
            e_raw = (pf.get(end_lab, "") or "").strip()

            s = _parse_iso_date(s_raw)
            e = _parse_iso_date(e_raw)

            missing_sev = "HIGH" if required else "MED"

            if not s:
                add_flag("MISSING_FIELD", missing_sev,
                         f"{start_lab} is missing/invalid (expected YYYY-MM-DD).",
                         [start_lab])

            if not e:
                add_flag("MISSING_FIELD", missing_sev,
                         f"{end_lab} is missing/invalid (expected YYYY-MM-DD).",
                         [end_lab])

            if not s or not e:
                return

            if e < s:
                add_flag(f"{rule_prefix}_DATE_ORDER", "HIGH",
                         f"{end_lab} is before {start_lab}.",
                         [start_lab, end_lab])
                questions.append(
                    f"{rule_prefix} dates look reversed ({start_lab}={s_raw}, {end_lab}={e_raw})."
                )
                return

            s_in = _in_window(s, tar_start, tar_end)
            e_in = _in_window(e, tar_start, tar_end)

            if (not s_in) or (not e_in):
                add_flag(
                    f"{rule_prefix}_OUT_OF_RANGE",
                    "HIGH" if required else "MED",
                    f"{rule_prefix} dates are outside TAR travel window.",
                    ["TAR_START_DATE", "TAR_END_DATE", start_lab, end_lab],
                )
                questions.append(
                    f"{rule_prefix} window is {s_raw} to {e_raw}, "
                    f"but TAR window is {start_date} to {end_date}."
                )

        # -------------------------
        # Missing sections
        # -------------------------

        hotel_missing = missing_section(
            "MISSING_HOTEL",
            "HIGH",
            "Hotel reservation details are missing from the packet.",
            ["HOTEL_CITY", "HOTEL_CHECKIN_DATE", "HOTEL_CHECKOUT_DATE"],
        )

        rental_missing = missing_section(
            "MISSING_RENTAL",
            "LOW",
            "Rental car details are missing (ok if no rental needed).",
            ["RENTAL_PICKUP_CITY", "RENTAL_PICKUP_DATE", "RENTAL_DROPOFF_DATE"],
        )

        parking_missing = missing_section(
            "MISSING_PARKING",
            "LOW",
            "Airport parking estimate is missing (ok if not driving/parking).",
            ["PARKING_LOCATION", "PARKING_START_DATE", "PARKING_END_DATE"],
        )

        # -------------------------
        # Destination checks
        # -------------------------

        dest_mismatch("FLIGHT_DESTINATION", "DESTINATION_MISMATCH_FLIGHT", required=True)

        if not hotel_missing:
            dest_mismatch("HOTEL_CITY", "DESTINATION_MISMATCH_HOTEL", required=True)

        if not rental_missing:
            dest_mismatch("RENTAL_PICKUP_CITY", "DESTINATION_MISMATCH_RENTAL", required=False)

        if not parking_missing:
            parking_val = (pf.get("PARKING_LOCATION", "") or "").strip()
            if parking_val and not parking_matches_destination(parking_val, destination):
                add_flag("DESTINATION_MISMATCH_PARKING", "MED",
                         "Parking location may not match TAR destination.",
                         ["PARKING_LOCATION"])

        dest_mismatch("MIE_LOCALITY", "DESTINATION_MISMATCH_MIE", required=True)

        # -------------------------
        # Date checks
        # -------------------------

        date_pair_check("FLIGHT_DEPART_DATE", "FLIGHT_RETURN_DATE", "FLIGHT", required=True)

        if not hotel_missing:
            date_pair_check("HOTEL_CHECKIN_DATE", "HOTEL_CHECKOUT_DATE", "HOTEL", required=True)

        if not rental_missing:
            date_pair_check("RENTAL_PICKUP_DATE", "RENTAL_DROPOFF_DATE", "RENTAL", required=False)

        if not parking_missing:
            date_pair_check("PARKING_START_DATE", "PARKING_END_DATE", "PARKING", required=False)

        # -------------------------
        # Summary
        # -------------------------

        extracted = {
            "mode": "packet",
            "tar": {
                "destination_city": destination,
                "start_date": start_date,
                "end_date": end_date,
            },
            "packet_fields": pf,
        }

        summary = [
            f"Traveler: {traveler}",
            f"TAR destination: {destination}",
            f"TAR dates: {start_date} to {end_date}",
            f"Flags found: {len(flags)}",
        ]

        phase3 = _run_phase3(tar_for_phase3, phase2_flags=flags)
        ml_row = _build_ml_row(tar_for_phase3, flags, phase3)
        ml_prediction = _get_predictor().predict(ml_row)

        return {
            "summary": summary,
            "extracted_fields": extracted,
            "flags": flags,
            "questions": questions,
            "phase3": phase3,
            "ml": ml_prediction,
        }
    # Fallback (non-packet)
    phase3 = _run_phase3(tar_for_phase3, phase2_flags=flags)
    ml_row = _build_ml_row(tar_for_phase3, flags, phase3)
    ml_prediction = _get_predictor().predict(ml_row)
    return {
        "summary": ["Non-packet document format not supported."],
        "extracted_fields": {},
        "flags": flags,
        "questions": questions,
        "phase3": phase3,
        "ml": ml_prediction,
    }
def _map_phase2_severity_to_int(sev: str) -> int:
    sev = (sev or "").strip().upper()
    if sev in ("HIGH", "H"):
        return 9
    if sev in ("MED", "MEDIUM", "M"):
        return 6
    if sev in ("LOW", "L"):
        return 3
    return 5  # default


def _convert_phase2_flags_to_phase3(phase2_flags: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Converts Phase 2 flag dicts:
      {"type": "...", "severity": "LOW|MED|HIGH", "description": "...", "evidence": {...}}
    into Phase 3-like flag dicts:
      {"code": "...", "message": "...", "severity": int, "field": None, "evidence": {...}}
    """
    out: list[dict[str, Any]] = []
    for f in phase2_flags or []:
        code = f"PH2_{(f.get('type') or 'UNKNOWN').strip().upper()}"
        out.append({
            "code": code,
            "message": (f.get("description") or "").strip(),
            "severity": _map_phase2_severity_to_int(f.get("severity")),
            "field": f.get("field"),  # usually None unless you add it in Phase 2 later
            "evidence": f.get("evidence") or {},
        })
    return out


def _risk_level_from_score(score: int) -> str:
    if score >= 70:
        return "HIGH"
    if score >= 35:
        return "MEDIUM"
    return "LOW"
    
# --- add this OUTSIDE run_review(), near top or bottom of file ---
def _build_ml_row(
    tar_for_phase3: dict,
    phase2_flags: list[dict[str, Any]],
    phase3: dict,
) -> dict:
    tar = {
        "traveler_name": tar_for_phase3.get("traveler_name"),
        "start_date": tar_for_phase3.get("start_date"),
        "end_date": tar_for_phase3.get("end_date"),
        "destination_city": tar_for_phase3.get("destination_city"),
        "justification": tar_for_phase3.get("justification", ""),
        "packet": True if phase2_flags else False,
    }

    return {
        "tar": tar,
        "phase2_flags": phase2_flags,
        "phase3": phase3,
    }
def _run_phase3(tar: dict, phase2_flags: Optional[list[dict[str, Any]]] = None) -> dict:
    rules = [
        MissingRequiredFieldRule(
            required_fields=[
                "traveler_name",
                "start_date",
                "end_date",
                "destination_city",
            ]
        ),
        DateOrderRule(),
    ]

    risk_engine = RiskEngine(rules)
    risk = risk_engine.run(tar)

    # Convert Phase 3 (engine) flags to dicts
    phase3_flags = [
        {
            "code": f.code,
            "message": f.message,
            "severity": f.severity,
            "field": f.field,
            "evidence": f.evidence,
        }
        for f in risk.flags
    ]

    # Bridge Phase 2 flags into Phase 3
    bridged = _convert_phase2_flags_to_phase3(phase2_flags or [])

    # Merge + recompute score/level (cap at 100)
    merged_flags = phase3_flags + bridged
    merged_score = min(100, sum(f["severity"] for f in merged_flags))
    merged_level = _risk_level_from_score(merged_score)

    # Keep confidence from engine (simple approach). Optionally nudge down a bit per bridged flag.
    confidence = risk.confidence
    if bridged:
        confidence = max(0.5, round(confidence - (0.02 * len(bridged)), 2))

    # Build summary using the engine result (or you can re-summarize using merged_flags later)
    engine = SummaryEngine()
    summary = engine.build_summary(tar, risk, flags_override=merged_flags)
    checklist = engine.build_checklist(tar, risk, flags_override=merged_flags, grouped=True)

    return {
    "risk_score": merged_score,
    "risk_level": merged_level,
    "confidence": confidence,
    "flags": merged_flags,
    "approver_summary": summary,
    "approver_checklist": checklist,
}