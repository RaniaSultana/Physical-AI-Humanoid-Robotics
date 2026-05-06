"""Authentication API endpoints."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.dependencies import get_current_user, get_optional_user
from src.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from src.models.user import BackgroundType, ExperienceLevel, User, UserRole

router = APIRouter(prefix="/auth", tags=["auth"])


# Request/Response Models
class RegisterRequest(BaseModel):
    """Registration request model."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str | None = Field(None, max_length=100)


class LoginRequest(BaseModel):
    """Login request model."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response model."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    """User response model."""

    id: UUID
    email: str
    display_name: str | None
    background_type: str | None
    software_experience: str | None
    hardware_experience: str | None
    learning_goals: str | None
    preferred_language: str
    role: str
    has_background: bool
    created_at: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Authentication response with user and token."""

    user: UserResponse
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class BackgroundUpdateRequest(BaseModel):
    """Background update request model."""

    background_type: BackgroundType
    background_other: str | None = None
    software_experience: ExperienceLevel | None = None
    hardware_experience: ExperienceLevel | None = None
    learning_goals: str | None = Field(None, max_length=1000)


class PasswordChangeRequest(BaseModel):
    """Password change request model."""

    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


# Helper functions
def create_user_response(user: User) -> UserResponse:
    """Create a user response from a user model."""
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        background_type=user.background_type.value if user.background_type else None,
        software_experience=user.software_experience.value if user.software_experience else None,
        hardware_experience=user.hardware_experience.value if user.hardware_experience else None,
        learning_goals=user.learning_goals,
        preferred_language=user.preferred_language,
        role=user.role.value,
        has_background=user.has_background,
        created_at=user.created_at.isoformat(),
    )


def create_auth_response(user: User, token: str) -> AuthResponse:
    """Create an auth response with user and token."""
    return AuthResponse(
        user=create_user_response(user),
        access_token=token,
        expires_in=settings.jwt_expiration_hours * 3600,
    )


# Endpoints
@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """Register a new user account."""
    # Check if email already exists
    existing_user = await db.execute(
        select(User).where(User.email == request.email)
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        display_name=request.display_name,
        role=UserRole.STUDENT,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create token
    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(hours=settings.jwt_expiration_hours),
    )

    return create_auth_response(user, token)


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """Log in with email and password."""
    # Find user
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    # Create token
    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(hours=settings.jwt_expiration_hours),
    )

    return create_auth_response(user, token)


@router.post("/login/form", response_model=TokenResponse)
async def login_form(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """OAuth2 compatible login endpoint for form data."""
    # Find user
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    # Create token
    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(hours=settings.jwt_expiration_hours),
    )

    return TokenResponse(
        access_token=token,
        expires_in=settings.jwt_expiration_hours * 3600,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    current_user: User = Depends(get_current_user),
) -> None:
    """Log out the current user.

    Note: With JWT tokens, logout is primarily handled client-side by
    discarding the token. This endpoint exists for API consistency
    and future token blacklisting if needed.
    """
    # In a production system, you might want to blacklist the token
    # For now, logout is handled client-side
    pass


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Get the current authenticated user's information."""
    return create_user_response(current_user)


@router.put("/me/background", response_model=UserResponse)
async def update_background(
    request: BackgroundUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update the current user's educational background."""
    current_user.background_type = request.background_type
    current_user.background_other = request.background_other
    current_user.software_experience = request.software_experience
    current_user.hardware_experience = request.hardware_experience
    current_user.learning_goals = request.learning_goals

    await db.commit()
    await db.refresh(current_user)

    return create_user_response(current_user)


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Change the current user's password."""
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(request.new_password)
    await db.commit()


@router.put("/me/language", response_model=UserResponse)
async def update_language(
    language: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update the current user's preferred language."""
    if language not in ["en", "ur"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid language. Supported: en, ur",
        )

    current_user.preferred_language = language
    await db.commit()
    await db.refresh(current_user)

    return create_user_response(current_user)


# OAuth endpoints
import secrets
import httpx
from fastapi.responses import RedirectResponse

# Store state tokens temporarily (in production, use Redis or database)
_oauth_states: dict[str, str] = {}


def _generate_state() -> str:
    """Generate a random state token for OAuth CSRF protection."""
    return secrets.token_urlsafe(32)


@router.get("/oauth/{provider}")
async def oauth_redirect(provider: str) -> RedirectResponse:
    """Redirect to OAuth provider for authentication."""
    supported_providers = ["google", "github"]
    if provider not in supported_providers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider. Supported: {', '.join(supported_providers)}",
        )

    state = _generate_state()
    _oauth_states[state] = provider

    if provider == "google":
        if not settings.google_client_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth not configured",
            )
        auth_url = (
            "https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={settings.google_client_id}&"
            f"redirect_uri={settings.google_redirect_uri}&"
            "response_type=code&"
            "scope=openid%20email%20profile&"
            f"state={state}&"
            "access_type=offline"
        )
        return RedirectResponse(url=auth_url)

    elif provider == "github":
        if not settings.github_client_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GitHub OAuth not configured",
            )
        auth_url = (
            "https://github.com/login/oauth/authorize?"
            f"client_id={settings.github_client_id}&"
            f"redirect_uri={settings.github_redirect_uri}&"
            "scope=user:email&"
            f"state={state}"
        )
        return RedirectResponse(url=auth_url)

    raise HTTPException(status_code=400, detail="Invalid provider")


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Handle OAuth callback from provider."""
    frontend_url = settings.frontend_url

    # Handle OAuth errors
    if error:
        return RedirectResponse(
            url=f"{frontend_url}/auth/login?error={error}"
        )

    if not code:
        return RedirectResponse(
            url=f"{frontend_url}/auth/login?error=Missing%20authorization%20code"
        )

    # Verify state (CSRF protection)
    if not state or state not in _oauth_states:
        return RedirectResponse(
            url=f"{frontend_url}/auth/login?error=Invalid%20state%20token"
        )
    del _oauth_states[state]

    try:
        if provider == "google":
            user_info = await _handle_google_callback(code)
        elif provider == "github":
            user_info = await _handle_github_callback(code)
        else:
            return RedirectResponse(
                url=f"{frontend_url}/auth/login?error=Unsupported%20provider"
            )

        # Find or create user
        email = user_info["email"]
        name = user_info.get("name")
        provider_id = user_info["id"]

        # Check if user exists by email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            # Create new user
            user = User(
                email=email,
                display_name=name,
                password_hash="",  # OAuth users don't have password
                role=UserRole.STUDENT,
            )
            # Set provider ID
            if provider == "google":
                user.google_id = str(provider_id)
            elif provider == "github":
                user.github_id = str(provider_id)

            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            # Update provider ID if not set
            if provider == "google" and not user.google_id:
                user.google_id = str(provider_id)
                await db.commit()
            elif provider == "github" and not user.github_id:
                user.github_id = str(provider_id)
                await db.commit()

        # Update last login
        user.last_login_at = datetime.now(timezone.utc)
        await db.commit()

        # Create JWT token
        token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(hours=settings.jwt_expiration_hours),
        )

        # Redirect to frontend with token
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?token={token}"
        )

    except Exception as e:
        error_msg = str(e).replace(" ", "%20")
        return RedirectResponse(
            url=f"{frontend_url}/auth/login?error={error_msg}"
        )


async def _handle_google_callback(code: str) -> dict:
    """Exchange Google auth code for user info."""
    async with httpx.AsyncClient() as client:
        # Exchange code for token
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )

        if token_response.status_code != 200:
            raise Exception("Failed to get Google access token")

        token_data = token_response.json()
        access_token = token_data["access_token"]

        # Get user info
        user_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if user_response.status_code != 200:
            raise Exception("Failed to get Google user info")

        user_data = user_response.json()
        return {
            "id": user_data["id"],
            "email": user_data["email"],
            "name": user_data.get("name"),
        }


async def _handle_github_callback(code: str) -> dict:
    """Exchange GitHub auth code for user info."""
    async with httpx.AsyncClient() as client:
        # Exchange code for token
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "code": code,
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "redirect_uri": settings.github_redirect_uri,
            },
            headers={"Accept": "application/json"},
        )

        if token_response.status_code != 200:
            raise Exception("Failed to get GitHub access token")

        token_data = token_response.json()
        if "error" in token_data:
            raise Exception(token_data.get("error_description", "GitHub auth failed"))

        access_token = token_data["access_token"]

        # Get user info
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )

        if user_response.status_code != 200:
            raise Exception("Failed to get GitHub user info")

        user_data = user_response.json()

        # Get user email (may need separate call if email is private)
        email = user_data.get("email")
        if not email:
            email_response = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json",
                },
            )
            if email_response.status_code == 200:
                emails = email_response.json()
                primary_email = next(
                    (e["email"] for e in emails if e.get("primary")),
                    emails[0]["email"] if emails else None,
                )
                email = primary_email

        if not email:
            raise Exception("Could not get email from GitHub")

        return {
            "id": user_data["id"],
            "email": email,
            "name": user_data.get("name") or user_data.get("login"),
        }
