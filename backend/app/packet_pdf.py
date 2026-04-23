# backend/app/packet_pdf.py

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any, Dict

from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas

from .settings import STORAGE_DIR

FIELD_ALIASES = {
    "DESTINATION": "FLIGHT_DESTINATION",
    "DEPART_DATE": "FLIGHT_DEPART_DATE",
    "RETURN_DATE": "FLIGHT_RETURN_DATE",
    "HOTEL": "HOTEL_CITY",
    "HOTEL_CHECKIN": "HOTEL_CHECKIN_DATE",
    "HOTEL_CHECKOUT": "HOTEL_CHECKOUT_DATE",
    "RENTAL CAR": "RENTAL_PICKUP_CITY",
    "PARKING": "PARKING_LOCATION",
}

# ----------------------------
# Public API
# ----------------------------

def generate_supporting_packet_pdf(
    *,
    request_id: str,
    traveler_name: str = "",
    # TAR (source of truth)
    tar_destination: str = "",
    tar_start_date: str = "",  # expected ISO: YYYY-MM-DD
    tar_end_date: str = "",    # expected ISO: YYYY-MM-DD

    # Flight
    flight_destination: str = "",
    flight_depart_date: str = "",
    flight_return_date: str = "",

    # Hotel
    hotel_city: str = "",
    hotel_checkin_date: str = "",
    hotel_checkout_date: str = "",

    # Rental
    rental_pickup_city: str = "",
    rental_pickup_date: str = "",
    rental_dropoff_date: str = "",

    # Parking
    parking_location: str = "",
    parking_start_date: str = "",
    parking_end_date: str = "",

    # M&IE
    mie_locality: str = "",
    mie_rate_usd: str = "",
    mie_source: str = "",

) -> str:
    """
    Generate a standardized TAR Supporting Documents Packet PDF.

    Returns:
        Absolute path to the generated PDF (string).
    """

    from .settings import STORAGE_DIR

    STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    filename = f"{request_id}_supporting_packet.pdf"
    output_path = (STORAGE_DIR / filename).resolve()


    packet = {
        # Header
        "PACKET_VERSION": "v1",
        "GENERATED_ON": date.today().isoformat(),

        # TAR
        "REQUEST_ID": request_id,
        "TRAVELER_NAME": traveler_name,
        "TAR_DESTINATION": tar_destination,
        "TAR_START_DATE": tar_start_date,
        "TAR_END_DATE": tar_end_date,

        # Flight
        "FLIGHT_DESTINATION": flight_destination,
        "FLIGHT_DEPART_DATE": flight_depart_date,
        "FLIGHT_RETURN_DATE": flight_return_date,

        # Hotel
        "HOTEL_CITY": hotel_city,
        "HOTEL_CHECKIN_DATE": hotel_checkin_date,
        "HOTEL_CHECKOUT_DATE": hotel_checkout_date,

        # Rental
        "RENTAL_PICKUP_CITY": rental_pickup_city,
        "RENTAL_PICKUP_DATE": rental_pickup_date,
        "RENTAL_DROPOFF_DATE": rental_dropoff_date,

        # Parking
        "PARKING_LOCATION": parking_location,
        "PARKING_START_DATE": parking_start_date,
        "PARKING_END_DATE": parking_end_date,

        # M&IE
        "MIE_LOCALITY": mie_locality,
        "MIE_RATE_USD": mie_rate_usd,
        "MIE_SOURCE": mie_source,
    }

    _render_packet_pdf(output_path=output_path, packet=packet)
    return str(output_path)


# ----------------------------
# PDF rendering (internal)
# ----------------------------

def _render_packet_pdf(*, output_path: Path, packet: Dict[str, Any]) -> None:
    """
    Render the packet PDF with strict, easy-to-parse labels.

    Format rules:
      - Section titles are ALL CAPS without colon
      - Field lines are LABEL: value
      - Values are printed on the same line (no wrapping)
        (keeps parsing simple; long values can be truncated)
    """

    c = canvas.Canvas(str(output_path), pagesize=LETTER)
    width, height = LETTER  # noqa: F841

    left = 50
    top = height - 50
    y = top
    line_h = 16

    def new_page():
        nonlocal y
        c.showPage()
        y = top

    def write_line(text: str):
        nonlocal y
        if y < 70:
            new_page()
        c.drawString(left, y, text)
        y -= line_h

    def write_blank():
        write_line("")

    def write_section(title: str):
        write_line(title)
        write_line("-" * min(len(title), 60))

    # Title block
    write_line("TAR SUPPORTING DOCUMENTS PACKET")
    write_line(f"PACKET_VERSION: {packet.get('PACKET_VERSION', 'v1')}")
    write_line(f"GENERATED_ON: {packet.get('GENERATED_ON', '')}")
    write_blank()

    # TAR
    write_section("TAR")
    _write_field(write_line, "REQUEST_ID", packet.get("REQUEST_ID"))
    _write_field(write_line, "TRAVELER_NAME", packet.get("TRAVELER_NAME"))
    _write_field(write_line, "TAR_DESTINATION", packet.get("TAR_DESTINATION"))
    _write_field(write_line, "TAR_START_DATE", packet.get("TAR_START_DATE"))
    _write_field(write_line, "TAR_END_DATE", packet.get("TAR_END_DATE"))
    write_blank()

    # Flight
    write_section("FLIGHT_ITINERARY")
    _write_field(write_line, "FLIGHT_DESTINATION", packet.get("FLIGHT_DESTINATION"))
    _write_field(write_line, "FLIGHT_DEPART_DATE", packet.get("FLIGHT_DEPART_DATE"))
    _write_field(write_line, "FLIGHT_RETURN_DATE", packet.get("FLIGHT_RETURN_DATE"))
    write_blank()

    # Hotel
    write_section("HOTEL_RESERVATION")
    _write_field(write_line, "HOTEL_CITY", packet.get("HOTEL_CITY"))
    _write_field(write_line, "HOTEL_CHECKIN_DATE", packet.get("HOTEL_CHECKIN_DATE"))
    _write_field(write_line, "HOTEL_CHECKOUT_DATE", packet.get("HOTEL_CHECKOUT_DATE"))
    write_blank()

    # Rental
    write_section("RENTAL_CAR")
    _write_field(write_line, "RENTAL_PICKUP_CITY", packet.get("RENTAL_PICKUP_CITY"))
    _write_field(write_line, "RENTAL_PICKUP_DATE", packet.get("RENTAL_PICKUP_DATE"))
    _write_field(write_line, "RENTAL_DROPOFF_DATE", packet.get("RENTAL_DROPOFF_DATE"))
    write_blank()

    # Parking
    write_section("AIRPORT_PARKING")
    _write_field(write_line, "PARKING_LOCATION", packet.get("PARKING_LOCATION"))
    _write_field(write_line, "PARKING_START_DATE", packet.get("PARKING_START_DATE"))
    _write_field(write_line, "PARKING_END_DATE", packet.get("PARKING_END_DATE"))
    write_blank()

    # M&IE
    write_section("MIE_RATE")
    _write_field(write_line, "MIE_LOCALITY", packet.get("MIE_LOCALITY"))
    _write_field(write_line, "MIE_RATE_USD", packet.get("MIE_RATE_USD"))
    _write_field(write_line, "MIE_SOURCE", packet.get("MIE_SOURCE"))
    write_blank()

    c.save()


def _write_field(write_line_fn, label: str, value: Any, *, max_len: int = 120) -> None:
    """
    Writes a single parse-friendly line:
        LABEL: value

    - Ensures there is always exactly one colon after the label
    - Sanitizes newlines in the value
    - Truncates very long values to avoid wrapping (keeps parsing stable)
    """
    s = "" if value is None else str(value)
    s = s.replace("\n", " ").replace("\r", " ").strip()
    if len(s) > max_len:
        s = s[: max_len - 3] + "..."
    write_line_fn(f"{label}: {s}")


def _safe_filename(s: str) -> str:
    """
    Remove/replace characters that are annoying in filenames.
    """
    s = (s or "").strip()
    out = []
    for ch in s:
        if ch.isalnum() or ch in ("-", "_"):
            out.append(ch)
        else:
            out.append("_")
    return "".join(out) or "tar"
