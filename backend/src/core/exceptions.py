"""Global exception handling for the FastAPI application."""
from __future__ import annotations

import logging
import traceback
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class ErrorResponse(BaseModel):
    """Standard error response format."""

    error: str
    message: str
    detail: Any | None = None
    request_id: str
    path: str


class AppException(Exception):
    """Base exception for application-specific errors."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "INTERNAL_ERROR",
        detail: Any = None,
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.detail = detail
        super().__init__(message)


class NotFoundError(AppException):
    """Resource not found error."""

    def __init__(self, resource: str, identifier: Any = None):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} with id '{identifier}' not found"
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            detail={"resource": resource, "identifier": str(identifier) if identifier else None},
        )


class UnauthorizedError(AppException):
    """Authentication required error."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED",
        )


class ForbiddenError(AppException):
    """Permission denied error."""

    def __init__(self, message: str = "Permission denied"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN",
        )


class ValidationError(AppException):
    """Input validation error."""

    def __init__(self, message: str, errors: list[dict] | None = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            detail={"errors": errors} if errors else None,
        )


class ConflictError(AppException):
    """Resource conflict error (e.g., duplicate)."""

    def __init__(self, message: str, resource: str | None = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
            detail={"resource": resource} if resource else None,
        )


class RateLimitError(AppException):
    """Rate limit exceeded error."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int | None = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
            detail={"retry_after": retry_after} if retry_after else None,
        )


class ServiceUnavailableError(AppException):
    """External service unavailable error."""

    def __init__(self, service: str, message: str | None = None):
        super().__init__(
            message=message or f"{service} is currently unavailable",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="SERVICE_UNAVAILABLE",
            detail={"service": service},
        )


class AIServiceError(AppException):
    """AI service (OpenAI, etc.) error."""

    def __init__(self, message: str, provider: str = "OpenAI"):
        super().__init__(
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="AI_SERVICE_ERROR",
            detail={"provider": provider},
        )


class DatabaseError(AppException):
    """Database operation error."""

    def __init__(self, message: str = "Database operation failed"):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="DATABASE_ERROR",
        )


def create_error_response(
    request: Request,
    error_code: str,
    message: str,
    detail: Any = None,
) -> ErrorResponse:
    """Create a standardized error response."""
    # Generate or get request ID
    request_id = getattr(request.state, "request_id", str(uuid4()))

    return ErrorResponse(
        error=error_code,
        message=message,
        detail=detail,
        request_id=request_id,
        path=str(request.url.path),
    )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application-specific exceptions."""
    logger.warning(
        f"AppException: {exc.error_code} - {exc.message}",
        extra={
            "request_id": getattr(request.state, "request_id", None),
            "path": str(request.url.path),
            "error_code": exc.error_code,
        },
    )

    response = create_error_response(
        request=request,
        error_code=exc.error_code,
        message=exc.message,
        detail=exc.detail,
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=response.model_dump(),
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Handle HTTP exceptions."""
    logger.warning(
        f"HTTPException: {exc.status_code} - {exc.detail}",
        extra={
            "request_id": getattr(request.state, "request_id", None),
            "path": str(request.url.path),
        },
    )

    error_code = "HTTP_ERROR"
    if exc.status_code == 404:
        error_code = "NOT_FOUND"
    elif exc.status_code == 401:
        error_code = "UNAUTHORIZED"
    elif exc.status_code == 403:
        error_code = "FORBIDDEN"
    elif exc.status_code == 405:
        error_code = "METHOD_NOT_ALLOWED"

    response = create_error_response(
        request=request,
        error_code=error_code,
        message=str(exc.detail),
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=response.model_dump(),
        headers=getattr(exc, "headers", None),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle request validation errors."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })

    logger.warning(
        f"Validation error: {len(errors)} errors",
        extra={
            "request_id": getattr(request.state, "request_id", None),
            "path": str(request.url.path),
            "errors": errors,
        },
    )

    response = create_error_response(
        request=request,
        error_code="VALIDATION_ERROR",
        message="Request validation failed",
        detail={"errors": errors},
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=response.model_dump(),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unhandled exceptions."""
    # Log the full traceback for debugging
    logger.error(
        f"Unhandled exception: {type(exc).__name__} - {str(exc)}",
        extra={
            "request_id": getattr(request.state, "request_id", None),
            "path": str(request.url.path),
            "traceback": traceback.format_exc(),
        },
        exc_info=True,
    )

    response = create_error_response(
        request=request,
        error_code="INTERNAL_ERROR",
        message="An unexpected error occurred",
        # Don't expose internal error details in production
        detail=None,
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response.model_dump(),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers with the FastAPI application."""
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
