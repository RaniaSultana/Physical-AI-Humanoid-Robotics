"""Quiz service with scoring, grading, and analytics."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass
class QuestionResult:
    """Result for a single question."""

    question_id: str
    question_type: str
    correct: bool
    points_earned: float
    max_points: float
    user_answer: Any
    correct_answer: Any
    explanation: str | None = None
    time_taken_ms: int | None = None


@dataclass
class QuizScoreResult:
    """Overall quiz scoring result."""

    quiz_id: UUID
    user_id: UUID
    total_score: float
    max_score: float
    percentage: float
    grade: str
    question_results: list[QuestionResult]
    time_taken_seconds: int | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    passed: bool = False
    feedback: str | None = None


@dataclass
class QuizAnalytics:
    """Analytics for a quiz or user's quiz history."""

    total_attempts: int
    average_score: float
    highest_score: float
    lowest_score: float
    average_time_seconds: float
    pass_rate: float
    questions_by_difficulty: dict[str, dict[str, float]] = field(default_factory=dict)
    improvement_trend: list[float] = field(default_factory=list)


def calculate_score(
    answers: dict[str, Any],
    questions: list[dict],
) -> QuizScoreResult:
    """
    Calculate score for a quiz attempt.

    Args:
        answers: Dictionary mapping question_id to user's answer
        questions: List of question dictionaries with correct answers

    Returns:
        QuizScoreResult with detailed scoring breakdown
    """
    question_results: list[QuestionResult] = []
    total_score = 0.0
    max_score = 0.0

    for question in questions:
        q_id = str(question.get("id", ""))
        q_type = question.get("question_type", "multiple_choice")
        correct_answer = question.get("correct_answer")
        points = float(question.get("points", 1))
        explanation = question.get("explanation")

        user_answer = answers.get(q_id)
        max_score += points

        # Check if answer is correct based on question type
        is_correct = check_answer(user_answer, correct_answer, q_type)
        points_earned = points if is_correct else 0.0
        total_score += points_earned

        question_results.append(
            QuestionResult(
                question_id=q_id,
                question_type=q_type,
                correct=is_correct,
                points_earned=points_earned,
                max_points=points,
                user_answer=user_answer,
                correct_answer=correct_answer,
                explanation=explanation if not is_correct else None,
            )
        )

    # Calculate percentage and grade
    percentage = (total_score / max_score * 100) if max_score > 0 else 0
    grade = calculate_grade(percentage)
    passed = percentage >= 70.0  # 70% passing threshold

    # Generate feedback
    feedback = generate_feedback(percentage, question_results)

    return QuizScoreResult(
        quiz_id=UUID("00000000-0000-0000-0000-000000000000"),  # Placeholder
        user_id=UUID("00000000-0000-0000-0000-000000000000"),  # Placeholder
        total_score=total_score,
        max_score=max_score,
        percentage=round(percentage, 1),
        grade=grade,
        question_results=question_results,
        passed=passed,
        feedback=feedback,
    )


def check_answer(user_answer: Any, correct_answer: Any, question_type: str) -> bool:
    """
    Check if user's answer is correct.

    Args:
        user_answer: The answer provided by user
        correct_answer: The correct answer
        question_type: Type of question (multiple_choice, true_false, short_answer)

    Returns:
        True if answer is correct
    """
    if user_answer is None:
        return False

    if question_type == "true_false":
        # Normalize boolean answers
        user_bool = normalize_boolean(user_answer)
        correct_bool = normalize_boolean(correct_answer)
        return user_bool == correct_bool

    elif question_type == "multiple_choice":
        # Compare selected option (case-insensitive for letter options)
        user_str = str(user_answer).strip().upper()
        correct_str = str(correct_answer).strip().upper()
        return user_str == correct_str

    elif question_type == "short_answer":
        # Fuzzy comparison for short answers
        return fuzzy_match(str(user_answer), str(correct_answer))

    else:
        # Default exact comparison
        return str(user_answer).strip().lower() == str(correct_answer).strip().lower()


def normalize_boolean(value: Any) -> bool | None:
    """Normalize various representations of boolean values."""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        value_lower = value.strip().lower()
        if value_lower in ("true", "yes", "t", "y", "1"):
            return True
        if value_lower in ("false", "no", "f", "n", "0"):
            return False
    return None


def fuzzy_match(user_answer: str, correct_answer: str, threshold: float = 0.8) -> bool:
    """
    Perform fuzzy matching for short answer questions.

    Args:
        user_answer: User's answer
        correct_answer: Correct answer
        threshold: Similarity threshold (0-1)

    Returns:
        True if answers match within threshold
    """
    # Normalize both strings
    user_normalized = user_answer.strip().lower()
    correct_normalized = correct_answer.strip().lower()

    # Exact match
    if user_normalized == correct_normalized:
        return True

    # Check if correct answer is contained in user answer or vice versa
    if correct_normalized in user_normalized or user_normalized in correct_normalized:
        return True

    # Simple Levenshtein-like similarity
    similarity = calculate_similarity(user_normalized, correct_normalized)
    return similarity >= threshold


def calculate_similarity(s1: str, s2: str) -> float:
    """Calculate similarity ratio between two strings."""
    if not s1 or not s2:
        return 0.0

    # Simple character-based similarity
    s1_set = set(s1.lower())
    s2_set = set(s2.lower())

    intersection = len(s1_set & s2_set)
    union = len(s1_set | s2_set)

    if union == 0:
        return 0.0

    return intersection / union


def calculate_grade(percentage: float) -> str:
    """
    Calculate letter grade from percentage.

    Uses standard grading scale:
    A: 90-100
    B: 80-89
    C: 70-79
    D: 60-69
    F: 0-59
    """
    if percentage >= 90:
        return "A"
    elif percentage >= 80:
        return "B"
    elif percentage >= 70:
        return "C"
    elif percentage >= 60:
        return "D"
    else:
        return "F"


def generate_feedback(percentage: float, results: list[QuestionResult]) -> str:
    """Generate personalized feedback based on quiz performance."""
    correct_count = sum(1 for r in results if r.correct)
    total_count = len(results)

    if percentage >= 90:
        feedback = "Excellent work! You've demonstrated strong mastery of this material."
    elif percentage >= 80:
        feedback = "Great job! You have a solid understanding of most concepts."
    elif percentage >= 70:
        feedback = "Good effort! You're on the right track, but there's room for improvement."
    elif percentage >= 60:
        feedback = "You're making progress, but consider reviewing the material more thoroughly."
    else:
        feedback = "This topic needs more study. Review the chapter and try again."

    # Add specific feedback about incorrect answers
    incorrect_count = total_count - correct_count
    if incorrect_count > 0:
        feedback += f" You got {incorrect_count} question(s) wrong - check the explanations to understand why."

    return feedback


def calculate_quiz_analytics(attempts: list[dict]) -> QuizAnalytics:
    """
    Calculate analytics from a list of quiz attempts.

    Args:
        attempts: List of attempt dictionaries with score, percentage, time data

    Returns:
        QuizAnalytics with aggregated statistics
    """
    if not attempts:
        return QuizAnalytics(
            total_attempts=0,
            average_score=0.0,
            highest_score=0.0,
            lowest_score=0.0,
            average_time_seconds=0.0,
            pass_rate=0.0,
        )

    scores = [a.get("percentage", 0) for a in attempts]
    times = [a.get("time_taken_seconds", 0) for a in attempts if a.get("time_taken_seconds")]
    passed = [a for a in attempts if a.get("percentage", 0) >= 70]

    return QuizAnalytics(
        total_attempts=len(attempts),
        average_score=round(sum(scores) / len(scores), 1),
        highest_score=max(scores),
        lowest_score=min(scores),
        average_time_seconds=round(sum(times) / len(times), 1) if times else 0.0,
        pass_rate=round(len(passed) / len(attempts) * 100, 1),
        improvement_trend=scores[-5:] if len(scores) >= 5 else scores,  # Last 5 attempts
    )


def estimate_quiz_time(question_count: int, difficulty: str = "medium") -> dict:
    """
    Estimate time needed to complete a quiz.

    Args:
        question_count: Number of questions
        difficulty: Quiz difficulty (easy, medium, hard)

    Returns:
        Dictionary with time estimates
    """
    # Average seconds per question by difficulty
    time_per_question = {
        "easy": 30,
        "medium": 45,
        "hard": 60,
    }

    seconds_per_q = time_per_question.get(difficulty, 45)
    total_seconds = question_count * seconds_per_q

    return {
        "questions": question_count,
        "difficulty": difficulty,
        "estimated_seconds": total_seconds,
        "estimated_minutes": round(total_seconds / 60, 1),
        "formatted": f"{int(total_seconds // 60)} min",
    }


def get_question_stats(question_id: str, attempts: list[dict]) -> dict:
    """
    Calculate statistics for a specific question across attempts.

    Args:
        question_id: The question ID
        attempts: List of attempts with question results

    Returns:
        Dictionary with question statistics
    """
    correct_count = 0
    total_attempts = 0
    answer_distribution: dict[str, int] = {}

    for attempt in attempts:
        results = attempt.get("question_results", [])
        for result in results:
            if result.get("question_id") == question_id:
                total_attempts += 1
                if result.get("correct"):
                    correct_count += 1
                user_answer = str(result.get("user_answer", ""))
                answer_distribution[user_answer] = answer_distribution.get(user_answer, 0) + 1

    return {
        "question_id": question_id,
        "total_attempts": total_attempts,
        "correct_count": correct_count,
        "accuracy_rate": round(correct_count / total_attempts * 100, 1) if total_attempts > 0 else 0,
        "answer_distribution": answer_distribution,
    }


def generate_quiz_summary(result: QuizScoreResult) -> dict:
    """
    Generate a summary of quiz results for display.

    Args:
        result: QuizScoreResult from scoring

    Returns:
        Dictionary with summary data
    """
    correct_count = sum(1 for r in result.question_results if r.correct)
    incorrect_count = len(result.question_results) - correct_count

    # Group by question type
    by_type: dict[str, dict[str, int]] = {}
    for qr in result.question_results:
        if qr.question_type not in by_type:
            by_type[qr.question_type] = {"correct": 0, "total": 0}
        by_type[qr.question_type]["total"] += 1
        if qr.correct:
            by_type[qr.question_type]["correct"] += 1

    return {
        "score": f"{result.total_score}/{result.max_score}",
        "percentage": f"{result.percentage}%",
        "grade": result.grade,
        "passed": result.passed,
        "correct_count": correct_count,
        "incorrect_count": incorrect_count,
        "total_questions": len(result.question_results),
        "by_type": by_type,
        "feedback": result.feedback,
        "time_taken": result.time_taken_seconds,
    }
