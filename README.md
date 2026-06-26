# DevGuard — AI Workplace Wellness Platform

DevGuard helps HR teams identify employee wellbeing issues early through natural AI-powered conversations. Employees experience it as a friendly workplace assistant; HR gets actionable insights and retention analytics.

---

## Tech Stack

**Backend:** FastAPI · SQLAlchemy · SQLite · Pydantic · JWT  
**AI:** Groq API (llama-3.3-70b-versatile · Whisper)  
**Voice:** MediaRecorder API · Librosa  
**Face:** DeepFace · OpenCV  
**Frontend:** React 18 · TypeScript · Vite · Tailwind CSS · Zustand · Recharts

---

## Quick Start

### 1. Prerequisites

- Python 3.11+
- Node.js 20+
- A [Groq API key](https://console.groq.com)

### 2. Backend Setup

```bash
cd devguard/backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set your GROQ_API_KEY

# Start server
uvicorn app.main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`  
API docs at: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd devguard/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## Docker Deployment

```bash
# From project root
cp backend/.env.example backend/.env
# Edit backend/.env with your GROQ_API_KEY

docker-compose up --build
```

App runs at: `http://localhost:3000`

---

## First Run

1. Open the app and register an **HR Admin** account (select "HR Admin" in role)
2. Register one or more **Employee** accounts
3. Employees complete the consent screen on first login
4. Employees chat with DevAssist — analytics run in the background
5. HR dashboard shows wellbeing trends, risk scores, and alerts

---

## Features

### Employee Experience
- ChatGPT-style AI assistant (DevAssist)
- Voice input via microphone
- Multilingual: English, Tanglish, Tamil Unicode
- Wellness check-in via webcam (optional, consent required)
- Chat history with sidebar navigation
- Privacy settings / consent management

### HR Dashboard
- Overview: total employees, active, high risk, critical risk
- Analytics tab: sentiment/stress/engagement trend charts
- Voice analytics: pitch, tempo, stress, confidence per employee
- Face analytics: emotion distribution across all employees
- Alerts: real-time high/critical risk notifications
- Employee detail: full risk breakdown, reasons, AI recommendations

### AI Analysis (background, employee never sees)
- Sentiment analysis on every message
- Stress level and engagement scoring
- Voice: pitch, RMS energy, tempo, silence ratio, stress/confidence
- Face: happy, sad, neutral, angry, surprise, fear
- Risk engine: burnout risk, quit risk, retention risk (0–100)
- AI-generated HR recommendations for high/critical risk employees

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register new account |
| POST | /auth/login | Login |
| GET | /auth/me | Current user profile |
| GET/PUT | /auth/consent | Get/update analysis consent |
| POST | /chat | Send chat message |
| GET | /conversations | List conversations |
| GET | /conversations/{id} | Get conversation messages |
| POST | /voice | Submit voice recording |
| POST | /face | Submit face snapshot |
| GET | /hr/dashboard | HR overview stats |
| GET | /hr/employees | All employees with risk data |
| GET | /hr/employees/{id} | Employee detail + recommendations |
| GET | /hr/analysis/trends | Sentiment/stress/engagement trends |
| GET | /hr/voice/summary | Voice analytics per employee |
| GET | /hr/face/summary | Face emotion distribution |
| GET | /hr/alerts | All alerts |
| PATCH | /hr/alerts/{id}/read | Mark alert as read |

---

## Privacy Design

- Employees **never** see sentiment scores, stress scores, risk levels, or analytics
- HR **never** sees full private conversation content — only aggregated insights
- All analytics require explicit employee consent
- Consent can be revoked at any time from settings

---

## Future RAG Integration

The codebase is prepared for RAG (Retrieval-Augmented Generation) via `app/modules/rag/`:
- `context.py` defines the `retrieve_context()` interface
- `generate_chat_reply()` in `chat/services.py` calls it automatically when enabled
- Activate by implementing the vector store in `rag/context.py`

---

## Project Structure

```
devguard/
├── backend/
│   ├── app/
│   │   ├── core/          config, security (JWT)
│   │   ├── db/            SQLAlchemy engine + session
│   │   ├── models/        all DB tables
│   │   ├── schemas/       auth Pydantic schemas
│   │   └── modules/
│   │       ├── auth/      register, login, consent
│   │       ├── chat/      Groq chatbot, analysis
│   │       ├── voice/     Whisper transcription, Librosa metrics
│   │       ├── face/      DeepFace emotion detection
│   │       ├── hr/        dashboard, analytics, alerts API
│   │       ├── risk/      burnout/quit/retention engine
│   │       └── rag/       future RAG integration
│   └── requirements.txt
└── frontend/
    └── src/
        ├── components/
        │   ├── chat/      Sidebar, ChatWindow, ChatInput, MessageBubble
        │   ├── voice/     VoiceButton
        │   ├── face/      FaceCapture
        │   ├── hr/        SentimentChart, VoiceMetricsTable, FaceEmotionChart
        │   └── shared/    RiskBadge
        ├── hooks/         useVoiceRecorder
        ├── pages/         Login, Register, Consent, Chat, HRDashboard, HREmployeeDetail
        ├── store/         authStore, chatStore (Zustand)
        ├── types/         TypeScript interfaces
        └── utils/         audio utilities
```