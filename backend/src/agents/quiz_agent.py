"""Quiz Agent for generating quiz questions from textbook content."""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from typing import Literal

from openai import AsyncOpenAI

from src.core.config import settings
from src.services.rag_service import retrieve_context


@dataclass
class QuizQuestionData:
    """Data structure for a generated quiz question."""

    question_type: str
    question_text: str
    options: list[dict]
    explanation: str
    difficulty: str
    source_context: str


@dataclass
class QuizGenerationResult:
    """Result of quiz generation."""

    questions: list[QuizQuestionData]
    chapter_context: str
    prompt_tokens: int = 0
    completion_tokens: int = 0


QUIZ_SYSTEM_PROMPT = """You are an expert educational content creator for the "Physical AI & Humanoid Robotics" course. Your task is to generate quiz questions that test students' understanding of the course material.

IMPORTANT GUIDELINES:
1. Generate questions ONLY based on the provided context from the textbook
2. Questions should test comprehension, not just memorization
3. For multiple choice questions:
   - Provide exactly 4 options
   - Only ONE option should be correct
   - Make incorrect options plausible but clearly wrong
   - Avoid "all of the above" or "none of the above"
4. For true/false questions:
   - Make the statement clear and unambiguous
   - Provide exactly 2 options: True and False
5. Each question must have:
   - A clear explanation of why the correct answer is right
   - Reference to the source material
6. Vary question difficulty as requested

DIFFICULTY LEVELS:
- easy: Direct recall from the text, basic concept identification
- medium: Application of concepts, understanding relationships
- hard: Analysis, synthesis, or evaluation of concepts

OUTPUT FORMAT:
Return a JSON array of questions with this structure:
[
  {
    "question_type": "mcq" or "true_false",
    "question_text": "The question...",
    "options": [
      {"id": "a", "text": "Option text", "is_correct": false},
      {"id": "b", "text": "Option text", "is_correct": true},
      ...
    ],
    "explanation": "Explanation of why the correct answer is correct...",
    "difficulty": "easy", "medium", or "hard",
    "source_context": "Brief excerpt from the source material..."
  }
]"""


class QuizAgent:
    """Agent for generating quiz questions using AI."""

    def __init__(self):
        if settings.ai_provider == "openrouter":
            self.client = AsyncOpenAI(
                api_key=settings.openrouter_api_key,
                base_url=settings.openrouter_base_url,
            )
            self.model = settings.openrouter_model
        else:
            self.client = AsyncOpenAI(api_key=settings.openai_api_key)
            self.model = settings.openai_chat_model

    async def generate_quiz(
        self,
        chapter_slug: str,
        question_count: int = 5,
        question_types: list[str] | None = None,
        difficulty: Literal["easy", "medium", "hard", "mixed"] = "mixed",
    ) -> QuizGenerationResult:
        """
        Generate quiz questions for a chapter.

        Args:
            chapter_slug: The chapter to generate questions for
            question_count: Number of questions to generate
            question_types: Types of questions to include (mcq, true_false)
            difficulty: Difficulty level or "mixed" for variety

        Returns:
            QuizGenerationResult with generated questions
        """
        # Default to both question types
        if question_types is None:
            question_types = ["mcq", "true_false"]

        # Retrieve content from the chapter
        retrieval_result = retrieve_context(
            query=f"Key concepts and important information from {chapter_slug}",
            context_mode="chapter",
            chapter_slug=chapter_slug,
            limit=10,  # Get more context for quiz generation
            score_threshold=0.5,
        )

        if not retrieval_result.chunks:
            return QuizGenerationResult(
                questions=[],
                chapter_context="",
            )

        # Build the generation prompt
        difficulty_instruction = (
            f"Generate questions at {difficulty} difficulty level."
            if difficulty != "mixed"
            else "Generate a mix of easy, medium, and hard questions."
        )

        types_str = " and ".join(question_types)
        user_prompt = f"""Based on the following textbook content, generate {question_count} quiz questions.

## Content from Chapter: {chapter_slug}

{retrieval_result.context_text}

## Requirements:
- Question types: {types_str}
- {difficulty_instruction}
- Number of questions: {question_count}
- Each question must be directly answerable from the provided content

Generate the questions as a JSON array following the specified format."""

        # Call the AI
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": QUIZ_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=3000,
            response_format={"type": "json_object"},
        )

        # Parse the response
        content = response.choices[0].message.content or "{}"
        usage = response.usage

        try:
            result = json.loads(content)
            # Handle both {"questions": [...]} and direct array format
            questions_data = result.get("questions", result) if isinstance(result, dict) else result

            questions = []
            for q in questions_data:
                # Ensure options have unique IDs
                options = q.get("options", [])
                for i, opt in enumerate(options):
                    if "id" not in opt:
                        opt["id"] = str(uuid.uuid4())[:8]

                questions.append(
                    QuizQuestionData(
                        question_type=q.get("question_type", "mcq"),
                        question_text=q.get("question_text", ""),
                        options=options,
                        explanation=q.get("explanation", ""),
                        difficulty=q.get("difficulty", "medium"),
                        source_context=q.get("source_context", ""),
                    )
                )

            return QuizGenerationResult(
                questions=questions,
                chapter_context=retrieval_result.context_text,
                prompt_tokens=usage.prompt_tokens if usage else 0,
                completion_tokens=usage.completion_tokens if usage else 0,
            )

        except json.JSONDecodeError:
            return QuizGenerationResult(
                questions=[],
                chapter_context=retrieval_result.context_text,
            )

    async def generate_explanation(
        self,
        question: str,
        correct_answer: str,
        user_answer: str,
        context: str,
    ) -> str:
        """Generate an explanation for why an answer is correct or incorrect."""
        prompt = f"""A student answered a quiz question. Provide a brief, helpful explanation.

Question: {question}
Correct Answer: {correct_answer}
Student's Answer: {user_answer}
Context: {context}

Explain why the correct answer is right and, if the student was wrong, why their answer was incorrect. Be encouraging and educational."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a helpful teaching assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        return response.choices[0].message.content or ""


# Singleton instance
_quiz_agent: QuizAgent | None = None


def get_quiz_agent() -> QuizAgent:
    """Get the singleton Quiz agent instance."""
    global _quiz_agent
    if _quiz_agent is None:
        _quiz_agent = QuizAgent()
    return _quiz_agent
