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

from ..demo_cases import get_demo_case

router = APIRouter(prefix="/requests", tags=["requests"])
UPLOAD_DIR = Path("uploads")

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

class StatusUpdate(BaseModel):
    status: str
    comment: Optional[str] = None

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


@router.post("/{id}/submit")
def submit_request(id: str, db: Session = Depends(get_db)):
    req = db.query(TravelRequest).filter(TravelRequest.id == id).first()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    print(f"[SUBMIT] request_id={id}")
    print(f"[SUBMIT] attachment={req.attachment.filename if req.attachment else None}")
    print(f"[SUBMIT] packet_pdf_path={req.packet_pdf_path}")

    doc_text = ""

    if req.attachment:
        attachment_name = req.attachment.filename
        text_path = UPLOAD_DIR / f"{attachment_name}.txt"
        print(f"[SUBMIT] checking attachment text path: {text_path}")
        print(f"[SUBMIT] attachment text exists? {text_path.exists()}")

        if text_path.exists():
            doc_text = text_path.read_text(encoding="utf-8")

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

    return {
        "ok": True,
        "request_id": id,
        "status": "submitted",
        "review": review,
    }
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

    summary = safe_load("summary_text", row.summary_text)
    extracted_fields = safe_load("extracted_fields_json", row.extracted_fields_json)
    flags = safe_load("flags_json", row.flags_json)
    questions = safe_load("questions_json", row.questions_json)
    phase3 = safe_load("phase3_json", row.phase3_json)
    ml_result = safe_load("ml_json", row.ml_json)

    final_action = "clarify"
    for line in summary:
        if isinstance(line, str) and line.lower().startswith("final decision:"):
            final_action = line.split(":", 1)[1].strip().lower()
            break

    decision_explanation = [
        f"Final decision: {final_action.upper()}",
        f"Phase 3 risk score: {phase3.get('risk_score', 0)}",
        f"Risk level: {phase3.get('risk_level', 'UNKNOWN')}",
        f"ML prediction: {ml_result.get('ml_prediction', 'unknown')}",
        f"ML confidence: {ml_result.get('ml_confidence', 0):.2f}" if ml_result.get("ml_confidence") is not None else "ML confidence: unavailable",
    ]

    return AIReviewOut(
        summary=summary,
        extracted_fields=extracted_fields,
        flags=flags,
        questions=questions,
        phase3=phase3,
        ml_result=ml_result,
        final_action=final_action,
        decision_explanation=decision_explanation,
    )

@router.patch("/{request_id}/status", response_model=TravelRequestOut)
def update_request_status(request_id: str, payload: StatusUpdate, db: Session = Depends(get_db)):
    req = db.query(TravelRequest).filter(TravelRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    allowed = {"approved", "disapproved", "kickback"}
    new_status = (payload.status or "").strip().lower()
    req.reviewer_comment = payload.comment

    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed values: {sorted(allowed)}"
        )

    req.status = new_status
    db.commit()
    db.refresh(req)

    return TravelRequestOut(**req.__dict__)

@router.post("/demo/{scenario}")
def run_demo_scenario(scenario: str, db: Session = Depends(get_db)):
    try:
        request_payload, doc_text = get_demo_case(scenario)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create the request
    req_id = str(uuid.uuid4())
    req = TravelRequest(
        id=req_id,
        traveler_name=request_payload["traveler_name"],
        destination_city=request_payload["destination_city"],
        start_date=request_payload["start_date"],
        end_date=request_payload["end_date"],
        justification=request_payload["justification"],
        status="submitted",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Run AI review immediately
    review_result = run_review(request_payload, doc_text)

    # Save review row
    db.add(AIReview(
        request_id=req_id,
        summary_text=json.dumps(review_result["summary"]),
        extracted_fields_json=json.dumps(review_result["extracted_fields"]),
        flags_json=json.dumps(review_result["flags"]),
        questions_json=json.dumps(review_result["questions"]),
        phase3_json=json.dumps(review_result["phase3"]),
        ml_json=json.dumps(review_result["ml_result"]),
    ))

    db.commit()

    return {"id": req_id}