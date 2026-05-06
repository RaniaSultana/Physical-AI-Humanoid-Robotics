"""Q&A Agent for answering questions about the textbook content."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import AsyncIterator, Literal

from src.core.config import settings
from src.services.rag_service import (
    RetrievedChunk,
    extract_citations,
    retrieve_context,
    retrieve_for_highlight,
)


@dataclass
class QAResponse:
    """Response from the Q&A agent."""

    answer: str
    citations: list[dict]
    context_mode: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    chunks_used: list[RetrievedChunk] = field(default_factory=list)


SYSTEM_PROMPT = """You are an AI teaching assistant for the "Physical AI & Humanoid Robotics" course textbook. Your role is to help students understand the course material by answering their questions accurately and helpfully.

IMPORTANT GUIDELINES:
1. ONLY answer questions based on the provided context from the textbook
2. If the context doesn't contain enough information to answer the question, say so clearly
3. When referencing information, indicate which source you're using (e.g., "According to Source 1...")
4. Provide clear, educational explanations suitable for students learning robotics
5. If a concept is complex, break it down into simpler parts
6. Use examples when helpful to illustrate concepts
7. Be encouraging and supportive in your tone

FORMATTING:
- Use markdown for formatting when helpful (headers, lists, code blocks)
- Keep answers concise but complete
- For code examples, use appropriate syntax highlighting

If the question is completely unrelated to the course material or cannot be answered from the context, politely redirect the student to ask about topics covered in the textbook."""


class QAAgent:
    """Agent for handling Q&A interactions with RAG support."""

    def __init__(self):
        self.ai_provider = settings.ai_provider
        if self.ai_provider == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            self.gemini_model = genai.GenerativeModel(
                settings.gemini_model,
                system_instruction=SYSTEM_PROMPT,
            )
        elif self.ai_provider == "openrouter":
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(
                api_key=settings.openrouter_api_key,
                base_url=settings.openrouter_base_url,
            )
            self.model = settings.openrouter_model
        else:
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(api_key=settings.openai_api_key)
            self.model = settings.openai_chat_model

    async def ask(
        self,
        question: str,
        context_mode: Literal["chapter", "course", "selection"] = "course",
        chapter_slug: str | None = None,
        selected_text: str | None = None,
        conversation_history: list[dict] | None = None,
    ) -> QAResponse:
        """
        Answer a question using RAG retrieval.

        Args:
            question: The user's question
            context_mode: Scope of context retrieval
            chapter_slug: Current chapter (for chapter/selection mode)
            selected_text: Text selected by user (for selection mode)
            conversation_history: Previous messages for context

        Returns:
            QAResponse with answer and citations
        """
        # Retrieve relevant context
        if context_mode == "selection" and selected_text and chapter_slug:
            retrieval_result = retrieve_for_highlight(
                selected_text=selected_text,
                question=question,
                chapter_slug=chapter_slug,
            )
        else:
            retrieval_result = retrieve_context(
                query=question,
                context_mode=context_mode,
                chapter_slug=chapter_slug,
            )

        # Build prompt
        prompt = self._build_prompt(
            question=question,
            context_text=retrieval_result.context_text,
            selected_text=selected_text,
        )

        if self.ai_provider == "gemini":
            # Call Gemini
            response = self.gemini_model.generate_content(prompt)
            answer = response.text
            return QAResponse(
                answer=answer,
                citations=extract_citations(retrieval_result.chunks),
                context_mode=context_mode,
                prompt_tokens=0,
                completion_tokens=0,
                chunks_used=retrieval_result.chunks,
            )
        else:
            # Call OpenAI
            messages = self._build_messages(
                question=question,
                context_text=retrieval_result.context_text,
                selected_text=selected_text,
                conversation_history=conversation_history,
            )
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1500,
            )

            answer = response.choices[0].message.content or ""
            usage = response.usage

            return QAResponse(
                answer=answer,
                citations=extract_citations(retrieval_result.chunks),
                context_mode=context_mode,
                prompt_tokens=usage.prompt_tokens if usage else 0,
                completion_tokens=usage.completion_tokens if usage else 0,
                chunks_used=retrieval_result.chunks,
            )

    async def ask_stream(
        self,
        question: str,
        context_mode: Literal["chapter", "course", "selection"] = "course",
        chapter_slug: str | None = None,
        selected_text: str | None = None,
        conversation_history: list[dict] | None = None,
    ) -> AsyncIterator[str]:
        """
        Stream answer to a question using RAG retrieval.

        Yields chunks of the answer as they are generated.
        """
        # Retrieve relevant context
        if context_mode == "selection" and selected_text and chapter_slug:
            retrieval_result = retrieve_for_highlight(
                selected_text=selected_text,
                question=question,
                chapter_slug=chapter_slug,
            )
        else:
            retrieval_result = retrieve_context(
                query=question,
                context_mode=context_mode,
                chapter_slug=chapter_slug,
            )

        # Build prompt
        prompt = self._build_prompt(
            question=question,
            context_text=retrieval_result.context_text,
            selected_text=selected_text,
        )

        if self.ai_provider == "gemini":
            # Stream from Gemini
            response = self.gemini_model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        else:
            # Stream from OpenAI
            messages = self._build_messages(
                question=question,
                context_text=retrieval_result.context_text,
                selected_text=selected_text,
                conversation_history=conversation_history,
            )
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1500,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

    def _build_prompt(
        self,
        question: str,
        context_text: str,
        selected_text: str | None = None,
    ) -> str:
        """Build the prompt for Gemini."""
        prompt = f"""## Context from the Textbook
{context_text}
"""
        if selected_text:
            prompt += f"""
## Selected Text (highlighted by student)
{selected_text}
"""
        prompt += f"""
## Student's Question
{question}

Please provide a helpful answer based on the textbook content above."""
        return prompt

    def _build_messages(
        self,
        question: str,
        context_text: str,
        selected_text: str | None = None,
        conversation_history: list[dict] | None = None,
    ) -> list[dict]:
        """Build the messages list for the LLM."""
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add conversation history if provided
        if conversation_history:
            # Limit history to last 10 messages to avoid token limits
            for msg in conversation_history[-10:]:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"],
                })

        # Build the user message with context
        user_content = f"""## Context from the Textbook
{context_text}
"""

        if selected_text:
            user_content += f"""
## Selected Text (highlighted by student)
{selected_text}
"""

        user_content += f"""
## Student's Question
{question}

Please provide a helpful answer based on the textbook content above."""

        messages.append({"role": "user", "content": user_content})

        return messages

    async def get_retrieval_result(
        self,
        question: str,
        context_mode: Literal["chapter", "course", "selection"] = "course",
        chapter_slug: str | None = None,
        selected_text: str | None = None,
    ):
        """Get just the retrieval result without LLM call (for debugging/transparency)."""
        if context_mode == "selection" and selected_text and chapter_slug:
            return retrieve_for_highlight(
                selected_text=selected_text,
                question=question,
                chapter_slug=chapter_slug,
            )
        return retrieve_context(
            query=question,
            context_mode=context_mode,
            chapter_slug=chapter_slug,
        )


# Singleton instance
_qa_agent: QAAgent | None = None


def get_qa_agent() -> QAAgent:
    """Get the singleton Q&A agent instance."""
    global _qa_agent
    if _qa_agent is None:
        _qa_agent = QAAgent()
    return _qa_agent
