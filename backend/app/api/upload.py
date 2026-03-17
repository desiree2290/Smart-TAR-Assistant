from fastapi import APIRouter, UploadFile, File
from pathlib import Path
from app.pdf_extract import extract_pdf_text
from app.review import run_review

router = APIRouter(prefix="/files", tags=["files"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/upload")
async def upload_packet(file: UploadFile = File(...)):

    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    # Extract text from PDF
    extracted_text = extract_pdf_text(str(file_path))

    # Run the AI review pipeline
    review_result = run_review(extracted_text)

    return {
        "filename": file.filename,
        "review": review_result
    }