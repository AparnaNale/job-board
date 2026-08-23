# AI-Powered Job Board

**Deployed Prototype:** _[paste your Vercel link here]_
**Explanation Video:** _[paste your Drive video link here — set access to "Anyone with the link"]_

## Project Overview

This is an AI-powered job board that aggregates jobs from LinkedIn, Naukri,
Indeed, and Internshala (using the provided structured JSON dataset), tags
them by skills/role/experience using AI, generates personalized
recommendations from an uploaded resume, and provides a job-specific AI
chat assistant.

## Feature Summary

- Platform-wise job browsing (dropdown filter: LinkedIn / Naukri / Indeed / Internshala)
- Skill-tag based filtering
- Hash-based deduplication (in the offline seed script)
- AI (Gemini) based job tagging — skills, role category, experience level
- Resume upload (PDF/DOCX) → profile extraction (AI/Gemini if a key is given, else
  rule-based keyword matching) → "Recommended for You"
- Conversational AI assistant (using the user's own Gemini API key)
- Deployed: Frontend (Vercel) + Backend (Render) + DB (Supabase)

## Technology Stack

| Layer      | Tech                                  |
|------------|----------------------------------------|
| Frontend   | Next.js (App Router) + Tailwind CSS   |
| Backend    | FastAPI (Python)                      |
| Database   | Supabase (Postgres)                   |
| AI         | Google Gemini API                      |
| Resume parsing | pdfplumber, python-docx           |
| Deployment | Vercel (frontend), Render (backend)   |

## Folder Structure

```
ai-job-board/
├── frontend/                  # Next.js + Tailwind
│   ├── app/
│   │   ├── page.js            # Home - job listing + filters
│   │   ├── layout.js
│   │   ├── globals.css
│   │   ├── jobs/[id]/page.js  # Job detail page
│   │   └── resume/page.js     # Resume upload page
│   ├── components/
│   │   ├── JobCard.js
│   │   ├── JobFilters.js
│   │   ├── ResumeUpload.js
│   │   └── ChatAssistant.js
│   ├── lib/api.js             # Centralized backend calls
│   ├── tailwind.config.js
│   └── package.json
├── backend/                    # FastAPI
│   ├── main.py                 # App entrypoint, CORS, routers
│   ├── database.py
│   ├── models.py                # Job, ResumeProfile tables
│   ├── schemas.py
│   ├── routers/
│   │   ├── jobs.py              # GET /api/jobs, /api/jobs/{id}
│   │   ├── resume.py            # POST /api/resume/upload
│   │   └── chat.py              # POST /api/chat
│   ├── services/
│   │   ├── dedup.py             # Hash-based deduplication
│   │   ├── tagging.py           # AI job tagging
│   │   ├── resume_parser.py     # Text extraction + AI profile
│   │   ├── recommender.py       # Skill-overlap match scoring
│   │   └── gemini_client.py     # Shared Gemini API wrapper
│   ├── scripts/
│   │   └── seed_data.py         # Load provided JSON → dedup → tag → DB
│   └── requirements.txt
└── README.md
```

## Setup / Run Instructions

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # fill in DATABASE_URL
python scripts/seed_data.py --file path/to/jobs.json --api-key YOUR_GEMINI_KEY
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Architecture / Implementation Approach

1. **Data ingestion:** The provided JSON dataset is processed by an offline
   script (`scripts/seed_data.py`) — normalized, deduplicated via hash, and
   AI-tagged — then saved to the DB. Live API requests never process the
   raw dataset (fast + predictable).
2. **Deduplication:** title + company + location are normalized and hashed
   with SHA-256; a record whose hash already exists is skipped.
3. **AI tagging:** each job description is sent to Gemini and structured
   JSON (skills, role_category, experience_level) is extracted and saved
   into the `tags` column.
4. **Recommendations:** when a resume is uploaded, its text is extracted.
   If a Gemini key is supplied, AI-based profile extraction runs (skills +
   summary + experience level); if no key is given, or the AI call fails
   (invalid key / quota / network error), it automatically falls back to
   rule-based keyword matching. Either way, the resulting skills are
   overlap-scored against job tags (deterministic, explainable) to produce
   the top matches.
5. **Chat assistant:** the user's own Gemini key is sent in the request
   body; job/resume context is joined into the prompt; the key is never
   stored on the server.

## How the AI Components Work

- **Tagging:** offline, one-time, batch — run while loading the dataset.
- **Resume profile:** at upload time. If a Gemini key is given, Gemini is
  called for AI-based extraction; if no key is given, or the Gemini call
  fails (invalid key, quota, network error), it automatically falls back
  to rule-based keyword matching — the upload never crashes (graceful
  degradation).
- **Recommendations:** a deterministic overlap-scoring formula (candidate
  skills ∩ job tags) / total job tags — explainable, not embedding-based.
- **Chat:** a per-message Gemini call, with job/resume context injected
  into the prompt.

## Known Limitations / Trade-offs

- Recommendation scoring is simple keyword-overlap, not semantic
  similarity (embeddings) — a trade-off made for speed and explainability.
- AI tagging is offline/batch, so newly added jobs need a re-run (not
  real-time).
- The Gemini API key is the user's own — rate limits/quota are theirs.
- Resume parsing works for text-based PDF/DOCX; scanned/image-only resumes
  aren't OCR'd (future improvement).

## Security

- No API keys or secrets are committed to the repo (`.env` is gitignored).
- The user's Gemini key is only sent in the request body and is never
  persisted to the database.