"""Security middleware for rate limiting and request validation (T131)."""
from __future__ import annotations

import time
from collections import defaultdict
from typing import Callable, Dict, List, Optional, Tuple
from datetime import datetime, timedelta

from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

from src.core.logging import get_logger

logger = get_logger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware to prevent abuse.

    Implements a sliding window rate limiter with configurable limits
    per endpoint pattern.
    """

    def __init__(
        self,
        app,
        default_limit: int = 100,
        default_window: int = 60,
        endpoint_limits: Optional[Dict[str, Tuple[int, int]]] = None,
    ):
        """
        Initialize rate limiter.

        Args:
            app: FastAPI application
            default_limit: Default requests per window
            default_window: Default window in seconds
            endpoint_limits: Dict of endpoint pattern -> (limit, window)
        """
        super().__init__(app)
        self.default_limit = default_limit
        self.default_window = default_window
        self.endpoint_limits = endpoint_limits or {}

        # Track requests per client
        # Structure: {client_key: [(timestamp, endpoint), ...]}
        self.request_log: Dict[str, list] = defaultdict(list)

        # Specific limits for AI endpoints (more restrictive)
        self.endpoint_limits.update({
            "/api/v1/chat/ask": (20, 60),  # 20 requests per minute
            "/api/v1/chat/stream": (20, 60),
            "/api/v1/chat/highlight": (30, 60),
            "/api/v1/personalization/translate": (10, 60),
            "/api/v1/personalization/translate/stream": (10, 60),
            "/api/v1/personalization/personalize": (10, 60),
            "/api/v1/chapters/*/quiz": (10, 60),
            "/api/v1/chapters/*/flashcards": (10, 60),
            "/api/v1/auth/login": (10, 60),  # Prevent brute force
            "/api/v1/auth/register": (5, 60),  # Prevent spam accounts
        })

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with rate limiting."""
        # Get client identifier (IP or user ID if authenticated)
        client_key = self._get_client_key(request)
        endpoint = request.url.path

        # Get rate limit for this endpoint
        limit, window = self._get_limit(endpoint)

        # Clean old entries
        self._cleanup_old_entries(client_key, window)

        # Check rate limit
        if self._is_rate_limited(client_key, endpoint, limit, window):
            logger.warning(
                f"Rate limit exceeded for {client_key} on {endpoint}",
                extra={"client": client_key, "endpoint": endpoint},
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": str(window)},
            )

        # Record this request
        self.request_log[client_key].append((time.time(), endpoint))

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        remaining = limit - self._count_recent_requests(client_key, endpoint, window)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + window)

        return response

    def _get_client_key(self, request: Request) -> str:
        """Get unique identifier for the client."""
        # Try to get user ID from auth header
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            # Use hash of token as identifier (don't store actual token)
            import hashlib
            token_hash = hashlib.sha256(auth_header.encode()).hexdigest()[:16]
            return f"user:{token_hash}"

        # Fall back to IP address
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return f"ip:{forwarded.split(',')[0].strip()}"

        return f"ip:{request.client.host if request.client else 'unknown'}"

    def _get_limit(self, endpoint: str) -> Tuple[int, int]:
        """Get rate limit for an endpoint."""
        # Check exact match
        if endpoint in self.endpoint_limits:
            return self.endpoint_limits[endpoint]

        # Check pattern match (with wildcards)
        for pattern, limits in self.endpoint_limits.items():
            if self._matches_pattern(endpoint, pattern):
                return limits

        return (self.default_limit, self.default_window)

    def _matches_pattern(self, endpoint: str, pattern: str) -> bool:
        """Check if endpoint matches a pattern with wildcards."""
        pattern_parts = pattern.split("/")
        endpoint_parts = endpoint.split("/")

        if len(pattern_parts) != len(endpoint_parts):
            return False

        for p, e in zip(pattern_parts, endpoint_parts):
            if p != "*" and p != e:
                return False

        return True

    def _cleanup_old_entries(self, client_key: str, window: int) -> None:
        """Remove entries older than the window."""
        cutoff = time.time() - window
        self.request_log[client_key] = [
            (ts, ep) for ts, ep in self.request_log[client_key]
            if ts > cutoff
        ]

    def _count_recent_requests(
        self, client_key: str, endpoint: str, window: int
    ) -> int:
        """Count requests in the current window."""
        cutoff = time.time() - window
        return sum(
            1 for ts, ep in self.request_log[client_key]
            if ts > cutoff and self._same_endpoint_group(ep, endpoint)
        )

    def _same_endpoint_group(self, ep1: str, ep2: str) -> bool:
        """Check if two endpoints belong to the same rate limit group."""
        # For now, count all requests together
        # Could be made more sophisticated to have per-endpoint limits
        return True

    def _is_rate_limited(
        self, client_key: str, endpoint: str, limit: int, window: int
    ) -> bool:
        """Check if client has exceeded rate limit."""
        count = self._count_recent_requests(client_key, endpoint, window)
        return count >= limit


class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """
    Middleware for sanitizing and validating input.

    Helps prevent injection attacks and malformed input.
    """

    # Maximum content length (10MB)
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024

    # Patterns that might indicate injection attempts
    SUSPICIOUS_PATTERNS = [
        "<script",
        "javascript:",
        "data:text/html",
        "onerror=",
        "onclick=",
        "onload=",
    ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with input validation."""
        # Check content length
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.MAX_CONTENT_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Request body too large",
            )

        # Check for suspicious patterns in query params
        for key, value in request.query_params.items():
            if self._contains_suspicious_patterns(value):
                logger.warning(
                    f"Suspicious query param detected: {key}",
                    extra={"key": key, "path": request.url.path},
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected",
                )

        return await call_next(request)

    def _contains_suspicious_patterns(self, value: str) -> bool:
        """Check if value contains suspicious patterns."""
        value_lower = value.lower()
        return any(pattern in value_lower for pattern in self.SUSPICIOUS_PATTERNS)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Only add HSTS in production
        # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


def sanitize_string(value: str, max_length: int = 10000) -> str:
    """
    Sanitize a string input.

    Args:
        value: String to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized string
    """
    if not value:
        return value

    # Truncate if too long
    if len(value) > max_length:
        value = value[:max_length]

    # Remove null bytes
    value = value.replace("\x00", "")

    # Basic HTML entity encoding for special chars
    value = (
        value.replace("<", "&lt;")
        .replace(">", "&gt;")
    )

    return value


def validate_uuid(value: str) -> bool:
    """Validate UUID format."""
    import re
    uuid_pattern = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        re.IGNORECASE
    )
    return bool(uuid_pattern.match(value))


def validate_email(value: str) -> bool:
    """Validate email format."""
    import re
    # Simple email validation
    email_pattern = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
    return bool(email_pattern.match(value))
