# SMAIDM SSG — AI Search Visibility Diagnostic Platform

> Evaluate how well a business is positioned for modern generative and answer-based search systems.

---

## What It Does

SMAIDM SSG audits any website across three core dimensions and produces a scored diagnostic report:

| Dimension | Max Score | What It Measures |
|-----------|-----------|-----------------|
| **SEO** | 30 pts | Title, meta description, H1, canonical, links, crawlability |
| **SGO** | 35 pts | Question-based headings, atomic answer blocks, structured data, readability |
| **GEO** | 35 pts | Entity signals, author authority, external citations, AI citation readiness |

**Grade scale:**

| Score | Grade |
|-------|-------|
| 80–100 | AI Ready |
| 65–79 | Developing |
| 50–64 | At Risk |
| 35–49 | Low Visibility |
| 0–34 | Invisible to AI |

---

## Repository Structure

```
smaidm-ssg/
├── backend/
│   ├── api/
│   │   └── main.py          # FastAPI app — POST /audit, GET /health
│   ├── scorer/
│   │   ├── engine.py        # Audit orchestrator
│   │   ├── parser.py        # HTML fetcher + signal extractor
│   │   ├── seo.py           # SEO dimension scorer (30 pts)
│   │   ├── sgo.py           # SGO dimension scorer (35 pts)
│   │   ├── geo.py           # GEO dimension scorer (35 pts)
│   │   └── tests/           # 28 unit tests (all passing)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                # React 19 + Vite + Tailwind 4 client
├── docs/
│   └── SPEC.md              # Scoring framework specification
├── render.yaml              # Render deployment config
└── README.md
```

---

## Running the Backend Locally

### Prerequisites

- Python 3.11+
- pip

### Install & Start

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.

### API Endpoints

```
GET  /health        — Health check
POST /audit         — Run a full AI visibility audit
GET  /docs          — Swagger UI (interactive API docs)
```

### Example Audit Request

```bash
curl -X POST http://localhost:8000/audit \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourbusiness.com", "business_name": "Your Business"}'
```

### Example Response

```json
{
  "url": "https://yourbusiness.com",
  "total_score": 47,
  "grade": "Low Visibility",
  "seo_score": 18,
  "sgo_score": 14,
  "geo_score": 15,
  "findings": [...],
  "top_gaps": [...],
  "audit_timestamp": "2025-02-24T12:00:00Z"
}
```

---

## Running the Frontend Locally

```bash
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

**To connect the frontend to your backend**, set the `VITE_API_BASE` environment variable:

```bash
# frontend/.env.local
VITE_API_BASE=http://localhost:8000
```

Without this variable, the frontend runs in **demo mode** — showing illustrative sample data so you can preview the UI without a running backend.

---

## Deploying the Backend

### Option A — Render (recommended, free tier)

1. Connect this repository to [render.com](https://render.com)
2. Create a new **Web Service** with these settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
   - **Environment:** Python 3.11
3. Add environment variable: `ALLOWED_ORIGINS=https://your-frontend-domain.manus.space`
4. Copy the deployed URL (e.g. `https://smaidm-ssg-api.onrender.com`)
5. Set `VITE_API_BASE` in the Manus frontend **Settings → Secrets** panel to that URL

### Option B — Railway

```bash
railway init
railway up --service backend
```

### Option C — Docker (any VPS)

```bash
cd backend
docker build -t smaidm-ssg-api .
docker run -p 8000:8000 -e ALLOWED_ORIGINS="*" smaidm-ssg-api
```

---

## Running Tests

```bash
cd backend
python -m pytest scorer/tests/ -v
```

28 tests, all passing. ✅

---

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_API_BASE` | Frontend `.env.local` | Backend API URL (leave empty for demo mode) |
| `ALLOWED_ORIGINS` | Backend env | Comma-separated allowed CORS origins (`*` for all) |
| `PYTHON_VERSION` | Render/Railway | Set to `3.11.0` |

---

## Sprint Roadmap

See [GitHub Issues](https://github.com/jardinr/smaidm-ssg/issues) for the full sprint plan.

| Sprint | Feature | Status |
|--------|---------|--------|
| 1 | Scoring engine, FastAPI backend, React frontend | ✅ Complete |
| 2 | Backend deployment, PDF report download, lead storage | Planned |
| 3 | Recommendations engine, competitor comparison mode | Planned |

---

## License

Proprietary — SMAIDM Digital Services. All rights reserved.
