import json
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..pdf_text import extract_pdf_text

from ..packet_pdf import generate_supporting_packet_pdf
from pydantic import BaseModel
from typing import Optional

from ..db import get_db
from ..models import TravelRequest, Attachment, AIReview
from ..schemas import TravelRequestCreate, TravelRequestOut, AIReviewOut
from ..settings import STORAGE_DIR
from ..review import run_review

router = APIRouter(prefix="/requests", tags=["requests"])

class PacketCreate(BaseModel):
    flight_destination: str = ""
    flight_depart_date: str = ""
    flight_return_date: str = ""
    hotel_city: str = ""
    hotel_checkin_date: str = ""
    hotel_checkout_date: str = ""
    rental_pickup_city: str = ""
    rental_pickup_date: str = ""
    rental_dropoff_date: str = ""
    parking_location: str = ""
    parking_start_date: str = ""
    parking_end_date: str = ""
    mie_locality: str = ""
    mie_rate_usd: str = ""
    mie_source: str = ""


@router.post("", response_model=TravelRequestOut)
def create_request(payload: TravelRequestCreate, db: Session = Depends(get_db)):
    req_id = str(uuid.uuid4())
    req = TravelRequest(
        id=req_id,
        traveler_name=payload.traveler_name,
        destination_city=payload.destination_city,
        start_date=payload.start_date,
        end_date=payload.end_date,
        justification=payload.justification,
        status="draft",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return TravelRequestOut(**req.__dict__)

@router.get("", response_model=list[TravelRequestOut])
def list_requests(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(TravelRequest)
    if status:
        q = q.filter(TravelRequest.status == status)
    rows = q.order_by(TravelRequest.created_at.desc()).all()
    return [TravelRequestOut(**r.__dict__) for r in rows]

@router.get("/{request_id}", response_model=TravelRequestOut)
def get_request(request_id: str, db: Session = Depends(get_db)):
    req = db.query(TravelRequest).filter(TravelRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return TravelRequestOut(**req.__dict__)

@router.post("/{request_id}/attachment")
def upload_attachment(request_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    req = db.query(TravelRequest).filter(TravelRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Save file
    attach_id = str(uuid.uuid4())
    safe_name = f"{attach_id}_{file.filename}"
    out_path = STORAGE_DIR / safe_name

    with out_path.open("wb") as f:
        f.write(file.file.read())

    # Upsert 1 attachment per request
    existing = db.query(Attachment).filter(Attachment.request_id == request_id).first()
    if existing:
        existing.filename = file.filename
        existing.file_path = str(out_path)
    else:
        db.add(Attachment(
            id=attach_id,
            request_id=request_id,
            filename=file.filename,
            file_path=str(out_path),
        ))

    db.commit()
    return {"ok": True, "filename": file.filename}

@router.post("/{request_id}/packet")
def create_packet(request_id: str, payload: PacketCreate, db: Session = Depends(get_db)):
    req = db.query(TravelRequest).filter(TravelRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # DEBUG (optional but useful once)
    print("DEBUG packet payload:", payload.model_dump())

    pdf_path = generate_supporting_packet_pdf(
        request_id=req.id,  # <-- this fixes REQUEST_ID
        traveler_name=req.traveler_name,

        tar_destination=req.destination_city,
        tar_start_date=req.start_date,
        tar_end_date=req.end_date,

        flight_destination=payload.flight_destination,
        flight_depart_date=payload.flight_depart_date,
        flight_return_date=payload.flight_return_date,

        hotel_city=payload.hotel_city,
        hotel_checkin_date=payload.hotel_checkin_date,
        hotel_checkout_date=payload.hotel_checkout_date,

        rental_pickup_city=payload.rental_pickup_city,
        rental_pickup_date=payload.rental_pickup_date,
        rental_dropoff_date=payload.rental_dropoff_date,

        parking_location=payload.parking_location,
        parking_start_date=payload.parking_start_date,
        parking_end_date=payload.parking_end_date,

        mie_locality=payload.mie_locality,
        mie_rate_usd=payload.mie_rate_usd,
        mie_source=payload.mie_source,
    )

    req.packet_pdf_path = str(pdf_path)
    db.commit()

    return {"ok": True, "packet_pdf_path": str(pdf_path)}


@router.post("/{request_id}/submit")
def submit_request(request_id: str, db: Session = Depends(get_db)):
    req = db.query(TravelRequest).filter(TravelRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req.status = "submitted"
    db.commit()

    # Minimal “doc_text”: placeholder (we’re not extracting PDF text yet)
    # Later you’ll replace this with real extraction.
    doc_text = None

# Prefer packet PDF (primary supporting packet)
    if req.packet_pdf_path:
        doc_text = extract_pdf_text(req.packet_pdf_path, max_pages=5)
    else:
        attachment = db.query(Attachment).filter(Attachment.request_id == request_id).first()
        if attachment:
            doc_text = extract_pdf_text(attachment.file_path, max_pages=5)

    if not doc_text:
        raise HTTPException(
            status_code=400,
            detail="No supporting document found. Upload attachment or generate packet before submitting."
        )



    review_payload = {
        "traveler_name": req.traveler_name,
        "destination_city": req.destination_city,
        "start_date": req.start_date,
        "end_date": req.end_date,
        "justification": req.justification,
    }
    review_result = run_review(review_payload, doc_text)

    review_row = db.query(AIReview).filter(AIReview.request_id == request_id).first()
    if review_row:
        review_row.summary_text = json.dumps(review_result["summary"])
        review_row.extracted_fields_json = json.dumps(review_result["extracted_fields"])
        review_row.flags_json = json.dumps(review_result["flags"])
        review_row.questions_json = json.dumps(review_result["questions"])
        review_row.phase3_json = json.dumps(review_result["phase3"])
        review_row.ml_json = json.dumps(review_result["ml"])
    else:
        db.add(AIReview(
        request_id=request_id,
        summary_text=json.dumps(review_result["summary"]),
        extracted_fields_json=json.dumps(review_result["extracted_fields"]),
        flags_json=json.dumps(review_result["flags"]),
        questions_json=json.dumps(review_result["questions"]),
        phase3_json=json.dumps(review_result["phase3"]),
        ml_json=json.dumps(review_result["ml"]),
    ))

    db.commit()
    return {"ok": True, "status": "submitted"}

@router.get("/{request_id}/review", response_model=AIReviewOut)
def get_review(request_id: str, db: Session = Depends(get_db)):
    row = db.query(AIReview).filter(AIReview.request_id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="No AI review yet")

    def safe_load(label: str, s: str):
        if s is None:
            raise HTTPException(status_code=500, detail=f"{label} is NULL in DB for request_id={request_id}")
        try:
            return json.loads(s)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to json.loads({label}). First 120 chars: {s[:120]!r}. Error: {e}"
            )

    return AIReviewOut(
    summary=safe_load("summary_text", row.summary_text),
    extracted_fields=safe_load("extracted_fields_json", row.extracted_fields_json),
    flags=safe_load("flags_json", row.flags_json),
    questions=safe_load("questions_json", row.questions_json),
    phase3=safe_load("phase3_json", row.phase3_json),
    ml=safe_load("ml_json", row.ml_json),
)
