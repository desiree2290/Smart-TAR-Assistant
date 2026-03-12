from app.review import run_review


def run_demo_case(title, request_payload, doc_text):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)

    result = run_review(request_payload, doc_text)

    for line in result["summary"]:
        print(line)

    print("\nML Result:")
    print(result["ml_result"])


# -------------------------
# 1 APPROVE SCENARIO
# -------------------------

approve_request = {
    "traveler_name": "Jordan Smith",
    "destination_city": "San Diego",
    "start_date": "2026-05-10",
    "end_date": "2026-05-12",
    "justification": "Attend joint mission planning conference and coordinate with partner units."
}

approve_doc = """TAR SUPPORTING DOCUMENTS PACKET
FLIGHT_DESTINATION: San Diego
FLIGHT_DEPART_DATE: 2026-05-10
FLIGHT_RETURN_DATE: 2026-05-12
HOTEL_CITY: San Diego
HOTEL_CHECKIN_DATE: 2026-05-10
HOTEL_CHECKOUT_DATE: 2026-05-12
MIE_LOCALITY: San Diego
"""


# -------------------------
# 2 CLARIFY SCENARIO
# -------------------------

clarify_request = {
    "traveler_name": "Jordan Smith",
    "destination_city": "San Jose",
    "start_date": "2026-06-01",
    "end_date": "2026-06-04",
    "justification": "Meeting."
}

clarify_doc = """TAR SUPPORTING DOCUMENTS PACKET
FLIGHT_DESTINATION: San Jose
FLIGHT_DEPART_DATE: 2026-06-01
FLIGHT_RETURN_DATE: 2026-06-04
HOTEL_CITY: Los Angeles
HOTEL_CHECKIN_DATE: 2026-06-01
HOTEL_CHECKOUT_DATE: 2026-06-04
MIE_LOCALITY: San Jose
"""


# -------------------------
# 3 HOLD SCENARIO
# -------------------------

hold_request = {
    "traveler_name": "Jordan Smith",
    "destination_city": "San Diego",
    "start_date": "2026-04-10",
    "end_date": "2026-04-12",
    "justification": "Meeting."
}

hold_doc = """TAR SUPPORTING DOCUMENTS PACKET
FLIGHT_DESTINATION: Los Angeles
FLIGHT_DEPART_DATE: 2026-04-12
FLIGHT_RETURN_DATE: 2026-04-10
HOTEL_CITY: Los Angeles
HOTEL_CHECKIN_DATE: 2026-04-10
HOTEL_CHECKOUT_DATE: 2026-04-12
MIE_LOCALITY: Los Angeles
"""


if __name__ == "__main__":
    run_demo_case("APPROVE SCENARIO", approve_request, approve_doc)
    run_demo_case("CLARIFY SCENARIO", clarify_request, clarify_doc)
    run_demo_case("HOLD SCENARIO", hold_request, hold_doc)