import re
from typing import Optional, Dict, Any, List

# --- Simple parsers (MVP level) ---

ISO_DATE_RE = re.compile(r"\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b")

# Examples: "March 12, 2026" or "Mar 12, 2026"
MONTH_DATE_RE = re.compile(
    r"\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
    r"\s+([0-2]?\d|3[01]),\s*(20\d{2})\b",
    re.IGNORECASE
)

# City/state pattern: "San Diego, CA" (very common in agendas)
CITY_STATE_RE = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*,\s*([A-Z]{2})\b")

def _find_first_iso_date(text: str) -> Optional[str]:
    m = ISO_DATE_RE.search(text)
    if not m:
        return None
    return m.group(0)

def _find_all_iso_dates(text: str) -> List[str]:
    return [m.group(0) for m in ISO_DATE_RE.finditer(text)]

def _find_first_city_state(text: str) -> Optional[str]:
    m = CITY_STATE_RE.search(text)
    if not m:
        return None
    # Return city only (state optional later)
    return m.group(1)

def _extract_doc_fields(doc_text: Optional[str]) -> Dict[str, str]:
    if not doc_text:
        return {
            "doc_city": "NO_DOC_TEXT",
            "doc_start_date": "NO_DOC_TEXT",
            "doc_end_date": "NO_DOC_TEXT",
        }

    # City
    city = _find_first_city_state(doc_text) or "UNKNOWN"

    # Dates (try to find ISO dates first)
    iso_dates = _find_all_iso_dates(doc_text)
    start = iso_dates[0] if len(iso_dates) >= 1 else "UNKNOWN"
    end = iso_dates[-1] if len(iso_dates) >= 2 else "UNKNOWN"

    return {
        "doc_city": city,
        "doc_start_date": start,
        "doc_end_date": end,
    }

def run_review(request_payload: Dict[str, Any], doc_text: Optional[str]) -> Dict[str, Any]:
    """
    MVP review engine using real PDF-extracted text:
    - Extract city + date range from doc text (heuristics)
    - Flag mismatch/missing justification
    - Generate summary bullets + questions
    """
    destination = request_payload["destination_city"].strip()
    start_date = request_payload["start_date"].strip()
    end_date = request_payload["end_date"].strip()
    justification = request_payload["justification"].strip()
    traveler = request_payload["traveler_name"].strip()

    extracted = _extract_doc_fields(doc_text)
    flags = []
    questions = []

    # ---- Rules ----
    if len(justification) < 30:
        flags.append({
            "type": "MISSING_JUSTIFICATION",
            "severity": "MED",
            "description": "Justification is too short. Add more detail on purpose/benefit."
        })
        questions.append("Can you expand the justification with purpose and expected benefit?")

    # Destination mismatch (only if we have a confident doc city)
    doc_city = extracted.get("doc_city", "UNKNOWN")
    if doc_city not in ["UNKNOWN", "NO_DOC_TEXT"] and doc_city.lower() != destination.lower():
        flags.append({
            "type": "DESTINATION_MISMATCH",
            "severity": "HIGH",
            "description": "Destination city on the attachment does not match the request."
        })
        questions.append(f"Your attachment appears to reference {doc_city}, but the form says {destination}. Which is correct?")

    # Date mismatch (only if doc extracted dates look like real ISO dates)
    doc_start = extracted.get("doc_start_date", "UNKNOWN")
    doc_end = extracted.get("doc_end_date", "UNKNOWN")

    if doc_start not in ["UNKNOWN", "NO_DOC_TEXT"] and doc_start != start_date:
        flags.append({
            "type": "DATE_MISMATCH",
            "severity": "HIGH",
            "description": "Start date differs between attachment and request."
        })
        questions.append(f"Attachment start date looks like {doc_start}, but the form says {start_date}. Which start date is correct?")

    if doc_end not in ["UNKNOWN", "NO_DOC_TEXT"] and doc_end != end_date:
        flags.append({
            "type": "DATE_MISMATCH",
            "severity": "HIGH",
            "description": "End date differs between attachment and request."
        })
        questions.append(f"Attachment end date looks like {doc_end}, but the form says {end_date}. Which end date is correct?")

    # ---- Summary ----
    summary = [
        f"Traveler: {traveler}",
        f"Destination (form): {destination}",
        f"Dates (form): {start_date} to {end_date}",
        f"Destination (doc): {doc_city}",
        f"Dates (doc): {doc_start} to {doc_end}",
        "Purpose: " + (justification[:120] + ("..." if len(justification) > 120 else "")),
        f"Flags found: {len(flags)}"
    ]

    return {
        "summary": summary,
        "extracted_fields": extracted,
        "flags": flags,
        "questions": questions,
    }
