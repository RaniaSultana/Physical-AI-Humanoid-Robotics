"""User model with educational background fields."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.conversation import Conversation
    from src.models.reading_progress import ReadingProgress
    from src.models.quiz import Quiz, QuizAttempt
    from src.models.flashcard import FlashcardDeck, FlashcardReview
    from src.models.personalized_content import PersonalizedContent
    from src.models.code_execution import CodeExecution


class BackgroundType(str, enum.Enum):
    """User educational background types."""

    CS_STUDENT = "cs_student"
    ME_STUDENT = "me_student"
    EE_STUDENT = "ee_student"
    HOBBYIST = "hobbyist"
    PROFESSIONAL = "professional"
    OTHER = "other"


class ExperienceLevel(str, enum.Enum):
    """Experience level for software/hardware."""

    NONE = "none"
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class UserRole(str, enum.Enum):
    """User roles."""

    STUDENT = "student"
    AUTHOR = "author"
    ADMIN = "admin"


class User(Base, TimestampMixin):
    """User model with profile and educational background."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(100))

    # Educational background (FR-012)
    background_type: Mapped[Optional[BackgroundType]] = mapped_column(
        Enum(BackgroundType),
        nullable=True,
    )
    background_other: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    software_experience: Mapped[Optional[ExperienceLevel]] = mapped_column(
        Enum(ExperienceLevel),
        nullable=True,
    )
    hardware_experience: Mapped[Optional[ExperienceLevel]] = mapped_column(
        Enum(ExperienceLevel),
        nullable=True,
    )
    learning_goals: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Preferences
    preferred_language: Mapped[str] = mapped_column(
        String(10),
        default="en",
        nullable=False,
    )

    # Role
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole),
        default=UserRole.STUDENT,
        nullable=False,
    )

    # OAuth fields
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    github_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    apple_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)

    # Last login tracking
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    reading_progress: Mapped[list["ReadingProgress"]] = relationship(
        "ReadingProgress",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    conversations: Mapped[list["Conversation"]] = relationship(
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    quizzes: Mapped[list["Quiz"]] = relationship(
        "Quiz",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    quiz_attempts: Mapped[list["QuizAttempt"]] = relationship(
        "QuizAttempt",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    flashcard_decks: Mapped[list["FlashcardDeck"]] = relationship(
        "FlashcardDeck",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    flashcard_reviews: Mapped[list["FlashcardReview"]] = relationship(
        "FlashcardReview",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    personalized_content: Mapped[list["PersonalizedContent"]] = relationship(
        "PersonalizedContent",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    code_executions: Mapped[list["CodeExecution"]] = relationship(
        "CodeExecution",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User {self.email}>"

    @property
    def has_background(self) -> bool:
        """Check if user has set their educational background."""
        return self.background_type is not None
