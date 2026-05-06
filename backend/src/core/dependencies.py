"""FastAPI dependencies for authentication and authorization."""
from __future__ import annotations

from typing import Annotated, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_async_session
from src.core.security import verify_token
from src.models.user import User, UserRole

# Security scheme
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> User:
    """Get current authenticated user from JWT token."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = verify_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await session.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_user_optional(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> Optional[User]:
    """Get current user if authenticated, None otherwise."""
    if credentials is None:
        return None

    user_id = verify_token(credentials.credentials)
    if user_id is None:
        return None

    result = await session.execute(select(User).where(User.id == UUID(user_id)))
    return result.scalar_one_or_none()


# Alias for backward compatibility
get_optional_user = get_current_user_optional


async def require_author_role(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Require the current user to have author role."""
    if current_user.role not in (UserRole.AUTHOR, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Author role required",
        )
    return current_user


async def require_admin_role(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Require the current user to have admin role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return current_user


def require_roles(*roles: UserRole):
    """
    Factory function to create a dependency that requires specific roles.

    Usage:
        @router.get("/protected")
        async def protected_route(
            user: Annotated[User, Depends(require_roles(UserRole.AUTHOR, UserRole.ADMIN))]
        ):
            ...
    """
    async def role_checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in roles:
            role_names = ", ".join(r.value for r in roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"One of these roles required: {role_names}",
            )
        return current_user

    return role_checker


def check_user_permission(user: User, resource_owner_id: UUID) -> bool:
    """
    Check if a user has permission to access a resource.

    Users can access their own resources. Authors and admins can access all resources.

    Args:
        user: The current user
        resource_owner_id: The UUID of the resource owner

    Returns:
        True if user has permission
    """
    # Admins and authors can access all resources
    if user.role in (UserRole.ADMIN, UserRole.AUTHOR):
        return True
    # Users can access their own resources
    return user.id == resource_owner_id


async def verify_resource_ownership(
    user: User,
    resource_owner_id: UUID,
    resource_name: str = "resource",
) -> None:
    """
    Verify that a user owns a resource or has elevated permissions.

    Raises HTTPException if user doesn't have permission.
    """
    if not check_user_permission(user, resource_owner_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have permission to access this {resource_name}",
        )


# Type aliases for dependency injection
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentUserOptional = Annotated[Optional[User], Depends(get_current_user_optional)]
AuthorUser = Annotated[User, Depends(require_author_role)]
AdminUser = Annotated[User, Depends(require_admin_role)]
