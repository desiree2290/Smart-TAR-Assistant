import random
import uuid
from datetime import datetime, timedelta

from app.packet_pdf import generate_supporting_packet_pdf

DESTS = ["San Diego", "San Jose", "Norfolk", "Arlington"]
AIRPORTS = {
    "San Diego": "SAN",
    "San Jose": "SJC",
    "Norfolk": "ORF",
    "Arlington": "DCA"
}

def random_dates():
    start = datetime.today() + timedelta(days=random.randint(10, 120))
    end = start + timedelta(days=random.randint(1, 5))
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


def generate_case(i):

    dest = random.choice(DESTS)
    start, end = random_dates()

    # introduce random discrepancies
    missing_hotel = random.random() < 0.2
    missing_rental = random.random() < 0.3
    parking_mismatch = random.random() < 0.15

    airport = AIRPORTS[dest]

    parking_city = dest
    if parking_mismatch:
        parking_city = random.choice([d for d in DESTS if d != dest])

    generate_supporting_packet_pdf(
        request_id=str(uuid.uuid4()),
        traveler_name=f"Test Traveler {i}",

        tar_destination=dest,
        tar_start_date=start,
        tar_end_date=end,

        flight_destination=airport,
        flight_depart_date=start,
        flight_return_date=end,

        hotel_city="" if missing_hotel else dest,
        hotel_checkin_date=start,
        hotel_checkout_date=end,

        rental_pickup_city="" if missing_rental else dest,
        rental_pickup_date=start,
        rental_dropoff_date=end,

        parking_location=parking_city,
        parking_start_date=start,
        parking_end_date=end,

        mie_locality=dest,
        mie_rate_usd="79",
        mie_source="GSA",
    )


def main():
    for i in range(50):
        generate_case(i)

    print("Generated 50 test packets")


if __name__ == "__main__":
    main()