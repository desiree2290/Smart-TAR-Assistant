import json
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..pdf_text import extract_pdf_text


from ..db import get_db
from ..models import TravelRequest, Attachment, AIReview
from ..schemas import TravelRequestCreate, TravelRequestOut, AIReviewOut
from ..settings import STORAGE_DIR
from ..review import run_review

router = APIRouter(prefix="/requests", tags=["requests"])

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
    attachment = db.query(Attachment).filter(Attachment.request_id == request_id).first()
    if attachment:
        doc_text = extract_pdf_text(attachment.file_path, max_pages=5)


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
    else:
        db.add(AIReview(
            request_id=request_id,
            summary_text=json.dumps(review_result["summary"]),
            extracted_fields_json=json.dumps(review_result["extracted_fields"]),
            flags_json=json.dumps(review_result["flags"]),
            questions_json=json.dumps(review_result["questions"]),
        ))

    db.commit()
    return {"ok": True, "status": "submitted"}

@router.get("/{request_id}/review", response_model=AIReviewOut)
def get_review(request_id: str, db: Session = Depends(get_db)):
    row = db.query(AIReview).filter(AIReview.request_id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="No AI review yet")

    return AIReviewOut(
        summary=json.loads(row.summary_text),
        extracted_fields=json.loads(row.extracted_fields_json),
        flags=json.loads(row.flags_json),
        questions=json.loads(row.questions_json),
    )
