from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from typing import Any

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
    summary: list[str]
    extracted_fields: dict[str, Any]
    flags: list[dict[str, Any]]
    questions: list[str]
    phase3: dict[str, Any]
    ml_result: dict[str, Any]
    final_action: str
    decision_explanation: list[str]
