"""Gemini AI client service for chat and embeddings."""
from __future__ import annotations

from typing import AsyncIterator
import google.generativeai as genai

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)

# Configure Gemini
genai.configure(api_key=settings.gemini_api_key)


class GeminiClient:
    """Client for interacting with Google's Gemini API."""

    def __init__(self):
        self.model = genai.GenerativeModel(settings.gemini_model)
        self.chat_model_name = settings.gemini_model

    async def generate_content(
        self,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4000,
    ) -> str:
        """
        Generate content using Gemini.

        Args:
            prompt: User prompt
            system_instruction: System instruction for context
            temperature: Creativity parameter (0-1)
            max_tokens: Maximum tokens in response

        Returns:
            Generated text response
        """
        try:
            # Create model with system instruction if provided
            if system_instruction:
                model = genai.GenerativeModel(
                    self.chat_model_name,
                    system_instruction=system_instruction,
                )
            else:
                model = self.model

            # Generate response
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            )

            return response.text

        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            raise

    async def generate_content_stream(
        self,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4000,
    ) -> AsyncIterator[str]:
        """
        Stream content generation from Gemini.

        Yields chunks of generated text.
        """
        try:
            # Create model with system instruction if provided
            if system_instruction:
                model = genai.GenerativeModel(
                    self.chat_model_name,
                    system_instruction=system_instruction,
                )
            else:
                model = self.model

            # Stream response
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
                stream=True,
            )

            for chunk in response:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            logger.error(f"Gemini streaming error: {e}")
            raise

    async def chat(
        self,
        messages: list[dict],
        system_instruction: str | None = None,
        temperature: float = 0.7,
    ) -> str:
        """
        Multi-turn chat with Gemini.

        Args:
            messages: List of {"role": "user"|"model", "parts": ["text"]}
            system_instruction: System instruction
            temperature: Creativity parameter

        Returns:
            Model response text
        """
        try:
            if system_instruction:
                model = genai.GenerativeModel(
                    self.chat_model_name,
                    system_instruction=system_instruction,
                )
            else:
                model = self.model

            # Start chat session
            chat = model.start_chat(history=messages[:-1] if len(messages) > 1 else [])

            # Send latest message
            latest_message = messages[-1]["parts"][0] if messages else ""
            response = chat.send_message(
                latest_message,
                generation_config=genai.GenerationConfig(
                    temperature=temperature,
                ),
            )

            return response.text

        except Exception as e:
            logger.error(f"Gemini chat error: {e}")
            raise


def generate_embeddings_gemini(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings using Gemini's embedding model.

    Args:
        texts: List of texts to embed

    Returns:
        List of embedding vectors
    """
    try:
        embeddings = []
        for text in texts:
            result = genai.embed_content(
                model=f"models/{settings.gemini_embedding_model}",
                content=text,
                task_type="retrieval_document",
            )
            embeddings.append(result['embedding'])
        return embeddings
    except Exception as e:
        logger.error(f"Gemini embedding error: {e}")
        raise


def generate_query_embedding_gemini(query: str) -> list[float]:
    """
    Generate embedding for a search query.

    Args:
        query: Search query text

    Returns:
        Embedding vector
    """
    try:
        result = genai.embed_content(
            model=f"models/{settings.gemini_embedding_model}",
            content=query,
            task_type="retrieval_query",
        )
        return result['embedding']
    except Exception as e:
        logger.error(f"Gemini query embedding error: {e}")
        raise


# Singleton instance
_gemini_client: GeminiClient | None = None


def get_gemini_client() -> GeminiClient:
    """Get singleton Gemini client instance."""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client
