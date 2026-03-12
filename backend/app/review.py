# app/review.py

import re
from datetime import datetime
from typing import Dict, Any, Optional, List

from app.phase3.risk_engine import RiskEngine
from app.phase3.rules import MissingRequiredFieldRule, DateOrderRule
from app.phase3.summary_engine import SummaryEngine
from app.phase3.models import RiskResult

from app.ml_utils import run_ml_inference

LABEL_RE = re.compile(r"^([A-Z0-9_]+):\s*(.*)\s*$")

# Airport code -> city mapping for parking heuristics
AIRPORT_CODES = {
    "SAN": "san diego",
    "SJC": "san jose",
    "LAX": "los angeles",
}


# -------------------------
# Utility helpers
# -------------------------

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


def label_risk(score: int) -> str:
    if score >= 9:
        return "high"
    if score >= 4:
        return "medium"
    return "low"


def combine_risk(rule_score: int, ml_result: Dict[str, Any]) -> int:
    """
    Blend rule-based score with ML prediction.
    Model classes:
      approve = low concern
      clarify = medium concern
      hold = high concern
    """
    ml_prediction = (ml_result.get("ml_prediction") or "").strip().lower()

    ml_bonus_map = {
        "approve": 0,
        "clarify": 2,
        "hold": 4,
    }

    ml_bonus = ml_bonus_map.get(ml_prediction, 0)
    return rule_score + ml_bonus


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


# -------------------------
# Phase 2 -> Phase 3 bridge helpers
# -------------------------

def _map_phase2_severity_to_int(sev: str) -> int:
    sev = (sev or "").strip().upper()
    if sev in ("HIGH", "H"):
        return 9
    if sev in ("MED", "MEDIUM", "M"):
        return 6
    if sev in ("LOW", "L"):
        return 3
    return 5


def _convert_phase2_flags_to_phase3(phase2_flags: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Converts Phase 2 flag dicts:
      {"type": "...", "severity": "LOW|MED|HIGH", "description": "...", "evidence": {...}}

    into Phase 3-like flag dicts:
      {"code": "...", "message": "...", "severity": int, "field": None, "evidence": {...}}
    """
    out: List[Dict[str, Any]] = []

    for f in phase2_flags or []:
        code = f"PH2_{(f.get('type') or 'UNKNOWN').strip().upper()}"
        out.append({
            "code": code,
            "message": (f.get("description") or "").strip(),
            "severity": _map_phase2_severity_to_int(f.get("severity")),
            "field": f.get("field"),
            "evidence": f.get("evidence") or {},
        })

    return out


def _risk_level_from_score(score: int) -> str:
    if score >= 70:
        return "HIGH"
    if score >= 35:
        return "MEDIUM"
    return "LOW"


def _run_phase3(tar: Dict[str, Any], phase2_flags: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
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

    bridged = _convert_phase2_flags_to_phase3(phase2_flags or [])

    merged_flags = phase3_flags + bridged
    merged_score = min(100, sum(f["severity"] for f in merged_flags))
    merged_level = _risk_level_from_score(merged_score)

    confidence = risk.confidence
    if bridged:
        confidence = max(0.5, round(confidence - (0.02 * len(bridged)), 2))

    merged_risk = RiskResult(
        risk_score=merged_score,
        risk_level=merged_level,
        flags=[],
        confidence=confidence,
    )

    engine = SummaryEngine()
    summary = engine.build_summary(tar, merged_risk, flags_override=merged_flags)
    checklist = engine.build_checklist(tar, merged_risk, flags_override=merged_flags, grouped=True)

    return {
        "risk_score": merged_score,
        "risk_level": merged_level,
        "confidence": confidence,
        "flags": merged_flags,
        "approver_summary": summary,
        "approver_checklist": checklist,
    }


# -------------------------
# Main Review Engine
# -------------------------

def run_review(request_payload: Dict[str, Any], doc_text: Optional[str]) -> Dict[str, Any]:
    destination = request_payload["destination_city"].strip()
    start_date = request_payload["start_date"].strip()
    end_date = request_payload["end_date"].strip()
    justification = request_payload["justification"].strip()
    traveler = request_payload["traveler_name"].strip()

    flags: List[Dict[str, Any]] = []
    questions: List[str] = []

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

        def add_flag(rule_type: str, severity: str, description: str, labels: List[str]):
            flags.append({
                "type": rule_type,
                "severity": severity,
                "description": description,
                "evidence": {lab: ev.get(lab) for lab in labels}
            })

        def missing_section(rule_type: str, severity: str, msg: str, labels: List[str]) -> bool:
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
                add_flag(
                    rule_type,
                    "HIGH",
                    f"{label} does not match TAR destination.",
                    ["TAR_DESTINATION", label],
                )
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
                add_flag(
                    "MISSING_FIELD",
                    missing_sev,
                    f"{start_lab} is missing/invalid (expected YYYY-MM-DD).",
                    [start_lab],
                )

            if not e:
                add_flag(
                    "MISSING_FIELD",
                    missing_sev,
                    f"{end_lab} is missing/invalid (expected YYYY-MM-DD).",
                    [end_lab],
                )

            if not s or not e:
                return

            if e < s:
                add_flag(
                    f"{rule_prefix}_DATE_ORDER",
                    "HIGH",
                    f"{end_lab} is before {start_lab}.",
                    [start_lab, end_lab],
                )
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
                    f"{rule_prefix} window is {s_raw} to {e_raw}, but TAR window is {start_date} to {end_date}."
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
                add_flag(
                    "DESTINATION_MISMATCH_PARKING",
                    "MED",
                    "Parking location may not match TAR destination.",
                    ["PARKING_LOCATION"],
                )

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

        extracted = {
            "mode": "packet",
            "tar": {
                "destination_city": destination,
                "start_date": start_date,
                "end_date": end_date,
                "justification": justification,
            },
            "packet_fields": pf,
        }

        rule_score = len(flags)
        ml_result = run_ml_inference(extracted, flags)
        final_score = combine_risk(rule_score, ml_result)
        final_risk = label_risk(final_score)

        phase3 = _run_phase3(tar_for_phase3, phase2_flags=flags)

        summary = [
            f"Traveler: {traveler}",
            f"TAR destination: {destination}",
            f"TAR dates: {start_date} to {end_date}",
            f"Flags found: {len(flags)}",
            f"Rule score: {rule_score}",
            f"Final risk score: {final_score}",
            f"Risk level: {final_risk}",
        ]

        if ml_result.get("ml_prediction") is not None:
            summary.append(f"ML predicted risk class: {ml_result['ml_prediction']}")

        if ml_result.get("ml_confidence") is not None:
            summary.append(f"ML confidence: {ml_result['ml_confidence']:.2f}")

        return {
            "summary": summary,
            "extracted_fields": extracted,
            "flags": flags,
            "questions": questions,
            "rule_score": rule_score,
            "risk_score": final_score,
            "risk_level": final_risk,
            "phase3": phase3,
            "ml_result": ml_result,
        }

    # -------------------------
    # Fallback (non-packet)
    # -------------------------

    extracted = {
        "mode": "non-packet",
        "tar": {
            "destination_city": destination,
            "start_date": start_date,
            "end_date": end_date,
            "justification": justification,
        },
        "packet_fields": {},
    }

    rule_score = len(flags)
    ml_result = run_ml_inference(extracted, flags)
    final_score = combine_risk(rule_score, ml_result)
    final_risk = label_risk(final_score)

    phase3 = _run_phase3(tar_for_phase3, phase2_flags=flags)

    summary = [
        "Non-packet document format not supported.",
        f"Flags found: {len(flags)}",
        f"Rule score: {rule_score}",
        f"Final risk score: {final_score}",
        f"Risk level: {final_risk}",
    ]

    if ml_result.get("ml_prediction") is not None:
        summary.append(f"ML predicted risk class: {ml_result['ml_prediction']}")

    if ml_result.get("ml_confidence") is not None:
        summary.append(f"ML confidence: {ml_result['ml_confidence']:.2f}")

    return {
        "summary": summary,
        "extracted_fields": extracted,
        "flags": flags,
        "questions": questions,
        "rule_score": rule_score,
        "risk_score": final_score,
        "risk_level": final_risk,
        "phase3": phase3,
        "ml_result": ml_result,
    }