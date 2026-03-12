from sqlalchemy import String, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from .db import Base

class TravelRequest(Base):
    __tablename__ = "travel_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    traveler_name: Mapped[str] = mapped_column(String, nullable=False)
    destination_city: Mapped[str] = mapped_column(String, nullable=False)
    start_date: Mapped[str] = mapped_column(String, nullable=False)  # ISO string for simplicity
    end_date: Mapped[str] = mapped_column(String, nullable=False)
    justification: Mapped[str] = mapped_column(Text, nullable=False)

    packet_pdf_path: Mapped[str | None] = mapped_column(String, nullable=True)

    status: Mapped[str] = mapped_column(String, nullable=False, default="draft")  # draft/submitted/returned/approved/denied
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    attachment = relationship("Attachment", back_populates="request", uselist=False, cascade="all, delete-orphan")
    review = relationship("AIReview", back_populates="request", uselist=False, cascade="all, delete-orphan")

class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    request_id: Mapped[str] = mapped_column(String, ForeignKey("travel_requests.id"), nullable=False, unique=True)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    request = relationship("TravelRequest", back_populates="attachment")

class AIReview(Base):
    __tablename__ = "ai_reviews"

    request_id: Mapped[str] = mapped_column(String, ForeignKey("travel_requests.id"), primary_key=True)
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
    extracted_fields_json: Mapped[str] = mapped_column(Text, nullable=False)
    flags_json: Mapped[str] = mapped_column(Text, nullable=False)
    questions_json: Mapped[str] = mapped_column(Text, nullable=False)
    phase3_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    ml_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    request = relationship("TravelRequest", back_populates="review")