# Quickstart: AI-Native Interactive Textbook Platform

**Feature**: 001-ai-textbook-platform
**Date**: 2025-12-24

This guide covers local development setup for the AI-Native Interactive Textbook Platform.

## Prerequisites

- **Node.js**: 18.x or higher
- **Python**: 3.11 or higher
- **pnpm**: 8.x or higher (or npm/yarn)
- **Git**: For version control

### External Services (Free Tiers)

1. **Qdrant Cloud**: [https://cloud.qdrant.io](https://cloud.qdrant.io) - Vector database
2. **Neon**: [https://neon.tech](https://neon.tech) - Serverless PostgreSQL
3. **OpenAI API**: [https://platform.openai.com](https://platform.openai.com) - For embeddings and AI agents

## Project Structure

```
.
├── docusaurus/          # Frontend (Docusaurus + React)
├── backend/             # Backend (FastAPI)
├── specs/               # Design documents
└── shared/              # Shared types (optional)
```

## Step 1: Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd <repository-name>

# Checkout the feature branch
git checkout 001-ai-textbook-platform
```

## Step 2: Environment Configuration

### Backend Environment

Create `backend/.env`:

```env
# Database (Neon)
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>/<database>?sslmode=require

# Vector Database (Qdrant Cloud)
QDRANT_URL=https://<cluster-id>.us-east4-0.gcp.cloud.qdrant.io
QDRANT_API_KEY=<your-qdrant-api-key>

# OpenAI
OPENAI_API_KEY=<your-openai-api-key>

# Auth
JWT_SECRET=<generate-a-secure-secret>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# App
DEBUG=true
CORS_ORIGINS=http://localhost:3000
```

### Frontend Environment

Create `docusaurus/.env`:

```env
# API URL
REACT_APP_API_URL=http://localhost:8000/api/v1

# Optional: Analytics
# REACT_APP_GA_TRACKING_ID=
```

## Step 3: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python -m alembic upgrade head

# Seed initial data (optional)
python scripts/seed_db.py
```

### Verify Backend

```bash
# Start the server
uvicorn src.main:app --reload --port 8000

# Test health endpoint
curl http://localhost:8000/health
# Expected: {"status": "healthy"}

# View API docs
open http://localhost:8000/docs
```

## Step 4: Frontend Setup

```bash
cd docusaurus

# Install dependencies
pnpm install

# Start development server
pnpm start

# Open in browser
open http://localhost:3000
```

## Step 5: Content Indexing

Before the RAG chatbot works, you need to index the textbook content:

```bash
cd backend

# Ensure virtual environment is active
source venv/bin/activate

# Run the indexing script
python scripts/index_content.py

# Verify indexing
python scripts/verify_index.py
# Expected: "Indexed X chunks from Y chapters"
```

## Development Workflow

### Backend Development

```bash
cd backend
source venv/bin/activate

# Run with auto-reload
uvicorn src.main:app --reload --port 8000

# Run tests
pytest

# Run specific test file
pytest tests/unit/test_rag_service.py

# Run with coverage
pytest --cov=src --cov-report=html
```

### Frontend Development

```bash
cd docusaurus

# Development server with hot reload
pnpm start

# Build for production
pnpm build

# Serve production build locally
pnpm serve

# Run tests
pnpm test
```

### Adding Course Content

1. Create MDX files in `docusaurus/docs/`:

```
docs/
├── week-01/
│   ├── module-01/
│   │   ├── _category_.json    # Module metadata
│   │   ├── introduction.mdx   # Chapter 1
│   │   └── embodied-ai.mdx    # Chapter 2
│   └── module-02/
│       └── ...
```

2. Update sidebars in `docusaurus/sidebars.js`

3. Re-run indexing after adding content:

```bash
cd backend
python scripts/index_content.py --incremental
```

## API Testing

### Authentication

```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123"}'
# Save the access_token from response
```

### Chat API

```bash
# Ask a question (replace TOKEN with your access token)
curl -X POST http://localhost:8000/api/v1/chat/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"question": "What is ROS2?"}'
```

### Personalization API

```bash
# Generate Urdu translation
curl -X POST http://localhost:8000/api/v1/translate/CHAPTER_ID \
  -H "Authorization: Bearer TOKEN"

# Generate personalized chapter
curl -X POST http://localhost:8000/api/v1/personalize/CHAPTER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"interests": "agricultural robotics applications"}'
```

## Troubleshooting

### Common Issues

**Database Connection Failed**
```
Error: Connection refused to Neon
```
- Verify `DATABASE_URL` in `.env`
- Check Neon dashboard for connection limits
- Ensure IP allowlist includes your IP

**Qdrant Connection Failed**
```
Error: Failed to connect to Qdrant
```
- Verify `QDRANT_URL` and `QDRANT_API_KEY`
- Check Qdrant Cloud dashboard status
- Ensure collection exists (run indexing first)

**OpenAI API Error**
```
Error: OpenAI API key invalid
```
- Verify `OPENAI_API_KEY` is correct
- Check API usage limits on OpenAI dashboard
- Ensure billing is set up

**Frontend Can't Connect to Backend**
```
Error: Network Error / CORS
```
- Verify backend is running on port 8000
- Check `CORS_ORIGINS` in backend `.env`
- Ensure `REACT_APP_API_URL` is correct

### Reset Development Environment

```bash
# Backend
cd backend
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m alembic downgrade base
python -m alembic upgrade head

# Frontend
cd docusaurus
rm -rf node_modules .docusaurus
pnpm install
```

## Deployment

### Frontend (Vercel)

```bash
cd docusaurus
pnpm build
# Deploy via Vercel CLI or GitHub integration
```

### Backend (Railway/Render)

1. Connect repository to Railway/Render
2. Set environment variables from `.env`
3. Configure build command: `pip install -r requirements.txt`
4. Configure start command: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`

## Next Steps

1. Run `/sp.tasks` to generate implementation task list
2. Start with Phase 1 (Setup) tasks
3. Follow TDD approach per constitution
4. Commit after each completed task

## Resources

- [Docusaurus Documentation](https://docusaurus.io/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Neon Documentation](https://neon.tech/docs)
