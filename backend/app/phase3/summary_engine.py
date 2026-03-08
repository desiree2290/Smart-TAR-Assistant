from typing import Any, Dict, Optional, List, Tuple
from .models import RiskResult


class SummaryEngine:

    def _recommend_action(self, risk_level: str) -> str:
        risk_level = (risk_level or "").upper()

        if risk_level == "HIGH":
            return "Hold for correction"
        if risk_level == "MEDIUM":
            return "Clarify before approval"
        return "Approve"

    def build_summary(
        self,
        tar: Dict,
        risk: RiskResult,
        flags_override: Optional[List[Dict[str, Any]]] = None,
    ) -> str:

        if flags_override is not None:
            flags = flags_override
            if not flags:
                return "No discrepancies detected. Submission appears ready for approval review."

            top = sorted(flags, key=lambda f: int(f.get("severity", 0)), reverse=True)[:3]
            top_msgs = "; ".join((f.get("message") or "").strip() for f in top if (f.get("message") or "").strip())

        else:
            if not risk.flags:
                return "No discrepancies detected. Submission appears ready for approval review."

            top = sorted(risk.flags, key=lambda f: f.severity, reverse=True)[:3]
            top_msgs = "; ".join(f.message for f in top)

        traveler = tar.get("traveler_name") or "Traveler"

        trip = []
        if tar.get("start_date") and tar.get("end_date"):
            trip.append(f"{tar['start_date']} to {tar['end_date']}")
        if tar.get("destination_city"):
            trip.append(str(tar["destination_city"]))

        trip_str = f" ({', '.join(trip)})" if trip else ""

        if not top_msgs:
            top_msgs = "See flagged items for details"

        flag_count = len(flags_override) if flags_override is not None else len(risk.flags)

        action = self._recommend_action(risk.risk_level)

        return (
            f"{traveler}{trip_str} flagged as {risk.risk_level} risk "
            f"(score {risk.risk_score}, confidence {risk.confidence}). "
            f"{flag_count} issue(s) detected. Recommended action: {action}. "
            f"Top issues: {top_msgs}."
        )
    def build_checklist(
        self,
        tar: Dict,
        risk: RiskResult,
        flags_override: Optional[List[Dict[str, Any]]] = None,
        max_items: int = 6,
        grouped: bool = True,
    ) -> List[str]:
        """
        Compact, approver-friendly checklist derived from the most severe flags.
        Uses merged dict flags if flags_override is provided; otherwise uses risk.flags.

        Returns either grouped bullets (default) or flat bullets.
        """

        # Normalize flags into a list of dicts: {"code","message","severity",...}
        if flags_override is not None:
            flags = flags_override
        else:
            flags = [
                {"code": f.code, "message": f.message, "severity": f.severity, "field": f.field, "evidence": f.evidence}
                for f in (risk.flags or [])
            ]

        if not flags:
            return []

        # Sort by severity, highest first
        flags_sorted = sorted(flags, key=lambda f: int(f.get("severity", 0)), reverse=True)

        # Categorize into compact actions
        missing: List[str] = []
        dates: List[str] = []
        destination: List[str] = []
        other: List[str] = []

        for f in flags_sorted:
            code = (f.get("code") or "").upper()
            msg = (f.get("message") or "").strip()

            # Prefer code-based categorization (works well with your PH2_* codes)
            if "MISSING" in code:
                missing.append(self._compact_missing_action(code, msg))
            elif "DATE_ORDER" in code or "OUT_OF_RANGE" in code or "DATE" in code:
                dates.append(self._compact_date_action(code, msg))
            elif "DESTINATION_MISMATCH" in code or "DESTINATION" in code:
                destination.append(self._compact_destination_action(code, msg))
            else:
                other.append(self._compact_other_action(code, msg))

        # Deduplicate within each category while preserving order
        missing = self._dedupe_preserve_order(missing)
        dates = self._dedupe_preserve_order(dates)
        destination = self._dedupe_preserve_order(destination)
        other = self._dedupe_preserve_order(other)

        # Build final list (grouped or flat), capped to max_items (excluding headers)
        if not grouped:
            flat = missing + dates + destination + other
            return flat[:max_items]

        grouped_out: List[str] = []
        grouped_out = self._append_group(grouped_out, "Missing info", missing, max_items)
        grouped_out = self._append_group(grouped_out, "Dates", dates, max_items)
        grouped_out = self._append_group(grouped_out, "Destination consistency", destination, max_items)
        grouped_out = self._append_group(grouped_out, "Other", other, max_items)

        return grouped_out

    # -------------------------
    # Compact action builders
    # -------------------------

    def _compact_missing_action(self, code: str, msg: str) -> str:
        # Examples: PH2_MISSING_HOTEL, PH2_MISSING_FIELD, MISSING_REQUIRED
        if "MISSING_JUSTIFICATION" in code:
            return "Expand travel justification (purpose + benefit)."
        if "MISSING_HOTEL" in code:
            return "Provide hotel reservation details (or confirm no lodging needed)."
        if "MISSING_RENTAL" in code:
            return "Provide rental car details (or confirm no rental needed)."
        if "MISSING_PARKING" in code:
            return "Provide parking estimate (or confirm no parking needed)."
        if "MISSING_REQUIRED" in code:
            return "Complete required TAR fields (traveler, dates, destination)."
        if "MISSING_FIELD" in code:
            # msg contains the field label; keep it short
            return "Provide missing/invalid packet fields (see flagged items)."
        return "Provide missing information referenced in flags."

    def _compact_date_action(self, code: str, msg: str) -> str:
        if "DATE_ORDER" in code:
            return "Fix reversed date range (end date before start date)."
        if "OUT_OF_RANGE" in code:
            return "Align reservation/parking dates to TAR travel window."
        return "Validate travel-related dates for correctness."

    def _compact_destination_action(self, code: str, msg: str) -> str:
        if "MISMATCH_FLIGHT" in code:
            return "Verify flight destination matches TAR destination."
        if "MISMATCH_HOTEL" in code:
            return "Verify hotel city matches TAR destination."
        if "MISMATCH_RENTAL" in code:
            return "Verify rental pickup/dropoff city matches travel plan."
        if "MISMATCH_PARKING" in code:
            return "Verify parking location aligns with destination/airport."
        if "MISMATCH_MIE" in code:
            return "Verify M&IE locality matches destination."
        return "Verify destination/city consistency across all documents."

    def _compact_other_action(self, code: str, msg: str) -> str:
        # Fallback: keep it actionable but short
        if msg:
            # avoid dumping super long text
            return (msg[:120] + "...") if len(msg) > 120 else msg
        return "Review other flagged discrepancies."

    # -------------------------
    # Helpers
    # -------------------------

    def _dedupe_preserve_order(self, items: List[str]) -> List[str]:
        seen = set()
        out: List[str] = []
        for it in items:
            key = it.strip().lower()
            if key and key not in seen:
                seen.add(key)
                out.append(it)
        return out

    def _append_group(self, out: List[str], header: str, items: List[str], max_items: int) -> List[str]:
        # Count how many actual checklist lines we have (exclude headers)
        current_lines = sum(1 for x in out if not x.endswith(":"))
        remaining = max_items - current_lines
        if remaining <= 0 or not items:
            return out

        out.append(f"{header}:")
        for it in items[:remaining]:
            out.append(f"- {it}")
        return out