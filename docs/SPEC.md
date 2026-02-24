# SMAIDM SSG Scoring Framework Specification

Version: 1.0 — Lean MVP
Total Score: 100 points

---

## Dimension Weights

| Dimension | Points |
|-----------|--------|
| SEO       | 30     |
| SGO       | 35     |
| GEO       | 35     |

---

## 1. SEO Dimension (30 Points)

### 1.1 Title Tag (5 pts)
- Exists: +3
- Length 30–65 chars: +2
- Missing: 0

### 1.2 Meta Description (5 pts)
- Exists: +3
- Length 70–160 chars: +2
- Missing: 0

### 1.3 H1 Structure (5 pts)
- Exactly one H1: +5
- Multiple H1s: +2
- None: 0

### 1.4 Canonical Tag (5 pts)
- Present: +5
- Missing: 0

### 1.5 Internal Linking (5 pts)
- ≥5 internal links: +5
- 1–4 links: +2
- 0 links: 0

### 1.6 Crawlability (5 pts)
- robots.txt not blocking: +3
- Sitemap detected: +2

---

## 2. SGO Dimension (35 Points)

SGO measures readiness for answer engines (Perplexity, Google SGE, ChatGPT Browse).

### 2.1 Question-Based Headings (10 pts)
Detection: H2 or H3 tags ending in "?"

- ≥3 question headings: +10
- 1–2: +5
- 0: 0

### 2.2 Atomic Answer Structure (10 pts)
Definition: A heading immediately followed by a concise direct answer paragraph (30–100 words) before extended content.

Detection logic:
- Paragraph immediately after a heading
- Word count between 30–100
- No excessive nested markup

Scoring:
- ≥3 atomic answer blocks: +10
- 1–2: +5
- 0: 0

### 2.3 Structured Data Clarity (10 pts)
Detection: JSON-LD `<script>` tags

- ≥1 valid schema type present: +5
- Business-related schema (LocalBusiness, Organization, Product, Service): +5
- None: 0

### 2.4 Readability (5 pts)
Approximated Flesch Reading Ease score.

- Score 50–70: +5
- Score 30–49: +2
- Score <30: 0

---

## 3. GEO Dimension (35 Points)

GEO measures generative engine citation readiness (how likely an LLM is to cite or surface this business).

### 3.1 Entity Signals (10 pts)
Detection: Presence of business identity markers on the page.

Signals checked:
- Business name in content
- Physical address
- Phone number
- Email address
- Social profile links (LinkedIn, Twitter/X, Facebook, Instagram)

Scoring:
- 4–5 signals present: +10
- 2–3 signals: +5
- 0–1 signals: 0

### 3.2 Consistency Signals (5 pts)
Same business name appearing consistently in:
- Title tag
- H1
- Footer text

- Consistent across ≥2 locations: +5
- Inconsistent or absent: 0

### 3.3 Authority Indicators (10 pts)
Detection:
- HTTPS: +3
- About page link detected: +3
- Testimonials or reviews section detected: +4

### 3.4 Content Depth (5 pts)
Homepage word count:
- >800 words: +5
- 400–799 words: +3
- <400 words: 0

### 3.5 AI Citation Readiness (5 pts)
Detection of structural clarity signals:
- Presence of lists (ul/ol)
- Presence of tables
- Defined service/product descriptions (sections with headers + short descriptions)

- ≥3 structural clarity signals: +5
- 1–2: +2
- 0: 0

---

## Severity Classification

| Severity | Score Impact |
|----------|-------------|
| Critical | ≥10 points  |
| High     | 5–9 points  |
| Medium   | 2–4 points  |
| Low      | 1 point     |

---

## Grade Thresholds

| Score    | Grade           |
|----------|-----------------|
| 90–100   | AI Ready        |
| 75–89    | Competitive     |
| 60–74    | At Risk         |
| 40–59    | Weak Structure  |
| Below 40 | Invisible to AI |

---

## Report Structure

1. Executive Summary
2. Total Score + Grade
3. SEO Breakdown
4. SGO Breakdown
5. GEO Breakdown
6. Top 3 Critical Gaps (shown free)
7. Full Findings (gated — email required)
8. Strategic Recommendation

---

## API Contract (Phase 1)

### Request
```
POST /audit
Content-Type: application/json

{
  "url": "string",
  "business_name": "string (optional)",
  "email": "string (optional)",
  "industry": "string (optional)"
}
```

### Response
```json
{
  "url": "string",
  "total_score": 0,
  "grade": "string",
  "seo_score": 0,
  "sgo_score": 0,
  "geo_score": 0,
  "findings": [
    {
      "dimension": "SEO | SGO | GEO",
      "criterion": "string",
      "issue": "string",
      "severity": "Critical | High | Medium | Low",
      "points_lost": 0
    }
  ],
  "top_gaps": ["string", "string", "string"],
  "audit_timestamp": "ISO 8601 string"
}
```
