"""Code execution model for tracking user code runs in the playground."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base


class CodeExecution(Base):
    """Tracks code execution in the interactive playground.

    Records each code execution attempt by users, including the original
    and executed code, output/errors, and performance metrics.
    """

    __tablename__ = "codeexecutions"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )

    # User who executed the code (optional for anonymous execution)
    user_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )

    # Chapter context (optional)
    chapter_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("chapters.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    # Code block identifier (for tracking which example was modified)
    code_block_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # Programming language
    language: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    # The original code from the textbook (for comparison)
    original_code: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # The code that was actually executed (may be modified by user)
    executed_code: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Execution results
    output: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    error: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Performance metrics
    execution_time_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    # Execution status
    success: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
    )

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="code_executions")
    chapter = relationship("Chapter", back_populates="code_executions")

    def __repr__(self) -> str:
        return f"<CodeExecution(id={self.id}, language={self.language}, success={self.success})>"
