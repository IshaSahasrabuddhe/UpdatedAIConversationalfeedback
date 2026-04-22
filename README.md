# AI Feedback Collector

An end-to-end conversational feedback platform built to collect user feedback through a guided AI chat experience, store structured insights, and surface them through an admin analytics dashboard.

This project combines FastAPI, React, Tailwind CSS, LangChain, Groq, and PostgreSQL-style database support to create a complete feedback collection workflow for both end users and administrators.

## Project Overview

AI Feedback Collector helps organizations gather richer feedback than a static form. Instead of asking users to fill out a long survey, the system guides them through a conversation, detects sentiment, extracts issues, captures ratings, and stores structured feedback for reporting.

The platform has two main experiences:

- A user-facing chat dashboard where users sign up, log in, and submit feedback conversationally
- An admin dashboard where internal teams can review conversations, feedback summaries, analytics, issue trends, and user activity

The application is designed to feel simple on the surface while running a structured AI-assisted workflow underneath.

## Live Demo

Check out the deployed website here:  
[Deployed Website Link](https://convofeedback-frontend.onrender.com)

**For the best experience, please sign up as a user first and then proceed with the admin login for a smoother transition.**  
If you encounter any issues, please refer to the demo video.
---

## Video Demo

Watch the full walkthrough (user flow, admin flow, and dashboard insights):  
 [Watch Demo Video](https://drive.google.com/file/d/13IAQ6ehE-6TlfPXK7_OytNqiypyDSJhu/view?usp=sharing)

## Admin Login Credentials

Current admin credentials configured in the app:

- Email: `admin@system.com`
- Password: `Admin@123`

If you change the backend environment variables `ADMIN_EMAIL` or `ADMIN_PASSWORD`, update this section accordingly.

## Features

- User signup and login with JWT authentication
- Separate admin login flow
- Conversational feedback collection instead of traditional forms
- AI-assisted extraction of sentiment, issue type, rating, positives, negatives, and summary
- Support for different task types such as text, image, audio, video, and document
- Persistent storage of users, conversations, messages, and feedback entries
- Admin dashboard with conversation review, feedback review, user list, analytics, and insight summaries
- Trend visualizations for sentiment, task usage, issue distribution, and top issue tags
- Structured fallback logic when an external AI key is not available
- Local file upload support for generated output artifacts

## Tech Stack

- Backend: FastAPI, SQLAlchemy, Pydantic
- Frontend: React, Vite, Tailwind CSS, Recharts
- AI Layer: LangChain, Groq
- Database: PostgreSQL in deployment, SQLite supported for local development
- Auth: JWT for users, protected admin token flow for dashboard APIs

## System Architecture

### High-Level Flow

The application follows this flow:

`User -> React Frontend -> FastAPI Backend -> AI Chains -> Database -> Admin Dashboard`

### Detailed Architecture Explanation

1. The user opens the React frontend and signs up or logs in.
2. The frontend calls FastAPI REST endpoints under `/api/v1`.
3. A new conversation is created and stored in the database.
4. As the user sends messages, the backend runs a state-driven chat workflow.
5. The backend sends the latest user input into LangChain-powered analysis/extraction logic.
6. Groq is used to produce structured outputs such as sentiment, issue type, rating interpretation, and feedback insights.
7. The backend stores messages, conversation metadata, and extracted feedback into the database.
8. The admin dashboard reads this stored data through protected admin endpoints.
9. Analytics and insights are displayed through charts, tables, and conversation review screens.

### Main Layers

#### 1. Frontend Layer

The React frontend is responsible for:

- User authentication screens
- Chat dashboard experience
- Admin dashboard views
- Table rendering and analytics visualization
- Calling backend APIs through a central API layer

#### 2. Backend API Layer

The FastAPI backend exposes:

- User auth routes
- Admin auth route
- Chat conversation routes
- Admin analytics and review routes

This layer validates requests, enforces auth rules, and delegates business logic to service classes.

#### 3. Service Layer

Core application behavior lives in services such as:

- `chat_service.py` for conversation progression and feedback collection
- `admin_service.py` for dashboard data preparation and analytics
- LangChain service modules for AI-powered extraction and summarization

#### 4. AI Layer

The AI layer interprets free-form user feedback into structured data that the admin dashboard can analyze.

#### 5. Data Layer

SQLAlchemy models persist:

- Users
- Conversations
- Messages
- Feedback records

This makes the platform traceable, reviewable, and analytics-friendly.

## AI Components

### Models Used

The project uses:

- Groq API
- Default configured model: `llama-3.3-70b-versatile`
- LangChain for chain orchestration and structured outputs

### How the AI Layer Works

The AI pipeline does not just generate free text. It is used to convert conversation content into structured business data.

Examples of AI tasks in this project:

- Turn-level intent analysis
- Sentiment detection
- Rating extraction
- Issue classification
- Feedback extraction
- Insight generation for admin analytics

### LangChain Chains

The LangChain integration is organized so each task has a focused responsibility. Instead of one large prompt doing everything, the backend uses separate structured workflows for reliability.

At a high level, the chains help the backend answer questions like:

- Is the user actually giving feedback or asking something else?
- Is the user positive, negative, or mixed?
- Did the user provide a clear rating?
- What issue type best describes the feedback?
- What should be stored as positives, negatives, tags, and summary?
- What overall insights should be shown to admins?

### Why This Matters

This approach makes the dashboard more useful for business teams because they are not reviewing only raw text. They also get structured summaries, issue grouping, and trend visibility.

### Fallback Behavior

If a Groq API key is not configured, the system still supports development using deterministic fallback logic so the app remains usable during local testing.

## Database Overview

The database is intentionally simple and centered around four main tables.

### `users`

Stores account information for application users.

Typical data:

- User ID
- Email
- Password hash
- Created timestamp

### `conversations`

Stores one feedback session per user interaction thread.

Typical data:

- Conversation ID
- User ID
- Current conversation state
- Task type
- Prompt and AI output references
- Context metadata
- Created timestamp

### `messages`

Stores the individual messages exchanged in a conversation.

Typical data:

- Message ID
- Conversation ID
- Message role
- Message content
- Timestamp

### `feedback`

Stores the structured feedback extracted from a conversation.

Typical data:

- Feedback ID
- Conversation ID
- Rating
- Sentiment
- Positives
- Negatives
- Suggestions
- Issue type
- Issue tags
- Summary
- Created timestamp

## Admin Dashboard Explanation

The admin dashboard is designed for business review, not just technical monitoring.

### Dashboard Tab

Provides a high-level overview of:

- Total conversations
- Average rating
- Positive sentiment percentage
- Task usage trends
- Issue type distribution
- Critical issue patterns
- AI-generated insight summaries

### Conversations Tab

Shows conversation-level records so admins can:

- Review who submitted feedback
- See task type, state, sentiment, rating, and issue type
- Open a conversation detail page
- Inspect conversation context and metadata

### Conversation Detail View

Lets admins inspect:

- The full chat transcript
- Prompt and AI output
- Feedback summary
- Positives, negatives, suggestions, and issue tags

### Feedbacks Tab

Displays structured feedback entries in a table format so admins can quickly scan:

- Ratings
- Sentiment
- Issue type
- Positives and negatives
- Issue tags
- Summary

### Users Tab

Lists all users and their overall activity level.

### Insights Tab

Presents aggregated AI-assisted findings such as:

- Top problems
- Improvement opportunities
- Task-wise issue breakdown
- Frequent issue tags

## How To Use

### User Flow

1. Open the frontend application.
2. Create a user account or log in.
3. Start a new conversation.
4. Provide feedback in natural language.
5. If relevant, include prompt details or AI output details.
6. Continue the guided conversation until the system captures enough feedback.
7. The platform stores the conversation and structured feedback automatically.

### Admin Flow

1. Open the login page in admin mode.
2. Sign in using the admin credentials.
3. Open the admin dashboard.
4. Review analytics, conversation records, and structured feedback.
5. Open individual conversation detail pages when deeper review is needed.
6. Use the dashboard to identify trends, recurring issues, and improvement opportunities.

## How To Run Locally

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

The backend will run by default on:

`http://localhost:8000`

Health check:

`http://localhost:8000/health`

### Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

The frontend will usually run on:

`http://localhost:5173`

### Local End-to-End Flow

- Frontend calls backend APIs at `http://localhost:8000/api/v1`
- Backend stores data in SQLite by default unless you switch to PostgreSQL
- Admin login is available through the same frontend login screen

## Environment Variables

### Backend Environment Variables

Create `backend/.env` and configure:

```env
SECRET_KEY=replace-with-a-secure-random-string
DATABASE_URL=sqlite:///./feedback_collector.db
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
FRONTEND_ORIGIN=http://localhost:5173
ADMIN_EMAIL=admin@system.com
ADMIN_PASSWORD=Admin@123
ADMIN_STATIC_TOKEN=admin-static-token
```

### Backend Variable Notes

- `SECRET_KEY`: used to sign JWT tokens
- `DATABASE_URL`: database connection string
- `GROQ_API_KEY`: enables live AI model calls
- `GROQ_MODEL`: selects the Groq model
- `FRONTEND_ORIGIN`: allowed frontend origin for CORS
- `ADMIN_EMAIL`: admin login email
- `ADMIN_PASSWORD`: admin login password
- `ADMIN_STATIC_TOKEN`: token returned after successful admin login and used to access admin APIs

### Frontend Environment Variables

Create `frontend/.env` and configure:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Deployment Overview

The deployed project is designed around:

- Render for application hosting
- PostgreSQL for persistent production data storage

### Typical Deployment Structure

#### Frontend

- Hosted on Render as a static site
- Builds the React + Vite frontend
- Connects to the backend through the configured API base URL

#### Backend

- Hosted on Render as a web service
- Runs the FastAPI application
- Connects to PostgreSQL using `DATABASE_URL`
- Serves uploaded files from the backend service

#### Database

- PostgreSQL is recommended for deployment
- The backend uses SQLAlchemy, so switching from SQLite in local development to PostgreSQL in production is straightforward

### Production Flow

1. User accesses the deployed frontend.
2. Frontend sends API requests to the deployed FastAPI backend.
3. Backend runs AI extraction logic through Groq and LangChain.
4. Structured results are stored in PostgreSQL.
5. Admins log in and review the processed data through the dashboard.

## API Overview

Important routes include:

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/admin/login`
- `POST /api/v1/chat/conversations`
- `GET /api/v1/chat/conversations`
- `POST /api/v1/chat/send`
- `GET /api/v1/chat/history/{conversation_id}`
- `GET /api/v1/admin/conversations`
- `GET /api/v1/admin/feedbacks`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/analytics/overview`
- `GET /api/v1/admin/analytics/sentiment-by-task`
- `GET /api/v1/admin/insights`

## Folder Structure

```text
backend/
  app/
    api/
    core/
    db/
    models/
    schemas/
    services/
  requirements.txt
  .env.example

frontend/
  src/
    api/
    components/
    context/
    pages/
    types/
  package.json
  .env.example
```

## Notes

- SQLite is convenient for local setup and quick testing
- PostgreSQL is the recommended production database
- Groq improves extraction quality, but the app can still run in a development-safe fallback mode
- The admin dashboard is built for review and analytics, while the user dashboard is built for guided feedback capture
