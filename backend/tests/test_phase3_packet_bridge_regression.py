from app.review import run_review


def test_packet_phase2_flags_are_bridged_into_phase3_flags():
    request_payload = {
        "destination_city": "San Diego",
        "start_date": "2026-03-10",
        "end_date": "2026-03-12",
        "justification": "Attending conference to support program milestone deliverables.",
        "traveler_name": "Test Traveler",
    }

    # Force a Phase 2 destination mismatch: HOTEL_CITY differs from TAR destination
    doc_text = "\n".join([
        "TAR SUPPORTING DOCUMENTS PACKET",
        "FLIGHT_DESTINATION: San Diego",
        "FLIGHT_DEPART_DATE: 2026-03-10",
        "FLIGHT_RETURN_DATE: 2026-03-12",
        "HOTEL_CITY: Los Angeles",              # mismatch on purpose
        "HOTEL_CHECKIN_DATE: 2026-03-10",
        "HOTEL_CHECKOUT_DATE: 2026-03-12",
        "MIE_LOCALITY: San Diego",
    ])

    res = run_review(request_payload, doc_text)

    assert "phase3" in res
    p3 = res["phase3"]
    assert "flags" in p3

    codes = [f.get("code") for f in p3["flags"]]
    # This should exist if you bridge phase2_flags into phase3 flags
    assert "PH2_DESTINATION_MISMATCH_HOTEL" in codes

    # Checklist should be compact + grouped
    checklist = p3.get("approver_checklist", [])
    assert isinstance(checklist, list)
    assert any("Destination consistency:" in line for line in checklist) or any("Verify hotel city matches" in line for line in checklist)