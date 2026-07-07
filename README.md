# JanVikas AI

**Civic Intelligence Platform for Indore District Administration**

> Citizens report civic issues by voice in Hindi or English. AI clusters duplicate complaints, corroborates severity with government data, and produces equity-adjusted priority rankings for the MP's office.

---

## 🎯 Problem Statement

Urban governance suffers from fragmented citizen feedback — complaints arrive through disconnected channels, duplicate reports are counted individually, and under-represented wards with low literacy or connectivity are structurally disadvantaged in complaint-driven prioritization. **JanVikas AI** solves this by:

1. Accepting voice-first complaints in **Hindi and English**
2. Using **Gemini AI** to embed, cluster, and label duplicate reports into unified civic issues
3. Applying **equity-adjusted scoring** that boosts demand signals from low-literacy/low-connectivity wards
4. Corroborating severity with real **government data indicators** (UDISE+, NHM, ward infrastructure)
5. Delivering prioritized project recommendations to decision-makers

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15)                  │
│                                                          │
│  /submit         — Voice + text complaint intake (hi/en) │
│  /dashboard      — Clusters, Map, Priorities, Outbox     │
│                                                          │
│  React 19 · Tailwind CSS · Leaflet Maps · TypeScript     │
└─────────────────────────┬────────────────────────────────┘
                          │ REST API
┌─────────────────────────▼────────────────────────────────┐
│                   BACKEND (FastAPI)                       │
│                                                          │
│  /api/complaints  — POST: submit, GET: clusters/hotspots │
│  /api/analyze     — POST: full re-analysis pipeline      │
│  /api/priorities  — GET: equity-scored project rankings   │
│  /api/outbox      — GET: citizen notification queue       │
│  /api/localities  — GET: ward metadata                   │
│  /api/health      — GET: system health check             │
│                                                          │
│  Gemini Embeddings · Cosine Clustering · SQLModel/SQLite │
│  Backup LLM (Groq/Llama 3.3 70B) for generation         │
└──────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### Citizen-Facing
- **Voice-first input** — Tap to record; speaks in Hindi or English
- **Bilingual UI** — Full Hindi/English interface toggle
- **Photo attachments** — Upload evidence images with complaints
- **Instant feedback** — Complaint is clustered in real-time and citizen sees how many similar reports exist

### Intelligence Dashboard
- **Complaint Clusters** — AI-grouped civic issues with severity labels, category tags, and causal relationships
- **Hotspot Map** — Leaflet-powered geographic visualization of issue density
- **Priority Ranking** — Equity-adjusted project scoring with tunable weight sliders (demand × severity × feasibility)
- **Citizen Outbox** — Queued WhatsApp-style notifications back to complainants

### AI Pipeline
- **Gemini Embeddings** (`gemini-embedding-001`) — Batch-embeds all complaint texts
- **Greedy Agglomerative Clustering** — Pure-Python cosine similarity, no sklearn dependency
- **Gemini Flash Labeling** — One Flash call per cluster → label, category, severity, rationale
- **Causal Relation Inference** — One Flash call over all clusters to find causes/contributes_to/related_to links
- **Backup LLM Fallback** — Generation calls fail over to Groq/Llama 3.3 70B when Gemini is down

### Equity Engine
- **Participation Index** — `0.5 × literacy + 0.5 × connectivity` (floored at 0.35)
- **Equity-Adjusted Demand** — `citizen_count / participation_index` boosts under-represented wards up to ~2.86×
- **Corroborated Severity** — Government data multipliers: UDISE+ dropout rates (1.5×), NHM PHC density (1.4×), streetlight density (1.3×), low-connectivity proxy (1.2×)

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **Gemini API Key** ([Get one here](https://aistudio.google.com/apikey))

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start the server (auto-seeds demo data on first run)
uvicorn main:app --reload --port 8000
```

The backend automatically:
- Creates the SQLite database (`janvikas.db`)
- Seeds demo ward data, complaints, and proposed projects
- Attempts Gemini-powered clustering; falls back to precomputed clusters if Gemini is unavailable

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Default: NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔧 Environment Variables

### Backend (`.env`)

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | *(required)* | Google Gemini API key |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | CORS allowed origin |
| `SIMILARITY_THRESHOLD` | `0.82` | Cosine similarity threshold for clustering |
| `DATABASE_URL` | `sqlite:///./janvikas.db` | SQLAlchemy database URL |
| `LLM_API_KEY` | *(optional)* | Backup LLM API key (Groq, OpenAI-compatible) |
| `LLM_BASE_URL` | `https://api.groq.com/openai/v1` | Backup LLM base URL |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | Backup LLM model name |

### Frontend (`.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Backend API base URL. Leave empty for offline mock mode. |

---

## 📁 Project Structure

```
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Environment configuration
│   ├── database.py             # SQLModel engine & session
│   ├── models.py               # Data models (Ward, Complaint, Cluster, etc.)
│   ├── seed.py                 # Demo data seeder with Gemini fallback
│   ├── seed_data/              # JSON seed files (wards, complaints, projects)
│   ├── routers/
│   │   ├── complaints.py       # POST /complaints, GET /clusters, GET /hotspots
│   │   ├── analysis.py         # POST /analyze, GET /priorities, GET /outbox
│   │   └── meta.py             # GET /health, GET /localities
│   ├── services/
│   │   ├── ai.py               # Gemini embed, cluster, label, relations, outbox
│   │   ├── scoring.py          # Equity-adjusted demand & corroborated severity
│   │   └── dedup.py            # Citizen deduplication by phone number
│   └── tests/
│       ├── conftest.py         # Test fixtures & mocks
│       ├── test_ai.py          # AI service unit tests
│       ├── test_endpoints.py   # API endpoint integration tests
│       └── test_scoring.py     # Scoring engine unit tests
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with header/footer
│   │   ├── page.tsx            # Landing redirect
│   │   ├── globals.css         # Global styles & design tokens
│   │   ├── submit/page.tsx     # Citizen complaint intake form
│   │   └── dashboard/          # MP dashboard views
│   ├── components/
│   │   ├── VoiceInput.tsx      # Web Speech API voice recorder
│   │   ├── CategoryIconGrid.tsx# Category selection grid
│   │   ├── ClustersView.tsx    # Cluster list with drawer
│   │   ├── ClusterCard.tsx     # Individual cluster card
│   │   ├── ClusterDrawer.tsx   # Cluster detail slide-over
│   │   ├── HotspotMap.tsx      # Leaflet map with hotspot markers
│   │   ├── MapView.tsx         # Map container component
│   │   ├── PrioritiesView.tsx  # Priority project rankings
│   │   ├── PriorityCard.tsx    # Priority project card
│   │   ├── WeightSliders.tsx   # Demand/severity/feasibility sliders
│   │   ├── OutboxView.tsx      # Citizen notification outbox
│   │   ├── OutboxList.tsx      # Outbox message list
│   │   ├── StatBar.tsx         # Dashboard stats bar
│   │   └── ...                 # Additional UI components
│   ├── lib/
│   │   ├── api.ts              # API client functions
│   │   ├── types.ts            # TypeScript interfaces (mirrors API contract)
│   │   ├── scoring.ts          # Client-side weight calculation
│   │   └── ui.ts               # UI utility helpers
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
└── .gitignore
```

---

## 🧪 Running Tests

```bash
cd backend

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run a specific test file
pytest tests/test_scoring.py
```

---

## 🛡️ Design Principles

| Principle | Implementation |
|---|---|
| **Never 500 on Gemini failure** | Every AI call has a try/except + deterministic fallback |
| **No raw phone numbers leak** | Phone is masked (`98XXXXX210`) before leaving the DB layer |
| **No sklearn/numpy** | Pure-Python cosine similarity and clustering |
| **Idempotent seeding** | `seed_if_empty()` checks for existing data before inserting |
| **Client-side weight sliders** | Raw scores returned from API; weighting happens in the browser |
| **Offline-capable frontend** | Leave `NEXT_PUBLIC_API_URL` empty to run against local mock JSON |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Maps** | Leaflet + react-leaflet |
| **Backend** | FastAPI, SQLModel, SQLite |
| **AI** | Google Gemini (embeddings + Flash generation) |
| **Backup LLM** | Groq / Llama 3.3 70B (OpenAI-compatible fallback) |
| **Testing** | pytest, ruff (linting), pre-commit, detect-secrets |

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health + complaint/cluster counts |
| `GET` | `/api/localities` | List all wards with demographic metadata |
| `POST` | `/api/complaints` | Submit a complaint (JSON or multipart with photo) |
| `GET` | `/api/clusters` | List clusters, optionally filtered by locality, paginated |
| `GET` | `/api/hotspots` | Map hotspots (cluster locations + severity) |
| `POST` | `/api/analyze` | Re-run the full AI analysis pipeline (demo reset) |
| `GET` | `/api/priorities` | Equity-scored project rankings |
| `GET` | `/api/outbox` | Queued citizen notifications |

---

## 👥 Team

Built for the **GDG × Hack2Skill** Hackathon.

---

## 📄 License

This project was created for a hackathon submission. Please contact the team for licensing inquiries.