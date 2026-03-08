from app.review import run_review


def test_run_review_returns_ml_prediction():
    request_payload = {
        "destination_city": "San Diego",
        "start_date": "2026-03-10",
        "end_date": "2026-03-12",
        "justification": "Attending conference to support program milestone deliverables.",
        "traveler_name": "Test Traveler",
    }

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

    assert "ml" in res
    assert "predicted_action" in res["ml"]
    assert "probabilities" in res["ml"]