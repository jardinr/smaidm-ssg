# SMAIDM SSG Platform

**AI Search Visibility Diagnostic Engine**

SMAIDM SSG audits websites for readiness across three dimensions of modern search:

- **SEO** — Traditional search fundamentals
- **SGO** — Search Generative Optimization (answer engine readiness)
- **GEO** — Generative Engine Optimization (AI citation readiness)

The platform functions as a **lead generation funnel**: users receive a free AI Visibility Score, and the full diagnostic report converts them into consulting clients.

---

## Architecture

```
smaidm-ssg/
├── backend/
│   ├── scorer/          # Pure Python scoring engine (no web framework dependency)
│   │   ├── seo.py       # SEO dimension scorer
│   │   ├── sgo.py       # SGO dimension scorer
│   │   ├── geo.py       # GEO dimension scorer
│   │   ├── engine.py    # Orchestrator — runs all scorers, produces final result
│   │   └── tests/       # Unit tests per scoring rule
│   ├── api/
│   │   └── main.py      # FastAPI app — POST /audit endpoint
│   └── requirements.txt
├── frontend/            # React + Vite client-facing UI
├── docs/
│   ├── SPEC.md          # Scoring framework specification
│   └── ARCHITECTURE.md  # Technical architecture reference
└── README.md
```

---

## Scoring Model

| Dimension | Weight |
|-----------|--------|
| SEO       | 30 pts |
| SGO       | 35 pts |
| GEO       | 35 pts |
| **Total** | **100 pts** |

### Grade Thresholds

| Score    | Grade              |
|----------|--------------------|
| 90–100   | AI Ready           |
| 75–89    | Competitive        |
| 60–74    | At Risk            |
| 40–59    | Weak Structure     |
| Below 40 | Invisible to AI    |

---

## Quick Start (Backend)

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload
```

API available at: `http://127.0.0.1:8000/docs`

---

## Development Roadmap

| Checkpoint | Module | Status |
|---|---|---|
| 1 | Scoring Engine (scorer/) | ✅ |
| 2 | FastAPI Backend (api/) | ✅ |
| 3 | React Frontend | ✅ |
| 4 | Frontend ↔ Backend Integration | ✅ |

---

## Phase 2 (Post-MVP)

- Email capture + automated follow-up sequence
- PDF report export
- Authentication + dashboard
- Stripe for paid full reports
- Google Search Console integration
- AI-generated recommendations (LLM)
