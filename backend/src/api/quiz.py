"""Quiz API endpoints for AI-generated quizzes."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.agents.quiz_agent import get_quiz_agent
from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.quiz import (
    DifficultyLevel,
    Quiz,
    QuizAttempt,
    QuizQuestion,
    QuestionType,
)
from src.models.user import User

router = APIRouter(prefix="/quiz", tags=["quiz"])


# Request/Response Models
class GenerateQuizRequest(BaseModel):
    """Request to generate a new quiz."""

    chapter_slug: str = Field(..., min_length=1, max_length=200)
    question_count: int = Field(default=5, ge=1, le=20)
    question_types: list[Literal["mcq", "true_false"]] | None = None
    difficulty: Literal["easy", "medium", "hard", "mixed"] = "mixed"


class QuestionOptionResponse(BaseModel):
    """A single option in a question."""

    id: str
    text: str
    is_correct: bool | None = None  # Only shown after answering


class QuestionResponse(BaseModel):
    """A quiz question response."""

    id: UUID
    question_type: str
    question_text: str
    options: list[QuestionOptionResponse]
    difficulty: str
    order: int
    explanation: str | None = None  # Only shown after answering


class QuizResponse(BaseModel):
    """Quiz response model."""

    id: UUID
    title: str
    description: str | None
    question_count: int
    difficulty: str
    questions: list[QuestionResponse]
    created_at: str


class QuizSummaryResponse(BaseModel):
    """Quiz summary for listing."""

    id: UUID
    title: str
    question_count: int
    difficulty: str
    created_at: str
    best_score: float | None = None
    attempts_count: int = 0


class StartAttemptResponse(BaseModel):
    """Response when starting a quiz attempt."""

    attempt_id: UUID
    quiz_id: UUID
    started_at: str


class SubmitAnswerRequest(BaseModel):
    """Request to submit an answer."""

    question_id: UUID
    selected_option_id: str


class AnswerResultResponse(BaseModel):
    """Result of answering a question."""

    question_id: UUID
    is_correct: bool
    correct_option_id: str
    explanation: str | None


class SubmitQuizRequest(BaseModel):
    """Request to submit the entire quiz."""

    answers: dict[str, str]  # {question_id: selected_option_id}


class QuizResultResponse(BaseModel):
    """Final quiz result."""

    attempt_id: UUID
    quiz_id: UUID
    score: float
    correct_count: int
    total_count: int
    time_taken_seconds: int
    questions: list[AnswerResultResponse]
    completed_at: str


# Endpoints
@router.post("/generate", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    request: GenerateQuizRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuizResponse:
    """Generate a new quiz for a chapter using AI."""
    agent = get_quiz_agent()

    # Generate questions using chapter_slug directly
    result = await agent.generate_quiz(
        chapter_slug=request.chapter_slug,
        question_count=request.question_count,
        question_types=request.question_types,
        difficulty=request.difficulty if request.difficulty != "mixed" else "medium",
    )

    if not result.questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not generate quiz questions. Try a different chapter.",
        )

    # Create quiz
    difficulty = (
        DifficultyLevel(request.difficulty)
        if request.difficulty != "mixed"
        else DifficultyLevel.MEDIUM
    )

    quiz = Quiz(
        chapter_slug=request.chapter_slug,
        user_id=current_user.id,
        title=f"Quiz: {request.chapter_slug}",
        question_count=len(result.questions),
        difficulty=difficulty,
        generation_params={
            "question_types": request.question_types,
            "difficulty": request.difficulty,
        },
    )
    db.add(quiz)
    await db.flush()

    # Create questions
    for i, q_data in enumerate(result.questions):
        question = QuizQuestion(
            quiz_id=quiz.id,
            question_type=QuestionType(q_data.question_type),
            question_text=q_data.question_text,
            options=q_data.options,
            explanation=q_data.explanation,
            difficulty=DifficultyLevel(q_data.difficulty),
            source_context=q_data.source_context,
            order=i,
        )
        db.add(question)

    await db.commit()
    await db.refresh(quiz)

    # Load questions
    query = select(Quiz).where(Quiz.id == quiz.id).options(selectinload(Quiz.questions))
    result = await db.execute(query)
    quiz = result.scalar_one()

    return _quiz_to_response(quiz, hide_answers=True)


@router.get("/my-quizzes", response_model=list[QuizSummaryResponse])
async def list_my_quizzes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
    offset: int = 0,
) -> list[QuizSummaryResponse]:
    """List quizzes created by the current user."""
    query = (
        select(Quiz)
        .where(Quiz.user_id == current_user.id)
        .order_by(Quiz.created_at.desc())
        .offset(offset)
        .limit(limit)
        .options(selectinload(Quiz.attempts))
    )
    result = await db.execute(query)
    quizzes = result.scalars().all()

    return [_quiz_to_summary(q) for q in quizzes]


@router.get("/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    quiz_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuizResponse:
    """Get a quiz by ID."""
    query = (
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(selectinload(Quiz.questions))
    )
    result = await db.execute(query)
    quiz = result.scalar_one_or_none()

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found",
        )

    return _quiz_to_response(quiz, hide_answers=True)


@router.post("/{quiz_id}/start", response_model=StartAttemptResponse)
async def start_quiz_attempt(
    quiz_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StartAttemptResponse:
    """Start a new quiz attempt."""
    quiz = await db.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found",
        )

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=current_user.id,
        total_count=quiz.question_count,
        started_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return StartAttemptResponse(
        attempt_id=attempt.id,
        quiz_id=quiz_id,
        started_at=attempt.started_at.isoformat(),
    )


@router.post("/{quiz_id}/attempts/{attempt_id}/submit", response_model=QuizResultResponse)
async def submit_quiz_attempt(
    quiz_id: UUID,
    attempt_id: UUID,
    request: SubmitQuizRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuizResultResponse:
    """Submit answers and complete a quiz attempt."""
    # Get attempt
    attempt = await db.get(QuizAttempt, attempt_id)
    if not attempt or attempt.quiz_id != quiz_id or attempt.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found",
        )

    if attempt.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This attempt has already been completed",
        )

    # Get quiz with questions
    query = select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.questions))
    result = await db.execute(query)
    quiz = result.scalar_one_or_none()

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found",
        )

    # Score the answers
    correct_count = 0
    question_results = []

    for question in quiz.questions:
        q_id = str(question.id)
        selected_option = request.answers.get(q_id)
        correct_option = question.correct_option_id

        is_correct = selected_option == correct_option
        if is_correct:
            correct_count += 1

        question_results.append(
            AnswerResultResponse(
                question_id=question.id,
                is_correct=is_correct,
                correct_option_id=correct_option or "",
                explanation=question.explanation,
            )
        )

    # Calculate score and time
    now = datetime.now(timezone.utc)
    time_taken = int((now - attempt.started_at).total_seconds())
    score = (correct_count / len(quiz.questions)) * 100 if quiz.questions else 0

    # Update attempt
    attempt.answers = request.answers
    attempt.score = score
    attempt.correct_count = correct_count
    attempt.time_taken_seconds = time_taken
    attempt.completed_at = now
    attempt.is_completed = True

    await db.commit()

    return QuizResultResponse(
        attempt_id=attempt.id,
        quiz_id=quiz_id,
        score=score,
        correct_count=correct_count,
        total_count=len(quiz.questions),
        time_taken_seconds=time_taken,
        questions=question_results,
        completed_at=now.isoformat(),
    )


@router.get("/{quiz_id}/attempts/{attempt_id}", response_model=QuizResultResponse)
async def get_attempt_result(
    quiz_id: UUID,
    attempt_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuizResultResponse:
    """Get the result of a completed quiz attempt."""
    attempt = await db.get(QuizAttempt, attempt_id)
    if not attempt or attempt.quiz_id != quiz_id or attempt.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found",
        )

    if not attempt.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This attempt is not yet completed",
        )

    # Get quiz with questions
    query = select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.questions))
    result = await db.execute(query)
    quiz = result.scalar_one()

    question_results = []
    for question in quiz.questions:
        q_id = str(question.id)
        selected_option = attempt.answers.get(q_id) if attempt.answers else None
        correct_option = question.correct_option_id

        question_results.append(
            AnswerResultResponse(
                question_id=question.id,
                is_correct=selected_option == correct_option,
                correct_option_id=correct_option or "",
                explanation=question.explanation,
            )
        )

    return QuizResultResponse(
        attempt_id=attempt.id,
        quiz_id=quiz_id,
        score=attempt.score or 0,
        correct_count=attempt.correct_count or 0,
        total_count=attempt.total_count,
        time_taken_seconds=attempt.time_taken_seconds or 0,
        questions=question_results,
        completed_at=attempt.completed_at.isoformat() if attempt.completed_at else "",
    )


# Helper functions
def _quiz_to_response(quiz: Quiz, hide_answers: bool = True) -> QuizResponse:
    """Convert a Quiz model to response."""
    questions = []
    for q in quiz.questions:
        options = []
        for opt in q.options:
            options.append(
                QuestionOptionResponse(
                    id=opt.get("id", ""),
                    text=opt.get("text", ""),
                    is_correct=None if hide_answers else opt.get("is_correct"),
                )
            )

        questions.append(
            QuestionResponse(
                id=q.id,
                question_type=q.question_type.value,
                question_text=q.question_text,
                options=options,
                difficulty=q.difficulty.value,
                order=q.order,
                explanation=None if hide_answers else q.explanation,
            )
        )

    return QuizResponse(
        id=quiz.id,
        title=quiz.title,
        description=quiz.description,
        question_count=quiz.question_count,
        difficulty=quiz.difficulty.value,
        questions=questions,
        created_at=quiz.created_at.isoformat(),
    )


def _quiz_to_summary(quiz: Quiz) -> QuizSummaryResponse:
    """Convert a Quiz model to summary response."""
    best_score = None
    if quiz.attempts:
        completed_attempts = [a for a in quiz.attempts if a.is_completed]
        if completed_attempts:
            best_score = max(a.score or 0 for a in completed_attempts)

    return QuizSummaryResponse(
        id=quiz.id,
        title=quiz.title,
        question_count=quiz.question_count,
        difficulty=quiz.difficulty.value,
        created_at=quiz.created_at.isoformat(),
        best_score=best_score,
        attempts_count=len(quiz.attempts),
    )
