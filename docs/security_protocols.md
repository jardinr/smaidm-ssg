# SMAIDM SSG Platform — Security Protocols

> **Document Status:** Living document — auto-generated from platform build.
> **Last Updated:** 2026-03-30
> **Maintained by:** SMAIDM Agency (`smaidmsagency@outlook.com`)

---

## Overview

This document catalogues every security protocol implemented across the SMAIDM SSG Platform. It serves as the authoritative reference for the forthcoming **Cybersecurity Portal** and as an internal audit trail for all protective measures in place.

---

## 1. Helmet HTTP Security Headers

**File:** `server/_core/index.ts`
**Implementation:** `helmet` middleware applied globally at server startup.

The platform uses the [Helmet](https://helmetjs.github.io/) Express middleware to set a comprehensive suite of HTTP security headers on every response.

| Header / Directive | Value / Policy |
|---|---|
| `Content-Security-Policy` | `defaultSrc 'self'`; scripts from self + inline + eval + Google Fonts; styles from self + inline + Google Fonts; fonts from gstatic + data; images from self + data + https; connect to self + Resend API + Zapier; frames: none; objects: none |
| `X-Content-Type-Options` | `nosniff` (prevents MIME-type sniffing) |
| `X-Frame-Options` | Controlled via CSP `frameSrc: 'none'` |
| `Strict-Transport-Security` | Enforced by Helmet default (HSTS) |
| `Cross-Origin-Resource-Policy` | `same-origin` |

```typescript
// server/_core/index.ts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://fonts.googleapis.com"],
        styleSrc:  ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc:   ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc:    ["'self'", "data:", "https:"],
        connectSrc:["'self'", "https://api.resend.com", "https://hooks.zapier.com"],
        frameSrc:  ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-origin" },
  })
);
```

---

## 2. Rate Limiting

**File:** `server/_core/index.ts`
**Implementation:** `express-rate-limit` applied to audit and AI mentions endpoints.

Rate limiting prevents abuse, scraping, and brute-force lead-generation attacks against the platform's most resource-intensive endpoints.

| Parameter | Value |
|---|---|
| Window | 15 minutes |
| Max requests per IP | 20 |
| Headers standard | `draft-7` (RateLimit-Policy) |
| Legacy headers | Disabled |
| Skipped routes | `NODE_ENV === 'development'` and `/health` |
| Protected routes | `/api/trpc/audit.run`, `/api/trpc/aiMentions.analyse` |

```typescript
// server/_core/index.ts
const auditRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many audit requests from this IP. Please wait 15 minutes before trying again." },
  skip: (req) => process.env.NODE_ENV === "development" || req.path === "/health",
});
app.use("/api/trpc/audit.run", auditRateLimit);
app.use("/api/trpc/aiMentions.analyse", auditRateLimit);
```

---

## 3. BCC Owner on All Client Emails

**File:** `server/routers.ts`, `server/email.ts`
**Implementation:** Every transactional email sent to a client automatically BCC's the owner mailbox.

This ensures the owner always retains a copy of every report delivered, providing an audit trail and enabling follow-up without relying solely on the database.

```typescript
// server/routers.ts — line ~452
// BCC owner on every client report so SSG mailbox always receives a copy
bcc: ["smaidmsagency@outlook.com"],
```

```typescript
// server/email.ts
interface EmailOptions {
  /** Optional BCC list — owner is always BCC'd on client report emails */
  bcc?: string[];
}
// BCC is conditionally included in every Resend API call
...(opts.bcc && opts.bcc.length > 0 ? { bcc: opts.bcc } : {}),
```

---

## 4. `isOwnerTest` Flag

**File:** `server/routers.ts`, `server/email.ts`
**Implementation:** Boolean flag passed in the `audit.run` tRPC input schema.

When `isOwnerTest: true` is set, the platform runs a full audit cycle for internal testing **without** creating any real side-effects. This is a critical data-integrity and anti-pollution control.

| Behaviour | `isOwnerTest: false` (default) | `isOwnerTest: true` |
|---|---|---|
| Lead saved to DB | Yes | **No** |
| Zapier webhook fired | Yes | **No** |
| Discount countdown started | Yes | **No** |
| Email delivered | Yes (client + BCC) | Yes (test only, orange-themed) |
| Email subject prefix | Normal | `[OWNER TEST]` prefix |
| Email footer colour | Teal (`#0D2B1F`) | Orange (`#1A1A2E`) |

```typescript
// server/routers.ts
isOwnerTest: z.boolean().optional().default(false),
// ...
if (!input.isOwnerTest) await insertAuditLead({ ... });
if (!input.isOwnerTest) { /* fire Zapier webhook */ }
if (input.email && !input.isOwnerTest) { /* send client email */ }
if (input.isOwnerTest) { /* send internal test email */ }
```

---

## 5. NDA / IP Protection Framework

**File:** `docs/agency_white_label_pack.md`
**Implementation:** Legal framework governing all white-label partnerships.

All agency partnerships and white-label arrangements are governed by a mutual Non-Disclosure Agreement (NDA) with explicit IP protection clauses. No platform access, pricing, or technical details are disclosed to prospective partners until the NDA is signed.

> *"All white-label partnerships are governed by a mutual Non-Disclosure Agreement with clear non-compete and IP clauses to protect both parties."*
> — `agency_white_label_pack.md`

**Tiered Disclosure Model:** Information is released in stages:

| Stage | Condition | Information Released |
|---|---|---|
| Pre-NDA | Public | Marketing overview, general capabilities |
| Post-NDA | Signed mutual NDA | Live demo, sample branded report, full pricing tiers |
| Partnership | Contract signed | Full white-label access, technical integration docs |

---

## 6. Tiered Disclosure Model

**File:** `todo.md` (Phase 8), `docs/agency_white_label_pack.md`
**Implementation:** Score-based pricing tiers with controlled information release.

The platform implements a five-band tiered scoring system (0–24, 25–49, 50–74, 75–89, 90–100) that gates pricing and upgrade-path information. Clients only see the tier relevant to their audit score, preventing full pricing exposure and enabling targeted upsell.

| Score Band | Tier Label | Disclosure Level |
|---|---|---|
| 0–24 | Critical | Full remediation package shown |
| 25–49 | Poor | Improvement roadmap shown |
| 50–74 | Moderate | Optimisation options shown |
| 75–89 | Good | Enhancement tier shown |
| 90–100 | Excellent | Maintenance tier shown |

---

## 7. RESEND_API_KEY Management

**Files:** `render.yaml`, `server/email.ts`, `scripts/daily_health_check.py`
**Implementation:** API key injected via environment variable; never hardcoded in application logic.

| Concern | Implementation |
|---|---|
| Storage | `render.yaml` `sync: false` (Render dashboard secret) |
| Runtime injection | `process.env.RESEND_API_KEY` |
| Fallback behaviour | Email silently skipped; warning logged; no crash |
| Health check validation | Check 1 of 10 in `daily_health_check.py` |
| Key rotation | Manual — update in Render dashboard and re-deploy |

> **Note:** The `onboarding@resend.dev` sandbox FROM address used in `daily_health_check.py` requires a verified Resend account. HTTP 403 responses indicate the API key lacks send permission for this domain. **Action required:** Verify a custom sending domain in the Resend dashboard and update `FROM_ADDRESS` in `scripts/daily_health_check.py`.

---

## 8. Daily Health Check System

**File:** `scripts/daily_health_check.py`
**Implementation:** Autonomous 10-point daily check covering all critical platform systems.

The health check script runs daily and reports results to `smaidmsagency@outlook.com` via Resend. If email delivery fails, the report is saved to `logs/health_YYYY-MM-DD.txt` as a fallback.

| Check # | Check Name | Pass Condition |
|---|---|---|
| 1 | RESEND_API_KEY configured | Key present in environment |
| 2 | Resend API reachable | HTTP 200 from `api.resend.com` |
| 3 | TypeScript compiles cleanly | 0 type errors |
| 4 | All tests passing | Vitest suite exits 0 |
| 5 | Live platform responding | HTTP response from Render URL |
| 6 | Audit API responding | HTTP 200 from `/health` endpoint |
| 7 | Database reachable | `DATABASE_URL` set and connectable |
| 8 | No uncommitted changes | Git working tree clean |
| 9 | No unpushed commits | All commits pushed to origin |
| 10 | Required env vars set | All 5 required vars present |
| 11 | render.yaml declares all secrets | All keys declared in `render.yaml` |

**Current Status (2026-03-30):** 8/11 checks passing. See [Known Issues](#known-issues--remediation-actions) below.

---

## 9. Admin Dashboard Access Control

**File:** `server/routers.ts` (admin router), `client/` (AdminDashboard page)
**Implementation:** Role-based access control on all admin tRPC procedures.

The admin dashboard is protected at both the API and UI layers:
- All admin tRPC procedures use `adminProcedure` which validates `user.role === 'admin'`
- Unauthenticated users are redirected to the sign-in prompt
- Non-admin authenticated users receive a 403 response
- The admin nav link in `Home.tsx` is conditionally rendered only for admin users

---

## 10. Body Size Limits

**File:** `server/_core/index.ts`
**Implementation:** Express body parser limits set to 1MB.

```typescript
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));
```

This prevents large-payload denial-of-service attacks. The limit was deliberately reduced from a previous 50MB default, as no file uploads are required on this platform.

---

## Known Issues & Remediation Actions

| Issue | Severity | Root Cause | Recommended Fix |
|---|---|---|---|
| Audit API returning HTTP 404 on `/health` | **High** | `smaidm-ssg-api` Render service may be stopped or failed to deploy | Check Render dashboard → `smaidm-ssg-api` service logs; redeploy if needed |
| `DATABASE_URL` not set in health check environment | **High** | Secret not injected into the CI/health check runner context | Add `DATABASE_URL` to Render environment secrets and ensure it is available at runtime |
| Missing env vars: `JWT_SECRET`, `AUDIT_API_URL`, `VITE_APP_ID` | **Medium** | Secrets not yet configured in Render dashboard | Add all four missing secrets via Render dashboard → Environment tab |
| Health check email failing with HTTP 403 | **Medium** | `onboarding@resend.dev` sandbox FROM address not authorised for this API key | Verify a custom domain in Resend dashboard; update `FROM_ADDRESS` in `scripts/daily_health_check.py` |

---

## Cybersecurity Portal — Planned Scope

This document forms the foundation for the **SMAIDM Cybersecurity Portal**, a dedicated internal/client-facing portal that will:

1. Display live health check status with pass/fail indicators
2. Document all security protocols in a searchable, categorised interface
3. Provide an audit trail of daily health check runs
4. Surface remediation guidance for any failing checks
5. Host the NDA/IP protection framework and tiered disclosure policy
6. Manage RESEND_API_KEY and other secret rotation workflows
7. Provide a security score for the platform itself

> **Action Required:** Confirm with SMAIDM to proceed with building the Cybersecurity Portal from this document.

---

*Generated autonomously by the SMAIDM SSG daily health check playbook — 2026-03-30.*
