"""Chat API endpoints for AI Q&A functionality."""
from __future__ import annotations

import json
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.agents.qa_agent import get_qa_agent
from src.core.database import get_db, async_session_maker
from src.core.dependencies import get_current_user, get_optional_user
from src.models.conversation import (
    Citation,
    ContextMode,
    Conversation,
    Message,
    MessageRole,
)
from src.models.user import User

router = APIRouter(prefix="/chat", tags=["chat"])


# Request/Response models
class AskRequest(BaseModel):
    """Request model for asking a question."""

    question: str = Field(..., min_length=1, max_length=2000)
    context_mode: Literal["chapter", "course", "selection"] = "course"
    chapter_slug: str | None = None
    selected_text: str | None = Field(None, max_length=5000)
    conversation_id: UUID | None = None


class CitationResponse(BaseModel):
    """Citation in a response."""

    chapter_slug: str
    section_title: str
    content_preview: str
    relevance_score: float


class AskResponse(BaseModel):
    """Response model for a Q&A answer."""

    answer: str
    citations: list[CitationResponse]
    conversation_id: UUID
    message_id: UUID


class ConversationSummary(BaseModel):
    """Summary of a conversation for listing."""

    id: UUID
    title: str
    chapter_id: UUID | None
    message_count: int
    created_at: str
    updated_at: str


class MessageResponse(BaseModel):
    """A message in a conversation."""

    id: UUID
    role: str
    content: str
    citations: list[CitationResponse]
    created_at: str


class ConversationDetail(BaseModel):
    """Detailed conversation with messages."""

    id: UUID
    title: str
    chapter_id: UUID | None
    messages: list[MessageResponse]
    created_at: str


class ConversationListResponse(BaseModel):
    """List of user's conversations."""

    conversations: list[ConversationSummary]
    total: int


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation."""

    title: str = Field(default="New Conversation", max_length=200)
    chapter_id: UUID | None = None


class UpdateConversationRequest(BaseModel):
    """Request to update a conversation."""

    title: str | None = Field(None, max_length=200)
    is_active: bool | None = None


# Endpoints
@router.post("/ask", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> AskResponse:
    """
    Ask a question and get an AI-generated answer with citations.

    The answer is grounded in the textbook content using RAG.
    Works for both authenticated and anonymous users.
    """
    # Get or create conversation
    conversation = None
    if request.conversation_id and current_user:
        conversation = await db.get(Conversation, request.conversation_id)
        if not conversation or conversation.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )
    elif current_user:
        # Create new conversation for authenticated user
        conversation = Conversation(
            user_id=current_user.id,
            title=request.question[:50] + "..." if len(request.question) > 50 else request.question,
        )
        db.add(conversation)
        await db.flush()

    # Get conversation history (only for authenticated users with conversation)
    conversation_history = []
    if conversation:
        history_query = select(Message).where(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at.desc()).limit(10)
        result = await db.execute(history_query)
        history_messages = result.scalars().all()
        conversation_history = [
            {"role": msg.role.value, "content": msg.content}
            for msg in reversed(history_messages)
        ]

    # Get answer from Q&A agent
    agent = get_qa_agent()
    response = await agent.ask(
        question=request.question,
        context_mode=request.context_mode,
        chapter_slug=request.chapter_slug,
        selected_text=request.selected_text,
        conversation_history=conversation_history,
    )

    # Only save to database if user is authenticated
    if conversation:
        # Create user message
        user_message = Message(
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=request.question,
            context_mode=ContextMode(request.context_mode) if request.context_mode else None,
            selected_text=request.selected_text,
        )
        db.add(user_message)

        # Create assistant message
        assistant_message = Message(
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=response.answer,
            context_mode=ContextMode(request.context_mode) if request.context_mode else None,
            prompt_tokens=response.prompt_tokens,
            completion_tokens=response.completion_tokens,
            context_chunks={
                "chunks": [
                    {
                        "chapter_slug": c.chapter_slug,
                        "section_title": c.section_title,
                        "score": c.score,
                    }
                    for c in response.chunks_used
                ]
            },
        )
        db.add(assistant_message)
        await db.flush()

        # Add citations
        for citation_data in response.citations:
            citation = Citation(
                message_id=assistant_message.id,
                chapter_slug=citation_data["chapter_slug"],
                section_title=citation_data["section_title"],
                content_preview=citation_data["content_preview"],
                relevance_score=citation_data["relevance_score"],
                chunk_index=citation_data["chunk_index"],
            )
            db.add(citation)

        await db.commit()

        return AskResponse(
            answer=response.answer,
            citations=[
                CitationResponse(
                    chapter_slug=c["chapter_slug"],
                    section_title=c["section_title"],
                    content_preview=c["content_preview"],
                    relevance_score=c["relevance_score"],
                )
                for c in response.citations
            ],
            conversation_id=conversation.id,
            message_id=assistant_message.id,
        )
    else:
        # Anonymous user - return response without saving
        from uuid import uuid4
        return AskResponse(
            answer=response.answer,
            citations=[
                CitationResponse(
                    chapter_slug=c["chapter_slug"],
                    section_title=c["section_title"],
                    content_preview=c["content_preview"],
                    relevance_score=c["relevance_score"],
                )
                for c in response.citations
            ],
            conversation_id=uuid4(),  # Temporary ID
            message_id=uuid4(),  # Temporary ID
        )


@router.post("/stream")
async def stream_answer(
    request: AskRequest,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream an AI-generated answer using Server-Sent Events.

    This endpoint streams the answer as it's generated for better UX.
    Works for both authenticated and anonymous users.
    """
    from uuid import uuid4

    # Get or create conversation (only for authenticated users)
    conversation = None
    if current_user:
        if request.conversation_id:
            conversation = await db.get(Conversation, request.conversation_id)
            if not conversation or conversation.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found",
                )
        else:
            conversation = Conversation(
                user_id=current_user.id,
                title=request.question[:50] + "..." if len(request.question) > 50 else request.question,
            )
            db.add(conversation)
            await db.flush()

        # Create user message for authenticated users
        user_message = Message(
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=request.question,
            context_mode=ContextMode(request.context_mode) if request.context_mode else None,
            selected_text=request.selected_text,
        )
        db.add(user_message)
        await db.commit()

    async def generate():
        """Generate SSE events for streaming response."""
        agent = get_qa_agent()
        full_answer = []

        # First, get retrieval result for citations
        retrieval_result = await agent.get_retrieval_result(
            question=request.question,
            context_mode=request.context_mode,
            chapter_slug=request.chapter_slug,
            selected_text=request.selected_text,
        )

        # Send citations first
        citations_data = [
            {
                "chapter_slug": c.chapter_slug,
                "section_title": c.section_title,
                "content_preview": c.content_preview[:200],
                "relevance_score": c.score,
            }
            for c in retrieval_result.chunks
        ]
        yield f"event: citations\ndata: {json.dumps(citations_data)}\n\n"

        # Stream the answer
        async for chunk in agent.ask_stream(
            question=request.question,
            context_mode=request.context_mode,
            chapter_slug=request.chapter_slug,
            selected_text=request.selected_text,
        ):
            full_answer.append(chunk)
            yield f"data: {json.dumps({'content': chunk})}\n\n"

        # Send done event with conversation ID
        conv_id = str(conversation.id) if conversation else str(uuid4())
        yield f"event: done\ndata: {json.dumps({'conversation_id': conv_id})}\n\n"

        # Save the complete message to database only for authenticated users
        if conversation:
            async with async_session_maker() as save_db:
                assistant_message = Message(
                    conversation_id=conversation.id,
                    role=MessageRole.ASSISTANT,
                    content="".join(full_answer),
                    context_mode=ContextMode(request.context_mode) if request.context_mode else None,
                )
                save_db.add(assistant_message)
                await save_db.flush()

                for c in retrieval_result.chunks:
                    citation = Citation(
                        message_id=assistant_message.id,
                        chapter_slug=c.chapter_slug,
                        section_title=c.section_title,
                        content_preview=c.content_preview[:200],
                        relevance_score=c.score,
                        chunk_index=c.chunk_index,
                    )
                    save_db.add(citation)

            await save_db.commit()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
    offset: int = 0,
) -> ConversationListResponse:
    """List user's conversations."""
    # Get conversations with message count
    query = (
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .where(Conversation.is_active == True)
        .order_by(Conversation.updated_at.desc())
        .offset(offset)
        .limit(limit)
        .options(selectinload(Conversation.messages))
    )
    result = await db.execute(query)
    conversations = result.scalars().all()

    # Count total
    count_query = select(Conversation).where(
        Conversation.user_id == current_user.id,
        Conversation.is_active == True,
    )
    count_result = await db.execute(count_query)
    total = len(count_result.scalars().all())

    return ConversationListResponse(
        conversations=[
            ConversationSummary(
                id=conv.id,
                title=conv.title,
                chapter_id=conv.chapter_id,
                message_count=len(conv.messages),
                created_at=conv.created_at.isoformat(),
                updated_at=conv.updated_at.isoformat(),
            )
            for conv in conversations
        ],
        total=total,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetail:
    """Get a conversation with all messages."""
    query = (
        select(Conversation)
        .where(Conversation.id == conversation_id)
        .where(Conversation.user_id == current_user.id)
        .options(
            selectinload(Conversation.messages).selectinload(Message.citations)
        )
    )
    result = await db.execute(query)
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        chapter_id=conversation.chapter_id,
        messages=[
            MessageResponse(
                id=msg.id,
                role=msg.role.value,
                content=msg.content,
                citations=[
                    CitationResponse(
                        chapter_slug=c.chapter_slug,
                        section_title=c.section_title,
                        content_preview=c.content_preview,
                        relevance_score=c.relevance_score,
                    )
                    for c in msg.citations
                ],
                created_at=msg.created_at.isoformat(),
            )
            for msg in conversation.messages
        ],
        created_at=conversation.created_at.isoformat(),
    )


@router.post("/conversations", response_model=ConversationSummary)
async def create_conversation(
    request: CreateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationSummary:
    """Create a new conversation."""
    conversation = Conversation(
        user_id=current_user.id,
        title=request.title,
        chapter_id=request.chapter_id,
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)

    return ConversationSummary(
        id=conversation.id,
        title=conversation.title,
        chapter_id=conversation.chapter_id,
        message_count=0,
        created_at=conversation.created_at.isoformat(),
        updated_at=conversation.updated_at.isoformat(),
    )


@router.patch("/conversations/{conversation_id}", response_model=ConversationSummary)
async def update_conversation(
    conversation_id: UUID,
    request: UpdateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationSummary:
    """Update a conversation."""
    conversation = await db.get(Conversation, conversation_id)

    if not conversation or conversation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    if request.title is not None:
        conversation.title = request.title
    if request.is_active is not None:
        conversation.is_active = request.is_active

    await db.commit()
    await db.refresh(conversation)

    # Get message count
    msg_query = select(Message).where(Message.conversation_id == conversation.id)
    msg_result = await db.execute(msg_query)
    message_count = len(msg_result.scalars().all())

    return ConversationSummary(
        id=conversation.id,
        title=conversation.title,
        chapter_id=conversation.chapter_id,
        message_count=message_count,
        created_at=conversation.created_at.isoformat(),
        updated_at=conversation.updated_at.isoformat(),
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a conversation (soft delete by setting is_active=False)."""
    conversation = await db.get(Conversation, conversation_id)

    if not conversation or conversation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    conversation.is_active = False
    await db.commit()
