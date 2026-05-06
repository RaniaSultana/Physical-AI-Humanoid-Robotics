"""Reading progress tracking model."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.content import Chapter
    from src.models.user import User


class ReadingProgress(Base, TimestampMixin):
    """Track user's reading progress for each chapter."""

    __tablename__ = "reading_progress"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chapter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chapters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Progress tracking (FR-011)
    scroll_position: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Time tracking
    total_time_seconds: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    last_accessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="reading_progress")
    chapter: Mapped["Chapter"] = relationship("Chapter", back_populates="reading_progress")

    __table_args__ = (
        UniqueConstraint("user_id", "chapter_id", name="uq_user_chapter_progress"),
    )

    def __repr__(self) -> str:
        return f"<ReadingProgress user={self.user_id} chapter={self.chapter_id}>"

    def mark_complete(self) -> None:
        """Mark the chapter as completed."""
        self.completed = True
        self.completed_at = datetime.now()
        self.scroll_position = 1.0

    def update_progress(self, scroll_position: float, time_spent: int = 0) -> None:
        """Update reading progress."""
        self.scroll_position = min(max(scroll_position, 0.0), 1.0)
        self.total_time_seconds += time_spent
        self.last_accessed_at = datetime.now()
