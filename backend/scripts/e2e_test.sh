#!/usr/bin/env bash
set -euo pipefail

BASE="http://127.0.0.1:8000"

echo "Creating travel request..."

REQ_JSON=$(curl -s -X POST "$BASE/requests" \
  -H "Content-Type: application/json" \
  -d '{
    "traveler_name":"Desiree Hodge",
    "destination_city":"San Diego, CA",
    "start_date":"2026-03-10",
    "end_date":"2026-03-12",
    "justification":"Attend conference and meet with program stakeholders to align requirements."
  }')

REQ_ID=$(python -c "import json,sys; print(json.loads(sys.argv[1])['id'])" "$REQ_JSON")

echo "Created request: $REQ_ID"

echo "Generating supporting packet..."

curl -s -X POST "$BASE/requests/$REQ_ID/packet" \
  -H "Content-Type: application/json" \
  -d '{
    "flight_destination": "San Jose, CA",
    "flight_depart_date": "2026-03-10",
    "flight_return_date": "2026-03-13",
    "hotel_city": "San Diego, CA",
    "hotel_checkin_date": "2026-03-10",
    "hotel_checkout_date": "2026-03-12",
    "rental_pickup_city": "San Diego, CA",
    "rental_pickup_date": "2026-03-10",
    "rental_dropoff_date": "2026-03-12",
    "parking_location": "SAN Airport",
    "parking_start_date": "2026-03-10",
    "parking_end_date": "2026-03-12",
    "mie_locality": "San Diego, CA",
    "mie_rate_usd": "79",
    "mie_source": "GSA"
  }' | cat
echo
echo "Submitting request..."

curl -s -X POST "$BASE/requests/$REQ_ID/submit" | cat
echo
echo "Fetching review..."

curl -s "$BASE/requests/$REQ_ID/review" | cat
echo
echo "Done."