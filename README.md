# AI Feedback Collection Web Application

A production-ready conversational AI feedback collector built with FastAPI, LangChain, Groq, SQLAlchemy, PostgreSQL or SQLite, React, Vite, TailwindCSS, and JWT auth.

## Folder Structure

```text
conversationalfeddback/
|-- backend/
|   |-- app/
|   |   |-- api/
|   |   |   |-- deps.py
|   |   |   `-- routes/
|   |   |       |-- auth.py
|   |   |       `-- chat.py
|   |   |-- core/
|   |   |   |-- config.py
|   |   |   `-- security.py
|   |   |-- db/
|   |   |   |-- base.py
|   |   |   `-- session.py
|   |   |-- models/
|   |   |-- schemas/
|   |   `-- services/
|   |       |-- chains/
|   |       `-- chat_service.py
|   |-- requirements.txt
|   `-- .env.example
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- context/
|   |   |-- pages/
|   |   `-- types/
|   |-- package.json
|   `-- .env.example
`-- README.md
```

## Features

- JWT-based signup and login
- Persistent conversations, messages, and structured feedback records
- Stateful feedback collection engine with the required conversation states
- LangChain chains for intent classification, rating extraction, sentiment analysis, feedback extraction, and issue classification
- Groq LLM integration with structured JSON outputs
- Dev-safe fallback classifiers when no Groq API key is configured
- ChatGPT-style dashboard with conversation list and real-time style messaging UI

## Backend Architecture

### State Machine

The conversation state is stored in the `conversations.state` column and transitions through:

- `START`
- `ASK_FEEDBACK`
- `CLASSIFY_INTENT`
- `ASK_RATING`
- `HANDLE_VAGUE_RATING`
- `POSITIVE_FLOW`
- `NEGATIVE_FLOW`
- `NEUTRAL_FLOW`
- `ANALYZE_FEEDBACK`
- `CLASSIFY_ISSUE_TYPE`
- `STORE_FEEDBACK`
- `END`

### Main API Endpoints

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/chat/conversations`
- `GET /api/v1/chat/conversations`
- `POST /api/v1/chat/send`
- `GET /api/v1/chat/history/{conversation_id}`

## Local Setup

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Update `.env` with your values:

- `SECRET_KEY`: long random string for JWT signing
- `DATABASE_URL`: use SQLite for dev or PostgreSQL for production
- `GROQ_API_KEY`: required for live LLM chains
- `GROQ_MODEL`: optional model override
- `FRONTEND_ORIGIN`: frontend URL for CORS

Run the backend:

```bash
uvicorn app.main:app --reload
```

### 2. Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:8000/api/v1` by default.

## Environment Examples

### SQLite for development

```env
DATABASE_URL=sqlite:///./feedback_collector.db
```

### PostgreSQL for production

```env
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/feedback_collector
```

## LangChain + Groq Notes

`backend/app/services/chains/llm_service.py` wires each task as a separate structured chain. When `GROQ_API_KEY` is available, LangChain uses Groq with `with_structured_output(...)`. When the key is missing, the app falls back to deterministic local classifiers so the UI and state machine still work for development and demos.

## Database Tables

- `users`
- `conversations`
- `messages`
- `feedback`

## Suggested Production Hardening

- Swap `Base.metadata.create_all(...)` for Alembic migrations
- Add refresh tokens and password reset flow
- Add rate limiting and audit logging
- Stream assistant responses over WebSockets or Server-Sent Events
- Add observability for LLM latency and chain failures
- Use Redis for session-scale memory or queue-backed async processing
