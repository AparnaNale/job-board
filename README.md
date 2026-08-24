<div align="center">

# AI-Powered Job Board

**Round 1 Technical Assignment — Research Analyst, AlmaBetter R&D**

Aggregation → AI Tagging → Resume Matching → Conversational AI, in one deployed product.

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-000000?logo=nextdotjs)](.)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](.)
[![DB](https://img.shields.io/badge/Database-Postgres%20%2F%20Supabase-3ECF8E?logo=supabase)](.)
[![AI](https://img.shields.io/badge/AI-Google%20Gemini-8E75FF)](.)
[![Deploy](https://img.shields.io/badge/Deployed-Vercel%20%2B%20Render-black)](.)

**🔗 Deployment Web App Link:** _[paste your deployed Vercel URL here]_
**🎥 Explanation Video:** _[paste your Drive/YouTube link here — "Anyone with the link can view"]_

</div>

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Assignment Requirements → What's Implemented](#-assignment-requirements--whats-implemented)
- [Feature Summary](#-feature-summary)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [How the AI Components Work](#-how-the-ai-components-work)
- [Folder Structure](#-folder-structure)
- [API Reference](#-api-reference)
- [Setup / Run Instructions](#-setup--run-instructions)
- [Deployment](#-deployment)
- [Known Limitations & Trade-offs](#-known-limitations--trade-offs)
- [Security](#-security)

---

## 🧩 Project Overview

ProjectBoard aggregates job listings sourced from **LinkedIn, Naukri, Indeed, and Internshala** (from the
provided structured JSON dataset — no scraping was performed, per the assignment's constraint), deduplicates
them, uses an LLM to tag each listing with skills / role category / experience level, matches them against a
candidate's uploaded resume, and answers questions about any listing through a conversational AI assistant
that uses the *user's own* Gemini API key.

The goal wasn't just a working demo — it's a system that stays correct as the dataset grows: pagination
instead of loading everything into the browser, deterministic and explainable matching instead of a black-box
score, and graceful fallbacks everywhere the AI path could fail (bad key, quota, network error) so a feature
never hard-crashes just because AI wasn't available.

## ✅ Assignment Requirements → What's Implemented

| # | Brief requirement | Status | Where |
|---|---|---|---|
| 1 | Multi-platform job data integration from the provided JSON (no scraping) | ✅ | `backend/scripts/seed_data.py`, `services/dataset_parser.py` |
| 1 | Platform selector (LinkedIn / Naukri / Indeed / Internshala) | ✅ | `JobFilters.js`, `GET /api/jobs?platform=` |
| 1 | Deduplication logic | ✅ | `services/dedup.py` — SHA-256 hash of normalized title+company+location |
| 1 | Data stored & consistent across runs | ✅ | Postgres (Supabase) via SQLAlchemy, not re-parsed per request |
| 2 | AI-based job classification & tagging (skills, role, experience) | ✅ | `services/tagging.py` (Gemini) |
| 2 | Structured tags/filters for discovery | ✅ | `Job.tags`, `Job.experience_level`, facet endpoint |
| 3 | Resume upload → parsed profile | ✅ | `services/resume_parser.py` (PDF via pdfplumber, DOCX via python-docx) |
| 3 | Personalized "Recommended for You" | ✅ | `services/recommender.py`, `/resume` page |
| 4 | AI Job Assistant, user supplies their own Gemini key | ✅ | `services/gemini_client.py`, `routers/chat.py`, `ChatAssistant.js` |
| 4 | Answers "am I suitable", "what's missing", job comparisons, etc. | ✅ | Context-injected prompt (job + resume profile) |
| 5 | Working, publicly deployed product (not just screenshots) | ✅ | Frontend on Vercel, backend on Render |
| 5 | Handles missing/incomplete job data gracefully | ✅ | Nullable fields throughout `schemas.py`, defensive parsing |
| — | No secrets committed to the repo | ✅ | `.env` gitignored; user's Gemini key never persisted server-side |

## ✨ Feature Summary

- **Browse & filter** — platform dropdown, skill/tag filters, paginated listing (not "load everything and filter in the browser")
- **Job detail pages** with the AI assistant scoped to that specific listing
- **Resume matching** — upload once, get every open role scored against your actual skills, with the match reasoning explainable (not a black-box embedding score)
- **AI Job Assistant** — ask a listing directly: "Am I suitable?", "What's missing?", "How should I prepare?", compare two jobs
- **Accounts** — signup/login (JWT), saved jobs, application tracking
- **Deduplication** — the same internship posted on two platforms shows once, tagged with where it originated

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | FastAPI (Python), SQLAlchemy |
| Database | PostgreSQL (Supabase); SQLite fallback for local dev |
| Auth | Self-issued JWT (`python-jose`) + bcrypt password hashing |
| AI | Google Gemini API (`gemini-3.6-flash`) |
| Resume parsing | pdfplumber (PDF), python-docx (DOCX) |
| Deployment | Vercel (frontend), Render (backend) |

## 🏗️ Architecture

1. **Offline ingestion** (`scripts/seed_data.py`) — the provided JSON dataset is parsed, normalized, deduplicated
   (SHA-256 hash of title + company + location), AI-tagged via Gemini, and written to Postgres. Live API
   requests never touch the raw dataset — they query the already-processed table, so response times stay
   predictable regardless of dataset size.
2. **Browsing** — `/api/jobs` is paginated and filters (platform, tags, experience) run in the database via
   SQL, not in Python after fetching everything. `/api/jobs/facets` returns just the distinct platforms/tags
   so filter dropdowns don't need the full dataset either.
3. **Resume matching** — resume text is extracted, then profile extraction runs via Gemini if the user supplies
   a key, or falls back to deterministic keyword/synonym matching if not (or if the AI call fails for any
   reason). Either path produces a skills list that is overlap-scored against each job's tags — the *scoring*
   itself stays deterministic and explainable regardless of which extraction path ran.
4. **Chat assistant** — the user's Gemini key travels only in the request body; the relevant job/resume context
   is joined into the prompt server-side per request; nothing is persisted.
5. **Auth** — signup/login issue a JWT the frontend stores and sends as `Authorization: Bearer <token>`; routes
   like resume upload work anonymously too, but personalize the response when a valid token is present.

## 🤖 How the AI Components Work

| Component | When it runs | Model | Fallback if it fails |
|---|---|---|---|
| **Job tagging** | Offline, once, during dataset seeding | Gemini | N/A — batch job, re-run if needed |
| **Resume profile extraction** | On upload, only if user supplies a Gemini key | Gemini | Deterministic keyword/synonym matching |
| **Recommendation scoring** | Always, after either extraction path | None (pure logic) | — intentionally not AI, for explainability |
| **Chat assistant** | Per message | Gemini | Returns a clear error; never silently fails |

The **recommendation score itself is never AI** — it's `matched skills ∩ job tags / total job tags`, with noise
tags (role category, experience level labels) filtered out first, and both sides run through the same
`normalize_skill()` function so `"Node.js"` and `"nodejs"` aren't missed as unrelated. This was a deliberate
choice: the brief calls for the matching approach to be explainable in interview, so it's kept as simple,
auditable logic — only the *skill extraction* step (reading the resume) gets an AI option.

## 📁 Folder Structure

```
ai-job-board/
├── frontend/                      # Next.js (App Router) + Tailwind
│   ├── app/
│   │   ├── page.js                 # Home — hero, how-it-works, jobs strip, FAQ, CTA
│   │   ├── jobs/page.js            # Full job listing + filters
│   │   ├── jobs/[id]/page.js       # Job detail + AI assistant
│   │   ├── resume/page.js          # Resume upload → recommendations
│   │   ├── saved/page.js           # Saved jobs
│   │   ├── login/, signup/         # Auth pages
│   │   └── globals.css
│   ├── components/                 # JobCard, JobFilters, ChatAssistant, SiteHeader/Footer, ...
│   └── lib/                        # api.js (backend calls), auth.js
├── backend/                        # FastAPI
│   ├── main.py                     # App entrypoint, CORS, global error handler
│   ├── database.py                 # SQLAlchemy engine (Postgres, SQLite fallback)
│   ├── models.py                   # Job, User, Application, SavedJob, ResumeProfile
│   ├── schemas.py                  # Pydantic request/response models
│   ├── dependencies.py             # JWT auth dependencies
│   ├── routers/
│   │   ├── jobs.py                 # Browse, filter, apply
│   │   ├── resume.py               # Upload → parse → recommend
│   │   ├── chat.py                 # AI assistant
│   │   ├── auth.py                 # Signup / login / me
│   │   └── saved_jobs.py           # Save / unsave / list
│   ├── services/
│   │   ├── dataset_parser.py       # Raw dataset → normalized records
│   │   ├── dedup.py                # Hash-based deduplication
│   │   ├── tagging.py              # AI job tagging
│   │   ├── resume_parser.py        # Text extraction + AI/rule-based profile
│   │   ├── recommender.py          # Explainable overlap-scoring
│   │   ├── gemini_client.py        # Shared Gemini API wrapper
│   │   └── auth.py                 # Password hashing, JWT
│   ├── scripts/seed_data.py        # Load provided JSON → dedup → tag → DB
│   ├── requirements.txt
│   └── runtime.txt                 # Pins Python version for deployment
└── README.md
```

## 🔌 API Reference

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/jobs` | Paginated, filterable job listing |
| `GET` | `/api/jobs/facets` | Distinct platforms + top tags for filter UI |
| `GET` | `/api/jobs/{id}` | Single job detail |
| `POST` | `/api/jobs/{id}/apply` | Record an application (auth required) |
| `GET` | `/api/jobs/{id}/apply-status` | Whether the current user already applied |
| `POST` | `/api/resume/upload` | Upload resume → parsed profile + recommendations |
| `POST` | `/api/chat` | AI assistant message (job/resume context injected) |
| `POST` | `/api/auth/signup` / `/login` | Account creation / login (returns JWT) |
| `GET` | `/api/auth/me` | Current user from JWT |
| `GET` / `POST` / `DELETE` | `/api/saved-jobs` | List / save / unsave jobs (auth required) |

## ⚙️ Setup / Run Instructions

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                # fill in DATABASE_URL, JWT_SECRET_KEY
python scripts/seed_data.py --file path/to/jobs.json --api-key YOUR_GEMINI_KEY
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local    # set NEXT_PUBLIC_API_URL
npm run dev
```

## 🚀 Deployment

- **Frontend** — Vercel, Root Directory = `frontend`. Env var `NEXT_PUBLIC_API_URL` set to the live backend URL
  (Next.js inlines this at build time, so it must be set *before* deploying).
- **Backend** — Render, Root Directory = `backend`. Env vars: `DATABASE_URL` (Supabase Postgres), `JWT_SECRET_KEY`,
  `FRONTEND_ORIGIN` (the live Vercel URL, for CORS). A `runtime.txt` pins the Python version — recent Render
  default Python images can be newer than some pinned dependencies (`pydantic-core`) have prebuilt wheels for.
- **Database** — Supabase Postgres (falls back to local SQLite automatically if `DATABASE_URL` isn't set, for
  easy local development).

## ⚠️ Known Limitations & Trade-offs

- **Recommendation scoring is keyword-overlap, not semantic/embedding-based** — a deliberate trade-off for
  speed and, more importantly, explainability (the brief requires this to be defensible in interview).
- **AI tagging is offline/batch**, not real-time — newly added jobs need the seed script re-run.
- **The Gemini API key is the user's own** — its rate limits/quota are theirs, and it is used per-request, never
  stored.
- **Resume parsing is text-based** (pdfplumber / python-docx) — scanned/image-only resumes aren't OCR'd yet.
- **CORS currently supports one `FRONTEND_ORIGIN`** — fine for a single production URL; would need a small
  change (comma-separated origins) to also allow preview-deployment URLs.

## 🔒 Security

- No API keys, secrets, or credentials are committed to the repository — `.env` is gitignored, and `.env.example`
  files document required variables without values.
- The user's Gemini API key is sent only in the request body per chat/resume call and is **never persisted**
  to the database.
- Passwords are bcrypt-hashed; JWTs sign the session, not plaintext credentials.
- A global exception handler ensures unhandled backend errors still return a proper CORS-safe JSON response
  instead of a connection drop that shows up misleadingly as a CORS error in the browser.
