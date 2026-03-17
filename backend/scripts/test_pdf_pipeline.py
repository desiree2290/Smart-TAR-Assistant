from pathlib import Path
import json

from app.pdf_text import extract_pdf_text
from app.review import run_review


def test_one_pdf(pdf_path: str, request_payload: dict):
    pdf_file = Path(pdf_path)

    if not pdf_file.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_file}")

    print(f"\nTesting: {pdf_file.name}")

    # Step 1: Extract text from PDF
    doc_text = extract_pdf_text(str(pdf_file), max_pages=5)

    print("\n--- Extracted Text Preview ---")
    print(doc_text[:1000] if doc_text else "No text extracted")

    if not doc_text:
        raise ValueError("No text could be extracted from the PDF")

    # Step 2: Run review
    result = run_review(request_payload, doc_text)

    # Step 3: Print important outputs
    print("\n--- Summary ---")
    for line in result.get("summary", []):
        print("-", line)

    print("\n--- Flags ---")
    flags = result.get("flags", [])
    if not flags:
        print("No flags")
    else:
        for f in flags:
            print(f"- {f.get('type')} ({f.get('severity')}): {f.get('description')}")

    print("\n--- ML Result ---")
    print(json.dumps(result.get("ml_result", {}), indent=2))

    print("\n--- Phase 3 ---")
    print(json.dumps(result.get("phase3", {}), indent=2))

    return result


if __name__ == "__main__":
    # Change this path to one of your generated PDFs
    pdf_path = "app/storage/4b3ce17d-ea18-4035-94a2-12b394c80344_supporting_packet.pdf"

    # This is the TAR request payload your review engine expects
    request_payload = {
        "traveler_name": "Test Traveler",
        "destination_city": "San Diego",
        "start_date": "2026-03-10",
        "end_date": "2026-03-12",
        "justification": "Attend a conference relevant to current program objectives and improve organizational readiness.",
    }

    test_one_pdf(pdf_path, request_payload)