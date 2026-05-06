"""Quiz and QuizAttempt models for AI-generated quizzes."""
from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional, Dict, List
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Text, text
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.user import User


class QuestionType(str, enum.Enum):
    """Type of quiz question."""

    MCQ = "mcq"  # Multiple choice
    TRUE_FALSE = "true_false"


class DifficultyLevel(str, enum.Enum):
    """Difficulty level of questions."""

    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Quiz(Base, TimestampMixin):
    """Quiz model for storing generated quizzes."""

    __tablename__ = "quizzes"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    chapter_slug: Mapped[str] = mapped_column(
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    question_count: Mapped[int] = mapped_column(nullable=False)
    difficulty: Mapped[DifficultyLevel] = mapped_column(
        nullable=False,
        default=DifficultyLevel.MEDIUM,
    )
    # Store generation parameters
    generation_params: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="quizzes")
    questions: Mapped[List["QuizQuestion"]] = relationship(
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="QuizQuestion.order",
    )
    attempts: Mapped[List["QuizAttempt"]] = relationship(
        back_populates="quiz",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Quiz(id={self.id}, title={self.title})>"


class QuizQuestion(Base):
    """Individual question in a quiz."""

    __tablename__ = "quiz_questions"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    quiz_id: Mapped[UUID] = mapped_column(
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_type: Mapped[QuestionType] = mapped_column(nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    # Options stored as JSON array: [{id, text, is_correct}]
    options: Mapped[List] = mapped_column(JSON, nullable=False)
    # Explanation shown after answering
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    difficulty: Mapped[DifficultyLevel] = mapped_column(
        nullable=False,
        default=DifficultyLevel.MEDIUM,
    )
    # Source context from the textbook
    source_context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(nullable=False)

    # Relationships
    quiz: Mapped["Quiz"] = relationship(back_populates="questions")

    def __repr__(self) -> str:
        return f"<QuizQuestion(id={self.id}, type={self.question_type})>"

    @property
    def correct_option_id(self) -> Optional[str]:
        """Get the ID of the correct option."""
        for option in self.options:
            if option.get("is_correct"):
                return option.get("id")
        return None


class QuizAttempt(Base, TimestampMixin):
    """User's attempt at a quiz."""

    __tablename__ = "quiz_attempts"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    quiz_id: Mapped[UUID] = mapped_column(
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Answers stored as JSON: {question_id: selected_option_id}
    answers: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    score: Mapped[Optional[float]] = mapped_column(nullable=True)
    correct_count: Mapped[Optional[int]] = mapped_column(nullable=True)
    total_count: Mapped[int] = mapped_column(nullable=False)
    time_taken_seconds: Mapped[Optional[int]] = mapped_column(nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        nullable=False,
        default=datetime.utcnow,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    is_completed: Mapped[bool] = mapped_column(nullable=False, default=False)

    # Relationships
    quiz: Mapped["Quiz"] = relationship(back_populates="attempts")
    user: Mapped["User"] = relationship(back_populates="quiz_attempts")

    def __repr__(self) -> str:
        return f"<QuizAttempt(id={self.id}, score={self.score})>"
