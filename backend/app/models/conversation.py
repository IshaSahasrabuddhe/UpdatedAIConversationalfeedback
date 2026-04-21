from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ConversationState


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    state: Mapped[ConversationState] = mapped_column(
        Enum(ConversationState), default=ConversationState.START, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), default="New feedback session", nullable=False)
    context: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    task_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_output_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user = relationship("User", back_populates="conversations")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.timestamp",
    )
    feedback_entries = relationship("Feedback", back_populates="conversation", cascade="all, delete-orphan")
