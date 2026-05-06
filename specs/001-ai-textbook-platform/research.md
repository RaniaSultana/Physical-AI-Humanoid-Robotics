# Research: AI-Native Interactive Textbook Platform

**Date**: 2025-12-24
**Feature**: 001-ai-textbook-platform
**Phase**: 0 - Research & Discovery

## Technology Decisions

### 1. Frontend Framework: Docusaurus 3.x

**Decision**: Use Docusaurus 3.x as the primary frontend framework for content delivery.

**Rationale**:
- Purpose-built for documentation and educational content
- Native MDX support for rich interactive content
- Built-in versioning, search, and navigation
- Excellent performance with static site generation
- Large ecosystem of plugins and themes
- React-based allowing custom component integration

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|-----------------|
| Next.js | More general-purpose; would need to build documentation features from scratch |
| GitBook | Less customizable; hosted solution with limitations |
| VuePress | Smaller ecosystem; Vue vs React (team familiarity) |
| Custom React | Significant development overhead for documentation features |

**Integration Pattern**:
- Custom React components for ChatBot, Auth, Personalization
- Theme swizzling for layout customization
- Plugin system for content processing hooks

### 2. Backend Framework: FastAPI

**Decision**: Use FastAPI for the backend API service.

**Rationale**:
- Async-first design for handling concurrent AI requests
- Automatic OpenAPI documentation generation
- Excellent Pydantic integration for data validation
- Python ecosystem for AI/ML libraries
- High performance with uvicorn/gunicorn
- Type hints for better IDE support

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|-----------------|
| Django REST | Heavier; less async-native |
| Flask | Less structured; no built-in async |
| Node.js/Express | Less mature AI/ML ecosystem in JS |
| Go/Gin | Smaller ML library ecosystem |

**Key Dependencies**:
- `fastapi>=0.109.0`
- `pydantic>=2.0`
- `sqlalchemy>=2.0`
- `uvicorn[standard]`

### 3. Vector Database: Qdrant Cloud

**Decision**: Use Qdrant Cloud Free Tier for vector storage and similarity search.

**Rationale**:
- Generous free tier (1GB storage, 1M vectors)
- Excellent Python SDK with async support
- Fast similarity search with filtering
- Payload storage for metadata (chapter, section)
- Managed service reduces operational burden

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|-----------------|
| Pinecone | Free tier more limited; paid for production features |
| Chroma | Less production-ready; primarily for local development |
| Weaviate | More complex setup; overkill for single course |
| pgvector | Requires PostgreSQL extension management; less optimized |

**Configuration**:
- Collection: `textbook_content`
- Vector size: 1536 (OpenAI text-embedding-3-small)
- Distance metric: Cosine
- Payload fields: `chapter_id`, `section_id`, `week`, `content_type`

### 4. Relational Database: Neon PostgreSQL

**Decision**: Use Neon serverless PostgreSQL for user data and content metadata.

**Rationale**:
- Serverless with automatic scaling
- Free tier (0.5GB storage, 3GB compute hours)
- Standard PostgreSQL compatibility
- Connection pooling built-in
- Easy integration with SQLAlchemy

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|-----------------|
| Supabase | More features than needed; adds complexity |
| PlanetScale | MySQL-based; less familiar |
| Railway PostgreSQL | Less generous free tier |
| SQLite | Not suitable for multi-user production |

**Schema Domains**:
- Users & Authentication
- Reading Progress
- Personalized Content
- Conversations & Messages
- Content Metadata (synced from Docusaurus)

### 5. Authentication: BetterAuth

**Decision**: Use BetterAuth for user authentication and session management.

**Rationale**:
- Modern, TypeScript-first design
- Email/password authentication out of box
- Session management with secure cookies
- Easy integration with both frontend (React) and backend (FastAPI)
- Open source with active development

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|-----------------|
| Auth0 | Paid tiers for needed features |
| Clerk | Paid; more features than needed |
| NextAuth | Next.js specific; less flexible |
| Custom JWT | Security risk; more development time |

**Implementation**:
- Session-based authentication
- Email/password login
- Profile fields for educational background
- API token generation for backend calls

### 6. AI Orchestration: OpenAI Agents SDK

**Decision**: Use OpenAI Agents SDK for AI agent orchestration.

**Rationale**:
- Structured patterns for multi-step AI operations
- Built-in tool use and function calling
- Conversation context management
- Compatible with GPT-4 and other models
- Cleaner abstraction than raw API calls

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|-----------------|
| LangChain | Heavier dependency; more abstraction than needed |
| Raw OpenAI API | More boilerplate; harder to manage state |
| Semantic Kernel | Microsoft-focused; less Python-native |
| AutoGen | More suited for multi-agent scenarios |

**Agent Types**:
1. **Q&A Agent**: RAG-based question answering with citations
2. **Translation Agent**: Chapter translation to Urdu
3. **Personalization Agent**: Chapter content adaptation

### 7. Embedding Model: OpenAI text-embedding-3-small

**Decision**: Use OpenAI's text-embedding-3-small for content embeddings.

**Rationale**:
- Good balance of quality and cost
- 1536 dimensions (sufficient for semantic search)
- Fast inference
- Well-documented API

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|-----------------|
| text-embedding-3-large | More expensive; marginal quality gain for this use case |
| Cohere Embed | Additional vendor; less integrated |
| Sentence Transformers | Requires self-hosting; more operational overhead |

**Chunking Strategy**:
- Target: ~500 tokens per chunk
- Overlap: 50 tokens between chunks
- Boundaries: Respect section/paragraph boundaries
- Metadata: Include chapter, section, week info

### 8. Deployment Strategy

**Frontend (Docusaurus)**:
- **Primary**: Vercel (recommended for React/Next ecosystem)
- **Alternative**: GitHub Pages (simpler, free)
- Static site with client-side API calls

**Backend (FastAPI)**:
- **Primary**: Railway or Render (easy Python deployment)
- **Alternative**: Fly.io (good free tier, edge deployment)
- Container-based deployment with auto-scaling

**CI/CD**:
- GitHub Actions for build and deploy
- Automated testing on PR
- Content indexing webhook on main branch push

## Best Practices Research

### RAG Implementation Patterns

**Retrieval Strategy**:
1. Query embedding generation
2. Vector similarity search (top-k=5)
3. Metadata filtering (optional: current chapter context)
4. Re-ranking based on relevance
5. Context assembly for LLM

**Citation Format**:
```
[Week X, Module Y, Chapter Z - Section Title]
```

**Out-of-scope Handling**:
- Similarity threshold (< 0.7 triggers "not found")
- LLM instruction to decline gracefully
- Suggest related topics if available

### Content Personalization Patterns

**Background-based Adaptation**:
- System prompt includes user background
- Examples tailored to domain (CS → code, ME → physics)
- Terminology mapping per background type

**Chapter Personalization**:
- Full chapter as context
- User interests as personalization prompt
- Streaming response for progress indication
- Cache personalized versions per user

### Translation Patterns

**Urdu Translation Approach**:
- Section-by-section translation for long chapters
- Technical term preservation: `robotics (روبوٹکس)`
- RTL text handling in UI
- Markdown structure preservation

## Security Considerations

### Authentication Security
- Password hashing with bcrypt
- Session tokens with secure cookies
- CSRF protection on state-changing operations
- Rate limiting on auth endpoints

### API Security
- JWT validation for backend calls
- Input validation with Pydantic
- SQL injection prevention (parameterized queries)
- XSS prevention (content sanitization)

### Data Privacy
- User data stored in encrypted Neon database
- No PII in vector database payloads
- Conversation history retention policy (TBD)
- GDPR-ready data export/delete endpoints

## Performance Optimization

### Frontend
- Static generation for content pages
- Code splitting for interactive components
- Lazy loading for chatbot component
- Service worker for caching

### Backend
- Connection pooling for PostgreSQL
- Async endpoints for AI operations
- Response caching for common queries
- Streaming responses for long operations

### Vector Search
- Index optimization in Qdrant
- Metadata filtering to reduce search space
- Batch embedding generation for indexing

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Which LLM for Q&A? | OpenAI GPT-4o-mini (cost-effective, good quality) |
| How to handle long chapters for translation? | Section-by-section with progress streaming |
| Vector DB free tier sufficient? | Yes, ~50K vectors for full course content |
| Auth integration complexity? | BetterAuth provides clean React + Python integration |

## Dependencies Summary

### Frontend (package.json)
```json
{
  "@docusaurus/core": "^3.0.0",
  "@docusaurus/preset-classic": "^3.0.0",
  "react": "^18.2.0",
  "better-auth": "^0.x.x"
}
```

### Backend (requirements.txt)
```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.0
sqlalchemy>=2.0
asyncpg>=0.29.0
qdrant-client>=1.7.0
openai>=1.10.0
python-multipart>=0.0.6
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
```

## Next Phase Artifacts

Phase 1 will produce:
1. `data-model.md` - SQLAlchemy models and Qdrant schema
2. `contracts/` - OpenAPI specifications for all endpoints
3. `quickstart.md` - Developer setup guide
