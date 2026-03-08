import re
from typing import Dict, Any

import pytest

from app.review import run_review


def make_packet_doc_text(fields: Dict[str, str]) -> str:
    """
    Build a minimal doc_text that your packet extractor should recognize.
    Keeps labels as: LABEL: value
    """
    header = [
        "TAR SUPPORTING DOCUMENTS PACKET",
        "PACKET_VERSION: v1",
        "GENERATED_ON: 2026-03-02",
        "",
    ]

    lines = header + [f"{k}: {v}" for k, v in fields.items()]
    return "\n".join(lines)


def find_flags(result: Dict[str, Any], flag_type: str):
    return [f for f in result.get("flags", []) if f.get("type") == flag_type]


def test_hotel_checkout_outside_tar_window_is_high_and_not_duplicated():
    request_payload = {
        "traveler_name": "Desiree Hodge",
        "destination_city": "San Diego, CA",
        "start_date": "2026-03-10",
        "end_date": "2026-03-12",
        "justification": "Attend conference and meet with program stakeholders to align requirements.",
    }

    # HOTEL_CHECKOUT_DATE is outside TAR window (03-13 > 03-12)
    doc_text = make_packet_doc_text({
        "REQUEST_ID": "TEST-REQ-1",
        "TRAVELER_NAME": "Desiree Hodge",
        "TAR_DESTINATION": "San Diego, CA",
        "TAR_START_DATE": "2026-03-10",
        "TAR_END_DATE": "2026-03-12",

        "HOTEL_CITY": "San Diego, CA",
        "HOTEL_CHECKIN_DATE": "2026-03-10",
        "HOTEL_CHECKOUT_DATE": "2026-03-13",

        # keep other sections present but valid
        "FLIGHT_DESTINATION": "San Diego, CA",
        "FLIGHT_DEPART_DATE": "2026-03-10",
        "FLIGHT_RETURN_DATE": "2026-03-12",

        "PARKING_LOCATION": "SAN Airport",
        "PARKING_START_DATE": "2026-03-10",
        "PARKING_END_DATE": "2026-03-12",
    })

    result = run_review(request_payload, doc_text)

    hotel_flags = find_flags(result, "HOTEL_OUT_OF_RANGE")
    assert len(hotel_flags) == 1, (
        f"Expected exactly 1 HOTEL_OUT_OF_RANGE flag, got {len(hotel_flags)}. "
        f"If you see 2, your date_pair_check is adding duplicates."
    )
    assert hotel_flags[0]["severity"] == "HIGH"


def test_rental_outside_tar_window_flags_out_of_range():
    request_payload = {
        "traveler_name": "Desiree Hodge",
        "destination_city": "San Diego, CA",
        "start_date": "2026-03-10",
        "end_date": "2026-03-12",
        "justification": "Attend conference and meet with program stakeholders to align requirements.",
    }

    # Rental pickup is BEFORE TAR start (03-09)
    doc_text = make_packet_doc_text({
        "REQUEST_ID": "TEST-REQ-2",
        "TRAVELER_NAME": "Desiree Hodge",
        "TAR_DESTINATION": "San Diego, CA",
        "TAR_START_DATE": "2026-03-10",
        "TAR_END_DATE": "2026-03-12",

        "RENTAL_PICKUP_CITY": "San Diego, CA",
        "RENTAL_PICKUP_DATE": "2026-03-09",
        "RENTAL_DROPOFF_DATE": "2026-03-12",
    })

    result = run_review(request_payload, doc_text)
    rental_flags = find_flags(result, "RENTAL_OUT_OF_RANGE")
    assert len(rental_flags) >= 1, "Expected RENTAL_OUT_OF_RANGE flag when rental dates are outside TAR window."

    # Depending on your policy:
    # - If rental required=False → MED
    # - If rental required=True  → HIGH
    assert rental_flags[0]["severity"] in ("MED", "HIGH")


def test_parking_san_airport_does_not_trigger_destination_mismatch():
    request_payload = {
        "traveler_name": "Desiree Hodge",
        "destination_city": "San Diego, CA",
        "start_date": "2026-03-10",
        "end_date": "2026-03-12",
        "justification": "Attend conference and meet with program stakeholders to align requirements.",
    }

    doc_text = make_packet_doc_text({
        "REQUEST_ID": "TEST-REQ-3",
        "TRAVELER_NAME": "Desiree Hodge",
        "TAR_DESTINATION": "San Diego, CA",
        "TAR_START_DATE": "2026-03-10",
        "TAR_END_DATE": "2026-03-12",

        # This should be treated as matching San Diego (SAN = San Diego Intl)
        "PARKING_LOCATION": "SAN Airport",
        "PARKING_START_DATE": "2026-03-10",
        "PARKING_END_DATE": "2026-03-12",
    })

    result = run_review(request_payload, doc_text)
    parking_flags = find_flags(result, "DESTINATION_MISMATCH_PARKING")

    assert len(parking_flags) == 0, (
        "SAN Airport should not be flagged as a destination mismatch for San Diego, CA. "
        "If this fails, improve the parking matching heuristic (airport code mapping)."
    )