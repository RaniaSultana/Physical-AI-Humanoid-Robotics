"""Database models package."""

from src.models.base import Base, TimestampMixin
from src.models.user import User, BackgroundType, ExperienceLevel, UserRole
from src.models.session import Session
from src.models.content import Chapter, ContentChunk, ContentStatus
from src.models.reading_progress import ReadingProgress
from src.models.conversation import (
    Conversation,
    Message,
    Citation,
    MessageRole,
    ContextMode,
)
from src.models.quiz import Quiz, QuizQuestion, QuizAttempt, QuestionType
from src.models.flashcard import (
    FlashcardDeck,
    Flashcard,
    FlashcardReview,
)
from src.models.personalized_content import (
    TranslatedContent,
    PersonalizedContent,
    ContentLanguage,
    PersonalizationType,
)
from src.models.code_execution import CodeExecution

__all__ = [
    # Base
    "Base",
    "TimestampMixin",
    # User & Auth
    "User",
    "BackgroundType",
    "ExperienceLevel",
    "UserRole",
    "Session",
    # Content
    "Chapter",
    "ContentChunk",
    "ContentStatus",
    "ReadingProgress",
    # Conversation
    "Conversation",
    "Message",
    "Citation",
    "MessageRole",
    "ContextMode",
    # Quiz
    "Quiz",
    "QuizQuestion",
    "QuizAttempt",
    "QuestionType",
    # Flashcard
    "FlashcardDeck",
    "Flashcard",
    "FlashcardReview",
    # Personalized Content
    "TranslatedContent",
    "PersonalizedContent",
    "ContentLanguage",
    "PersonalizationType",
    # Code Execution
    "CodeExecution",
]
