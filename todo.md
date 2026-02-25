# SMAIDM SSG Platform — TODO

## Phase 1: MVP Frontend & Scoring Engine
- [x] Deep navy Visibility Engine design system (Syne + Inter + JetBrains Mono)
- [x] Hero section with animated badge and headline
- [x] Audit form (URL, business name, email)
- [x] Score gauge SVG component with animated fill
- [x] Dimension bars (SEO / SGO / GEO)
- [x] Finding cards with severity levels
- [x] Top gaps section
- [x] Demo mode fallback (mock audit data when backend unavailable)
- [x] AuditResults component with CTA

## Phase 2: Backend Scoring Engine
- [x] Python FastAPI backend (POST /audit, GET /health)
- [x] SEO scorer module
- [x] SGO scorer module (atomic answer detection, readability)
- [x] GEO scorer module (entity signals, structured data)
- [x] HTML parser module
- [x] Scoring engine orchestrator
- [x] 28 unit tests — all passing
- [x] Dockerfile + render.yaml for deployment

## Phase 3: Database & Lead Capture
- [x] Upgrade to web-db-user (MySQL + tRPC + Express)
- [x] audit_leads table in Drizzle schema
- [x] DB migration applied (pnpm db:push)
- [x] insertAuditLead helper in server/db.ts
- [x] getAuditLeads helper for admin dashboard

## Phase 4: Live Backend Integration
- [x] tRPC audit.run procedure (proxies to Python backend)
- [x] Graceful demo mode fallback in tRPC procedure
- [x] Lead saved to DB on every audit submission
- [x] Owner notification on new lead (notifyOwner)
- [x] Frontend wired to tRPC audit.run mutation
- [x] 7 vitest tests — all passing

## Phase 5: Branding & Contact Details
- [x] SMAIDM logo in nav (CDN hosted)
- [x] Email corrected to smaidmsagency@outlook.com
- [x] Footer: Jardin Roestorff · Founder, SMAIDM
- [x] Phone: 082 266 0899
- [x] Website link: https://quzllhzj.manus.space/
- [x] YouTube link: http://www.youtube.com/@SMAIDM

## Phase 6: GitHub & Project Board
- [x] smaidm-ssg repo created (public)
- [x] 6 Git commits with checkpoint tags
- [x] 8 GitHub issues created (Sprint 1–3)

## Pending / Next Steps
- [ ] Deploy Python backend to Render/Railway (set AUDIT_API_URL secret)
- [ ] Set AUDIT_API_URL in Manus Secrets to enable live audits
- [ ] Add Calendly booking link to CTA button
- [ ] Admin dashboard to view audit leads (DB table viewer)
- [ ] PDF report download (branded one-page export)
- [ ] Refine SGO/GEO scoring weights based on real audit data

## Railway Deployment Fix
- [ ] Add railway.json to backend/ with correct build/start commands
- [ ] Add nixpacks.toml to backend/ to pin Python version
- [ ] Push fix to GitHub so Railway rebuild succeeds

## Phase 7: Zapier Email Notification
- [ ] Add ZAPIER_WEBHOOK_URL secret to Manus Secrets
- [x] Add fireZapierWebhook() helper in server/webhooks.ts
- [x] Wire Zapier webhook call into audit.run procedure after lead is saved
- [x] Add vitest test for webhook helper
- [ ] Save checkpoint
