"""Embedding service supporting multiple providers (OpenRouter, OpenAI, Gemini)."""
from __future__ import annotations

from functools import lru_cache
from typing import Optional
import hashlib
import numpy as np

from src.core.config import settings


# Simple in-memory cache for embeddings
_embedding_cache: dict[str, list[float]] = {}


def _get_cache_key(text: str, model: str) -> str:
    """Generate cache key for embedding."""
    return hashlib.md5(f"{model}:{text}".encode()).hexdigest()


@lru_cache
def get_embedding_client():
    """Get the embedding client based on provider."""
    if settings.ai_provider == "openrouter":
        from openai import OpenAI
        # OpenRouter supports embeddings via OpenAI-compatible API
        return OpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
        )
    elif settings.ai_provider == "openai":
        from openai import OpenAI
        return OpenAI(api_key=settings.openai_api_key)
    else:
        # Gemini - use Google's generative AI for embeddings
        return None


def generate_embedding(text: str, use_cache: bool = True) -> list[float]:
    """
    Generate embedding for a single text.

    For providers without native embedding support, uses a simple
    hashing-based pseudo-embedding for development/testing.
    """
    model = settings.openai_embedding_model if settings.ai_provider in ["openai", "openrouter"] else "gemini"
    cache_key = _get_cache_key(text, model)

    if use_cache and cache_key in _embedding_cache:
        return _embedding_cache[cache_key]

    try:
        if settings.ai_provider in ["openai", "openrouter"]:
            client = get_embedding_client()
            # Use OpenAI embedding model via OpenRouter or direct OpenAI
            response = client.embeddings.create(
                model="text-embedding-3-small",  # OpenRouter supports this
                input=text,
            )
            embedding = response.data[0].embedding
        elif settings.ai_provider == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
            )
            embedding = result['embedding']
        else:
            # Fallback: generate pseudo-embedding for development
            embedding = _generate_pseudo_embedding(text)
    except Exception as e:
        # Fallback to pseudo-embedding on API errors
        print(f"Embedding API error: {e}, using pseudo-embedding")
        embedding = _generate_pseudo_embedding(text)

    if use_cache:
        _embedding_cache[cache_key] = embedding

    return embedding


def _generate_pseudo_embedding(text: str, dim: int = 1536) -> list[float]:
    """
    Generate a deterministic pseudo-embedding based on text hash.
    This is for development/testing when API is unavailable.
    """
    # Create a deterministic seed from text
    seed = int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)
    np.random.seed(seed)

    # Generate normalized random vector
    embedding = np.random.randn(dim).astype(np.float32)
    embedding = embedding / np.linalg.norm(embedding)

    return embedding.tolist()


def generate_embeddings(texts: list[str], use_cache: bool = True) -> list[list[float]]:
    """Generate embeddings for multiple texts in batch."""
    if not texts:
        return []

    # Check cache for all texts
    results = []
    uncached_texts = []
    uncached_indices = []

    model = settings.openai_embedding_model if settings.ai_provider in ["openai", "openrouter"] else "gemini"

    for i, text in enumerate(texts):
        cache_key = _get_cache_key(text, model)
        if use_cache and cache_key in _embedding_cache:
            results.append((i, _embedding_cache[cache_key]))
        else:
            uncached_texts.append(text)
            uncached_indices.append(i)

    # Generate embeddings for uncached texts
    if uncached_texts:
        try:
            if settings.ai_provider in ["openai", "openrouter"]:
                client = get_embedding_client()
                response = client.embeddings.create(
                    model="text-embedding-3-small",
                    input=uncached_texts,
                )
                sorted_data = sorted(response.data, key=lambda x: x.index)
                new_embeddings = [item.embedding for item in sorted_data]
            elif settings.ai_provider == "gemini":
                import google.generativeai as genai
                genai.configure(api_key=settings.gemini_api_key)
                new_embeddings = []
                for text in uncached_texts:
                    result = genai.embed_content(
                        model="models/text-embedding-004",
                        content=text,
                    )
                    new_embeddings.append(result['embedding'])
            else:
                new_embeddings = [_generate_pseudo_embedding(t) for t in uncached_texts]
        except Exception as e:
            print(f"Batch embedding API error: {e}, using pseudo-embeddings")
            new_embeddings = [_generate_pseudo_embedding(t) for t in uncached_texts]

        # Cache and add to results
        for idx, text, embedding in zip(uncached_indices, uncached_texts, new_embeddings):
            cache_key = _get_cache_key(text, model)
            if use_cache:
                _embedding_cache[cache_key] = embedding
            results.append((idx, embedding))

    # Sort by original index
    results.sort(key=lambda x: x[0])
    return [emb for _, emb in results]


def chunk_text(
    text: str,
    chunk_size: int = 500,
    overlap: int = 50,
) -> list[str]:
    """Split text into overlapping chunks for embedding."""
    # Simple word-based chunking
    words = text.split()
    chunks = []

    i = 0
    while i < len(words):
        chunk_words = words[i : i + chunk_size]
        chunks.append(" ".join(chunk_words))
        i += chunk_size - overlap

    return chunks


def estimate_tokens(text: str) -> int:
    """Rough estimate of token count (4 chars per token approximation)."""
    return len(text) // 4


def clear_embedding_cache() -> None:
    """Clear the embedding cache."""
    global _embedding_cache
    _embedding_cache = {}
