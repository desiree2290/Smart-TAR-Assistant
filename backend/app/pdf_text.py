from typing import Optional
from pypdf import PdfReader

def extract_pdf_text(file_path: str, max_pages: int = 5) -> Optional[str]:
    """
    Extract text from a PDF (text-based PDFs).
    For scanned PDFs, this may return little/no text (OCR is a later upgrade).
    """
    try:
        reader = PdfReader(file_path)
        pages = reader.pages[:max_pages]
        chunks = []
        for p in pages:
            text = p.extract_text() or ""
            if text.strip():
                chunks.append(text)
        joined = "\n".join(chunks).strip()
        return joined if joined else None
    except Exception:
        # Keep MVP resilient: don't crash the API if a PDF is weird
        return None
