import pytest

from app.review import run_review, _run_phase3


def test_run_phase3_bridges_phase2_flags_into_score_and_flags():
    tar = {
        "traveler_name": "Test Traveler",
        "start_date": "2026-03-10",
        "end_date": "2026-03-12",
        "destination_city": "San Diego",
    }

    # Phase 2 flags (your existing structure)
    phase2_flags = [
        {
            "type": "DESTINATION_MISMATCH_HOTEL",
            "severity": "HIGH",
            "description": "HOTEL_CITY does not match TAR destination.",
            "evidence": {"HOTEL_CITY": "HOTEL_CITY: Los Angeles"},
        },
        {
            "type": "MISSING_JUSTIFICATION",
            "severity": "MED",
            "description": "Justification is too short.",
            "evidence": {},
        },
    ]

    out = _run_phase3(tar, phase2_flags=phase2_flags)

    assert "risk_score" in out
    assert "risk_level" in out
    assert "flags" in out
    assert "approver_summary" in out
    assert "approver_checklist" in out

    # Bridged flags should appear as PH2_*
    codes = [f["code"] for f in out["flags"]]
    assert any(c.startswith("PH2_") for c in codes)

    # Score should be > 0 because we added Phase 2 flags
    assert out["risk_score"] > 0

    # Checklist should be non-empty
    assert isinstance(out["approver_checklist"], list)
    assert len(out["approver_checklist"]) > 0


def test_run_review_packet_returns_phase3():
    request_payload = {
        "destination_city": "San Diego",
        "start_date": "2026-03-10",
        "end_date": "2026-03-12",
        "justification": "Attending conference to support program milestone deliverables.",
        "traveler_name": "Test Traveler",
    }

    # Minimal packet-shaped doc_text (must trigger _is_packet and contain labels)
    doc_text = "\n".join([
        "TAR SUPPORTING DOCUMENTS PACKET",
        "FLIGHT_DESTINATION: San Diego",
        "FLIGHT_DEPART_DATE: 2026-03-10",
        "FLIGHT_RETURN_DATE: 2026-03-12",
        "HOTEL_CITY: San Diego",
        "HOTEL_CHECKIN_DATE: 2026-03-10",
        "HOTEL_CHECKOUT_DATE: 2026-03-12",
        "MIE_LOCALITY: San Diego",
    ])

    res = run_review(request_payload, doc_text)

    assert "phase3" in res
    assert "risk_score" in res["phase3"]
    assert "approver_summary" in res["phase3"]
    assert "approver_checklist" in res["phase3"]


def test_run_review_non_packet_returns_phase3_and_fallback_summary():
    request_payload = {
        "destination_city": "San Diego",
        "start_date": "2026-03-10",
        "end_date": "2026-03-12",
        "justification": "Conference travel supporting program outcomes and coordination.",
        "traveler_name": "Test Traveler",
    }

    doc_text = "This is just a random document that is not a packet."

    res = run_review(request_payload, doc_text)

    # Your fallback should still include phase3 (per your fixes)
    assert "phase3" in res
    assert res["summary"]  # should be the fallback message list
    assert "risk_score" in res["phase3"]