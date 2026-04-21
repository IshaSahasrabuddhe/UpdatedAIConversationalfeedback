from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"), nullable=False, index=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sentiment: Mapped[str] = mapped_column(String(50), nullable=False)
    positives: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    negatives: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    suggestions: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    issue_type: Mapped[str] = mapped_column(String(50), nullable=False)
    issue_tags: Mapped[list[Any]] = mapped_column(JSON, default=list, nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    conversation = relationship("Conversation", back_populates="feedback_entries")
