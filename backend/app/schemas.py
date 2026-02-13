from pydantic import BaseModel, Field
from typing import Optional, List, Dict

class TravelRequestCreate(BaseModel):
    traveler_name: str
    destination_city: str
    start_date: str  # YYYY-MM-DD
    end_date: str
    justification: str

class TravelRequestOut(BaseModel):
    id: str
    traveler_name: str
    destination_city: str
    start_date: str
    end_date: str
    justification: str
    status: str

class AttachmentOut(BaseModel):
    id: str
    filename: str

class AIFlag(BaseModel):
    type: str
    severity: str
    description: str

class AIReviewOut(BaseModel):
    summary: List[str]
    extracted_fields: Dict[str, str]
    flags: List[AIFlag]
    questions: List[str]
