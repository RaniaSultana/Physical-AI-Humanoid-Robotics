"""Highlight Agent for contextual explanations of selected text."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import AsyncIterator, Literal

from openai import AsyncOpenAI

from src.core.config import settings
from src.services.rag_service import (
    RetrievedChunk,
    extract_citations,
    retrieve_for_highlight,
)


class HighlightAction(str, Enum):
    """Available quick actions for highlighted text."""

    EXPLAIN = "explain"
    EXAMPLE = "example"
    SIMPLIFY = "simplify"
    GO_DEEPER = "go_deeper"
    DEFINE = "define"
    COMPARE = "compare"


@dataclass
class HighlightResponse:
    """Response from the Highlight agent."""

    explanation: str
    action: HighlightAction
    citations: list[dict]
    prompt_tokens: int = 0
    completion_tokens: int = 0
    chunks_used: list[RetrievedChunk] = field(default_factory=list)


# Action-specific system prompts
ACTION_PROMPTS = {
    HighlightAction.EXPLAIN: """You are an AI teaching assistant. The student has highlighted some text and wants a clear explanation.

GUIDELINES:
1. Provide a clear, educational explanation of the highlighted concept
2. Use the surrounding context from the textbook to inform your explanation
3. Break down complex ideas into simpler parts
4. Use analogies when helpful
5. Keep the explanation concise but complete (2-3 paragraphs max)
6. Use markdown formatting for clarity

If the highlighted text is a single term, define it first, then explain its significance in context.""",

    HighlightAction.EXAMPLE: """You are an AI teaching assistant. The student has highlighted some text and wants practical examples.

GUIDELINES:
1. Provide 2-3 concrete, practical examples that illustrate the highlighted concept
2. Make examples relevant to robotics and AI when possible
3. Start with a simple example and progress to more complex ones
4. Include code snippets if the concept is related to programming
5. Use markdown formatting for clarity

Examples should help students understand how to apply the concept in practice.""",

    HighlightAction.SIMPLIFY: """You are an AI teaching assistant. The student has highlighted some text and wants a simpler explanation.

GUIDELINES:
1. Explain the highlighted concept using simpler language and shorter sentences
2. Avoid technical jargon - if you must use it, define it immediately
3. Use everyday analogies to explain complex ideas
4. Target the explanation at someone with no prior background
5. Keep it brief - aim for 1-2 short paragraphs
6. Use bullet points if it helps clarity

Think of explaining this to a curious friend who has never studied this topic.""",

    HighlightAction.GO_DEEPER: """You are an AI teaching assistant. The student has highlighted some text and wants to learn more deeply about it.

GUIDELINES:
1. Provide advanced details and nuances about the highlighted concept
2. Explain underlying principles and theory
3. Discuss edge cases, limitations, or common misconceptions
4. Reference related advanced topics for further study
5. Include mathematical formulations or technical details if relevant
6. Suggest what to explore next

This response should satisfy a curious student who wants to go beyond the basics.""",

    HighlightAction.DEFINE: """You are an AI teaching assistant. The student has highlighted a term and wants a definition.

GUIDELINES:
1. Provide a clear, concise definition (1-2 sentences)
2. Include pronunciation or etymology if relevant
3. Give a brief example of usage
4. Mention any related terms
5. Keep the entire response under 100 words

Format: Start with the definition, then add context.""",

    HighlightAction.COMPARE: """You are an AI teaching assistant. The student has highlighted a concept and wants to understand how it compares to related concepts.

GUIDELINES:
1. Identify 2-3 related concepts to compare with
2. Create a clear comparison table or list of differences
3. Explain when to use each concept
4. Highlight key similarities and differences
5. Use concrete examples to illustrate distinctions

Focus on concepts that are commonly confused or compared in the robotics/AI domain.""",
}


class HighlightAgent:
    """Agent for handling highlight-and-ask interactions."""

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

    async def process_highlight(
        self,
        selected_text: str,
        action: HighlightAction,
        chapter_slug: str,
        surrounding_context: str | None = None,
        user_background: str | None = None,
    ) -> HighlightResponse:
        """
        Process highlighted text with a specific action.

        Args:
            selected_text: The text highlighted by the user
            action: The type of explanation requested
            chapter_slug: The chapter where the text was highlighted
            surrounding_context: Additional context around the selection
            user_background: User's educational background for personalization

        Returns:
            HighlightResponse with explanation and citations
        """
        # Retrieve relevant context from the textbook
        retrieval_result = retrieve_for_highlight(
            selected_text=selected_text,
            question=f"{action.value} this concept",
            chapter_slug=chapter_slug,
        )

        # Build messages for the LLM
        messages = self._build_messages(
            selected_text=selected_text,
            action=action,
            context_text=retrieval_result.context_text,
            surrounding_context=surrounding_context,
            user_background=user_background,
        )

        # Call OpenAI
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=1000,
        )

        explanation = response.choices[0].message.content or ""
        usage = response.usage

        return HighlightResponse(
            explanation=explanation,
            action=action,
            citations=extract_citations(retrieval_result.chunks),
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            chunks_used=retrieval_result.chunks,
        )

    async def process_highlight_stream(
        self,
        selected_text: str,
        action: HighlightAction,
        chapter_slug: str,
        surrounding_context: str | None = None,
        user_background: str | None = None,
    ) -> AsyncIterator[str]:
        """
        Stream the response for highlighted text processing.

        Yields chunks of the explanation as they are generated.
        """
        # Retrieve relevant context from the textbook
        retrieval_result = retrieve_for_highlight(
            selected_text=selected_text,
            question=f"{action.value} this concept",
            chapter_slug=chapter_slug,
        )

        # Build messages for the LLM
        messages = self._build_messages(
            selected_text=selected_text,
            action=action,
            context_text=retrieval_result.context_text,
            surrounding_context=surrounding_context,
            user_background=user_background,
        )

        # Stream from OpenAI
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=1000,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def ask_followup(
        self,
        selected_text: str,
        original_explanation: str,
        followup_question: str,
        chapter_slug: str,
        user_background: str | None = None,
    ) -> HighlightResponse:
        """
        Handle a follow-up question about highlighted text.

        Args:
            selected_text: The originally highlighted text
            original_explanation: The previous AI explanation
            followup_question: The user's follow-up question
            chapter_slug: The chapter where the text was highlighted
            user_background: User's educational background

        Returns:
            HighlightResponse with the follow-up answer
        """
        # Retrieve additional context based on the follow-up question
        retrieval_result = retrieve_for_highlight(
            selected_text=selected_text,
            question=followup_question,
            chapter_slug=chapter_slug,
        )

        messages = [
            {
                "role": "system",
                "content": """You are an AI teaching assistant helping a student understand a concept from their textbook.
The student has already received an explanation and now has a follow-up question.

GUIDELINES:
1. Build on the previous explanation without repeating it unnecessarily
2. Answer the specific follow-up question directly
3. Use the additional context from the textbook if relevant
4. Keep the response focused and concise
5. If the question goes beyond the textbook content, acknowledge this clearly""",
            },
            {
                "role": "user",
                "content": f"""## Highlighted Text
{selected_text}

## Previous Explanation
{original_explanation}

## Additional Context from Textbook
{retrieval_result.context_text}

## Follow-up Question
{followup_question}

Please answer the follow-up question, building on the previous explanation.""",
            },
        ]

        if user_background:
            messages[0]["content"] += f"\n\nStudent background: {user_background}"

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=800,
        )

        explanation = response.choices[0].message.content or ""
        usage = response.usage

        return HighlightResponse(
            explanation=explanation,
            action=HighlightAction.EXPLAIN,  # Follow-ups are general explanations
            citations=extract_citations(retrieval_result.chunks),
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            chunks_used=retrieval_result.chunks,
        )

    async def ask_followup_stream(
        self,
        selected_text: str,
        original_explanation: str,
        followup_question: str,
        chapter_slug: str,
        user_background: str | None = None,
    ) -> AsyncIterator[str]:
        """Stream a follow-up question response."""
        retrieval_result = retrieve_for_highlight(
            selected_text=selected_text,
            question=followup_question,
            chapter_slug=chapter_slug,
        )

        messages = [
            {
                "role": "system",
                "content": """You are an AI teaching assistant helping a student understand a concept from their textbook.
The student has already received an explanation and now has a follow-up question.

GUIDELINES:
1. Build on the previous explanation without repeating it unnecessarily
2. Answer the specific follow-up question directly
3. Use the additional context from the textbook if relevant
4. Keep the response focused and concise
5. If the question goes beyond the textbook content, acknowledge this clearly""",
            },
            {
                "role": "user",
                "content": f"""## Highlighted Text
{selected_text}

## Previous Explanation
{original_explanation}

## Additional Context from Textbook
{retrieval_result.context_text}

## Follow-up Question
{followup_question}

Please answer the follow-up question, building on the previous explanation.""",
            },
        ]

        if user_background:
            messages[0]["content"] += f"\n\nStudent background: {user_background}"

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=800,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def _build_messages(
        self,
        selected_text: str,
        action: HighlightAction,
        context_text: str,
        surrounding_context: str | None = None,
        user_background: str | None = None,
    ) -> list[dict]:
        """Build the messages list for the LLM."""
        system_prompt = ACTION_PROMPTS[action]

        if user_background:
            system_prompt += f"\n\nStudent background: {user_background}"

        messages = [{"role": "system", "content": system_prompt}]

        user_content = f"""## Highlighted Text (what the student selected)
{selected_text}
"""

        if surrounding_context:
            user_content += f"""
## Surrounding Context (from the same section)
{surrounding_context}
"""

        user_content += f"""
## Related Content from Textbook
{context_text}

Please provide your response for the "{action.value}" action on the highlighted text."""

        messages.append({"role": "user", "content": user_content})

        return messages


# Singleton instance
_highlight_agent: HighlightAgent | None = None


def get_highlight_agent() -> HighlightAgent:
    """Get the singleton Highlight agent instance."""
    global _highlight_agent
    if _highlight_agent is None:
        _highlight_agent = HighlightAgent()
    return _highlight_agent
