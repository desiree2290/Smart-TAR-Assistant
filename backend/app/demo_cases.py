from typing import Dict, Tuple


def get_demo_case(scenario: str) -> Tuple[Dict, str]:
    scenario = (scenario or "").strip().lower()

    if scenario == "approve":
        request_payload = {
            "traveler_name": "Jordan Smith",
            "destination_city": "San Diego",
            "start_date": "2026-05-10",
            "end_date": "2026-05-12",
            "justification": "Attend joint mission planning conference and coordinate with partner units.",
        }

        doc_text = """TAR SUPPORTING DOCUMENTS PACKET
FLIGHT_DESTINATION: San Diego
FLIGHT_DEPART_DATE: 2026-05-10
FLIGHT_RETURN_DATE: 2026-05-12
HOTEL_CITY: San Diego
HOTEL_CHECKIN_DATE: 2026-05-10
HOTEL_CHECKOUT_DATE: 2026-05-12
MIE_LOCALITY: San Diego
"""
        return request_payload, doc_text

    if scenario == "clarify":
        request_payload = {
            "traveler_name": "Jordan Smith",
            "destination_city": "San Jose",
            "start_date": "2026-06-01",
            "end_date": "2026-06-04",
            "justification": "Meeting.",
        }

        doc_text = """TAR SUPPORTING DOCUMENTS PACKET
FLIGHT_DESTINATION: San Jose
FLIGHT_DEPART_DATE: 2026-06-01
FLIGHT_RETURN_DATE: 2026-06-04
HOTEL_CITY: Los Angeles
HOTEL_CHECKIN_DATE: 2026-06-01
HOTEL_CHECKOUT_DATE: 2026-06-04
MIE_LOCALITY: San Jose
"""
        return request_payload, doc_text

    if scenario == "hold":
        request_payload = {
            "traveler_name": "Jordan Smith",
            "destination_city": "San Diego",
            "start_date": "2026-04-10",
            "end_date": "2026-04-12",
            "justification": "Meeting.",
        }

        doc_text = """TAR SUPPORTING DOCUMENTS PACKET
FLIGHT_DESTINATION: Los Angeles
FLIGHT_DEPART_DATE: 2026-04-12
FLIGHT_RETURN_DATE: 2026-04-10
HOTEL_CITY: Los Angeles
HOTEL_CHECKIN_DATE: 2026-04-10
HOTEL_CHECKOUT_DATE: 2026-04-12
MIE_LOCALITY: Los Angeles
"""
        return request_payload, doc_text

    raise ValueError(f"Unknown demo scenario: {scenario}")