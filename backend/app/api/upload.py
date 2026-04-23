from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pathlib import Path
from app.pdf_extract import extract_pdf_text
from app.review import run_review
from app.db import get_db
from sqlalchemy.orm import Session
from app.models import TravelRequest, Attachment
from app.pdf_extract import extract_pdf_text
from uuid import uuid4
import json
from app.models import AIReview


router = APIRouter(prefix="/files", tags=["files"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/upload/{request_id}")
async def upload_packet(
    request_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    req = db.query(TravelRequest).filter(TravelRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    extracted_text = extract_pdf_text(str(file_path))

    text_path = UPLOAD_DIR / f"{file.filename}.txt"
    with open(text_path, "w", encoding="utf-8") as f:
        f.write(extracted_text)

    existing_attachment = req.attachment

    if existing_attachment:
        existing_attachment.filename = file.filename
        existing_attachment.file_path = str(file_path)
    else:
        req.attachment = Attachment(
            id=str(uuid4()),
            request_id=req.id,
            filename=file.filename,
            file_path=str(file_path),
        )

    db.commit()
    db.refresh(req)

    print(f"[UPLOAD] request_id={request_id}")
    print(f"[UPLOAD] attachment filename={req.attachment.filename if req.attachment else None}")
    print(f"[UPLOAD] attachment file_path={req.attachment.file_path if req.attachment else None}")
    print(f"[UPLOAD] text path={text_path}")
    print(f"[UPLOAD] text exists? {text_path.exists()}")

    return {
        "filename": file.filename,
        "extracted_text_preview": extracted_text[:500],
        "message": "Packet uploaded and text extracted successfully."
    }


@router.post("/{id}/submit")
def submit_request(id: str, db: Session = Depends(get_db)):
    req = db.query(TravelRequest).filter(TravelRequest.id == id).first()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    print(f"[SUBMIT] request_id={id}")
    print(f"[SUBMIT] attachment={req.attachment.filename if req.attachment else None}")
    print(f"[SUBMIT] packet_pdf_path={req.packet_pdf_path}")

    doc_text = ""

    # Prefer uploaded attachment text if present
    if req.attachment:
        attachment_name = req.attachment.filename
        text_path = UPLOAD_DIR / f"{attachment_name}.txt"

        print(f"[SUBMIT] checking attachment text path: {text_path}")
        print(f"[SUBMIT] attachment text exists? {text_path.exists()}")

        if text_path.exists():
            doc_text = text_path.read_text(encoding="utf-8")

    # Fall back to generated packet if needed
    if not doc_text and req.packet_pdf_path:
        packet_path = Path(req.packet_pdf_path)

        print(f"[SUBMIT] checking packet path: {packet_path}")
        print(f"[SUBMIT] packet exists? {packet_path.exists()}")

        if packet_path.exists():
            doc_text = extract_pdf_text(str(packet_path))

    if not doc_text:
        raise HTTPException(
            status_code=400,
            detail="No supporting document found. Upload attachment or generate packet before submitting."
        )

    request_payload = {
        "traveler_name": req.traveler_name,
        "destination_city": req.destination_city,
        "start_date": str(req.start_date),
        "end_date": str(req.end_date),
        "justification": req.justification,
    }

    review = run_review(request_payload, doc_text)

    existing_review = req.review

    review_record = {
        "summary_text": review.get("summary", ""),
        "extracted_fields_json": json.dumps(review.get("features_used", {})),
        "flags_json": json.dumps(review.get("flags", [])),
        "questions_json": json.dumps(review.get("questions", [])),
        "phase3_json": json.dumps(review.get("phase3", {})),
        "ml_json": json.dumps({
            "prediction": review.get("prediction"),
            "confidence": review.get("confidence"),
            "probabilities": review.get("probabilities"),
        }),
    }

    if existing_review:
        for k, v in review_record.items():
            setattr(existing_review, k, v)
    else:
        db.add(AIReview(
            request_id=req.id,
            **review_record
        ))

    db.commit()


    return {
        "request_id": id,
        "status": "submitted",
        "review": review,
    }