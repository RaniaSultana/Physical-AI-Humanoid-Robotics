"""Flashcard Agent for generating flashcards from textbook content."""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from typing import Literal

from openai import AsyncOpenAI

from src.core.config import settings
from src.services.rag_service import retrieve_context


@dataclass
class FlashcardData:
    """Data structure for a generated flashcard."""

    front: str
    back: str
    difficulty: str
    source_context: str


@dataclass
class FlashcardGenerationResult:
    """Result of flashcard generation."""

    flashcards: list[FlashcardData]
    chapter_context: str
    prompt_tokens: int = 0
    completion_tokens: int = 0


FLASHCARD_SYSTEM_PROMPT = """You are an expert educational content creator for the "Physical AI & Humanoid Robotics" course. Your task is to generate flashcards that help students learn and retain key concepts.

GUIDELINES:
1. Generate flashcards ONLY from the provided textbook content
2. Focus on key concepts, definitions, and important facts
3. Keep the front (question) side concise and clear
4. Make the back (answer) side informative but not too long
5. Include a mix of:
   - Definition cards (What is X?)
   - Concept cards (Explain the relationship between X and Y)
   - Application cards (How does X work in practice?)
6. Avoid trivial or overly simple cards
7. Each card should test understanding, not just memorization

DIFFICULTY LEVELS:
- easy: Basic definitions and simple facts
- medium: Concepts requiring understanding of relationships
- hard: Complex topics requiring synthesis of multiple concepts

OUTPUT FORMAT:
Return a JSON array with this structure:
[
  {
    "front": "Question or prompt...",
    "back": "Answer or explanation...",
    "difficulty": "easy", "medium", or "hard",
    "source_context": "Brief reference to the source material..."
  }
]"""


class FlashcardAgent:
    """Agent for generating flashcards using AI."""

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

    async def generate_flashcards(
        self,
        chapter_slug: str,
        card_count: int = 10,
        difficulty: Literal["easy", "medium", "hard", "mixed"] = "mixed",
    ) -> FlashcardGenerationResult:
        """
        Generate flashcards for a chapter.

        Args:
            chapter_slug: The chapter to generate flashcards for
            card_count: Number of flashcards to generate
            difficulty: Difficulty level or "mixed" for variety

        Returns:
            FlashcardGenerationResult with generated cards
        """
        # Retrieve content from the chapter
        retrieval_result = retrieve_context(
            query=f"Key concepts, definitions, and important information from {chapter_slug}",
            context_mode="chapter",
            chapter_slug=chapter_slug,
            limit=10,
            score_threshold=0.5,
        )

        if not retrieval_result.chunks:
            return FlashcardGenerationResult(
                flashcards=[],
                chapter_context="",
            )

        # Build the generation prompt
        difficulty_instruction = (
            f"Focus on {difficulty} difficulty cards."
            if difficulty != "mixed"
            else "Include a mix of easy, medium, and hard cards."
        )

        user_prompt = f"""Based on the following textbook content, generate {card_count} flashcards.

## Content from Chapter: {chapter_slug}

{retrieval_result.context_text}

## Requirements:
- Number of flashcards: {card_count}
- {difficulty_instruction}
- Each flashcard must cover a distinct concept
- Focus on the most important and testable information

Generate the flashcards as a JSON array following the specified format."""

        # Call the AI
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": FLASHCARD_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=2500,
            response_format={"type": "json_object"},
        )

        # Parse the response
        content = response.choices[0].message.content or "{}"
        usage = response.usage

        try:
            result = json.loads(content)
            # Handle both {"flashcards": [...]} and direct array format
            cards_data = result.get("flashcards", result) if isinstance(result, dict) else result

            flashcards = []
            for card in cards_data:
                flashcards.append(
                    FlashcardData(
                        front=card.get("front", ""),
                        back=card.get("back", ""),
                        difficulty=card.get("difficulty", "medium"),
                        source_context=card.get("source_context", ""),
                    )
                )

            return FlashcardGenerationResult(
                flashcards=flashcards,
                chapter_context=retrieval_result.context_text,
                prompt_tokens=usage.prompt_tokens if usage else 0,
                completion_tokens=usage.completion_tokens if usage else 0,
            )

        except json.JSONDecodeError:
            return FlashcardGenerationResult(
                flashcards=[],
                chapter_context=retrieval_result.context_text,
            )


# Singleton instance
_flashcard_agent: FlashcardAgent | None = None


def get_flashcard_agent() -> FlashcardAgent:
    """Get the singleton Flashcard agent instance."""
    global _flashcard_agent
    if _flashcard_agent is None:
        _flashcard_agent = FlashcardAgent()
    return _flashcard_agent
