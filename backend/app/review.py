# app/review.py

import re
from datetime import datetime
from typing import Dict, Any, Optional, List

from app.phase3.risk_engine import RiskEngine
from app.phase3.rules import MissingRequiredFieldRule, DateOrderRule
from app.phase3.summary_engine import SummaryEngine
from app.phase3.models import RiskResult

from app.packet_pdf import FIELD_ALIASES

from app.ml_utils import run_ml_inference

from app.services.ml_model import predict_justification

LABEL_RE = re.compile(r"^([A-Z0-9_]+):\s*(.*)\s*$")

# Airport code -> city mapping for parking heuristics
AIRPORT_CODES = {
    "SAN": "san diego",
    "SJC": "san jose",
    "LAX": "los angeles",
}

FIELD_ALIASES = {
    "DESTINATION": "FLIGHT_DESTINATION",
    "DEPART_DATE": "FLIGHT_DEPART_DATE",
    "RETURN_DATE": "FLIGHT_RETURN_DATE",
    "HOTEL": "HOTEL_CITY",
    "HOTEL_CHECKIN": "HOTEL_CHECKIN_DATE",
    "HOTEL_CHECKOUT": "HOTEL_CHECKOUT_DATE",
    "RENTAL CAR": "RENTAL_PICKUP_CITY",
    "PARKING": "PARKING_LOCATION",
}

# -------------------------
# Utility helpers
# -------------------------


def _parse_iso_date(s: str) -> Optional[datetime]:
    s = (s or "").strip()
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d")  # ✅ RETURN datetime
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

def compute_final_action(phase3: Dict[str, Any], ml_result: Dict[str, Any], flags: List[Dict[str, Any]]) -> str:
    """
    Final decision engine:
    - uses rule severity as a safety override
    - uses Phase 3 risk score bands
    - falls back to ML prediction when needed
    """
    phase3_score = phase3.get("risk_score", 0)
    ml_prediction = (ml_result.get("ml_prediction") or "clarify").strip().lower()

    num_high_flags = sum(
        1 for f in flags
        if str(f.get("severity", "")).upper() == "HIGH"
        or f.get("severity") == 9
    )

    # Safety override: too many severe issues should force HOLD
    if num_high_flags >= 5:
        return "hold"

    # Score-based routing using Phase 3 score
    if phase3_score >= 45:
        return "hold"

    if phase3_score >= 20:
        return "clarify"

    # Otherwise use ML if it's stricter than approve
    if ml_prediction in {"hold", "clarify"}:
        return ml_prediction

    return "approve"

def build_decision_explanation(
    phase3: Dict[str, Any],
    ml_result: Dict[str, Any],
    flags: List[Dict[str, Any]],
    final_action: str,
) -> List[str]:
    lines: List[str] = []

    ml_prediction = (ml_result.get("ml_prediction") or "unknown").lower()
    ml_conf = ml_result.get("ml_confidence")
    risk_score = phase3.get("risk_score", 0)

    num_high = sum(
        1 for f in flags
        if str(f.get("severity", "")).upper() == "HIGH"
    )
    num_med = sum(
        1 for f in flags
        if str(f.get("severity", "")).upper() in {"MED", "MEDIUM"}
    )
    num_low = sum(
        1 for f in flags
        if str(f.get("severity", "")).upper() == "LOW"
    )

    lines.append(f"Final decision: {final_action.upper()}")
    lines.append(f"Phase 3 risk score: {risk_score}")
    lines.append(
        f"Flag mix: {num_high} high, {num_med} medium, {num_low} low"
    )

    if ml_conf is not None:
        lines.append(
            f"ML predicted '{ml_prediction}' with {ml_conf:.0%} confidence"
        )
    else:
        lines.append(f"ML predicted '{ml_prediction}'")

    if final_action == "hold":
        lines.append("Decision was escalated because severe discrepancies exceeded the hold threshold.")
    elif final_action == "clarify":
        lines.append("Decision requires clarification because moderate issues were detected.")
    else:
        lines.append("Decision is approvable because severe discrepancies were not detected.")

    top_reasons = []
    for f in flags[:4]:
        desc = (f.get("description") or "").strip()
        if desc:
            top_reasons.append(desc)

    if top_reasons:
        lines.append("Top reasons:")
        lines.extend([f"- {r}" for r in top_reasons])

    return lines

# -------------------------
# Packet parsing
# -------------------------

def _extract_packet_fields(doc_text: str) -> Dict[str, Any]:
    fields: Dict[str, str] = {}
    evidence: Dict[str, str] = {}

    for line in (doc_text or "").splitlines():
        line = line.strip()

        print(f"[DEBUG] RAW LINE: {line}")

        m = LABEL_RE.match(line)
        if not m:
            continue

        label, value = m.group(1), m.group(2).strip()

        label = label.strip().upper()
        label = FIELD_ALIASES.get(label, label)

        print(f"[DEBUG] Parsed: {label} = {value}")

        fields[label] = value
        evidence[label] = line

    print("[DEBUG] Extracted packet fields:", fields)

    return {"packet_fields": fields, "packet_evidence": evidence}


def _is_packet(doc_text: Optional[str]) -> bool:
    if not doc_text:
        return False

    t = doc_text.upper()

    strict_markers = [
        "TAR SUPPORTING DOCUMENTS PACKET",
        "FLIGHT_DESTINATION:",
        "HOTEL_CITY:",
        "RENTAL_PICKUP_CITY:",
        "PARKING_LOCATION:",
        "MIE_LOCALITY:",
    ]

    flexible_markers = [
        "TRAVEL AUTHORIZATION SUPPORTING DOCUMENT",
        "DESTINATION:",
        "DEPART_DATE:",
        "RETURN_DATE:",
        "JUSTIFICATION:",
        "LODGING:",
        "RENTAL CAR:",
        "PARKING:",
    ]

    return any(m in t for m in strict_markers + flexible_markers)


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

    

    features_used = {
        "destination_city": tar.get("destination_city"),
        "trip_length_days": (
            (_parse_iso_date(tar.get("end_date")) - _parse_iso_date(tar.get("start_date"))).days
            if tar.get("start_date") and tar.get("end_date") else None
        ),
        "num_flags": len(merged_flags),
        "num_high_flags": sum(1 for f in merged_flags if f.get("severity") == "HIGH"),
        "num_med_flags": sum(1 for f in merged_flags if f.get("severity") == "MED"),
        "num_low_flags": sum(1 for f in merged_flags if f.get("severity") == "LOW"),
        "justification_len": len(tar.get("justification", "")),
        "has_packet": 1 if tar.get("packet_pdf_path") else 0,
        "risk_score": merged_score,
    }

    return {
        "risk_score": merged_score,
        "risk_level": merged_level,
        "confidence": confidence,
        "flags": merged_flags,
        "approver_summary": summary,
        "approver_checklist": checklist,
        "features_used": features_used,
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

    justification_ml_result = predict_justification(justification)
    justification_ml_prediction = justification_ml_result["label"]
    justification_ml_confidence = justification_ml_result["confidence"]
    
    
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

        ml_result["justification_transformer_prediction"] = justification_ml_prediction
        ml_result["justification_transformer_confidence"] = justification_ml_confidence

        phase3 = _run_phase3(tar_for_phase3, phase2_flags=flags)

        final_score = phase3["risk_score"]
        final_risk = phase3["risk_level"]

        final_action = compute_final_action(phase3, ml_result, flags)
        decision_explanation = build_decision_explanation(phase3, ml_result, flags, final_action)

        summary = [
            f"Traveler: {traveler}",
            f"TAR destination: {destination}",
            f"TAR dates: {start_date} to {end_date}",
            f"Flags found: {len(flags)}",
            f"Rule score: {rule_score}",
            f"Final risk score: {final_score}",
            f"Risk level: {final_risk}",
            f"Final decision: {final_action}",
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
            "final_action": final_action,
            "decision_explanation": decision_explanation,

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

    ml_result["justification_transformer_prediction"] = justification_ml_prediction
    ml_result["justification_transformer_confidence"] = justification_ml_confidence
    final_score = combine_risk(rule_score, ml_result)
    final_risk = label_risk(final_score)

    phase3 = _run_phase3(tar_for_phase3, phase2_flags=flags)
    final_action = compute_final_action(phase3, ml_result, flags)
    decision_explanation = build_decision_explanation(phase3, ml_result, flags, final_action)

    summary = [
        "Non-packet document format not supported.",
        f"Flags found: {len(flags)}",
        f"Rule score: {rule_score}",
        f"Final risk score: {final_score}",
        f"Risk level: {final_risk}",
        f"Final decision: {final_action}",
    ]

    if ml_result.get("ml_prediction") is not None:
        summary.append(f"ML predicted risk class: {ml_result['ml_prediction']}")

    if ml_result.get("ml_confidence") is not None:
        summary.append(f"ML confidence: {ml_result['ml_confidence']:.2f}")

    summary.append(
        f"Transformer justification prediction: {justification_ml_prediction} "
        f"({justification_ml_confidence:.2f})"
    )

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
        "final_action": final_action,
        "decision_explanation": decision_explanation,
    }