import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { insertAuditLead } from "./db";
import { notifyOwner } from "./_core/notification";
import { fireZapierWebhook } from "./webhooks";
import { sendEmail, buildAuditReportHtml, buildAuditReportText } from "./email";
import { z } from "zod";
import { aiMentionsRouter } from "./routers/aiMentions";
import { adminRouter } from "./routers/admin";

// Python FastAPI backend URL — set AUDIT_API_URL env var to point to deployed backend
const AUDIT_API_URL = process.env.AUDIT_API_URL ?? "";

// ── Score tier helpers ────────────────────────────────────────────────────────

function getTierLabel(score: number | null): string {
  if (score === null) return "Unknown";
  if (score >= 90) return "AI-Ready (A)";
  if (score >= 75) return "Good (B)";
  if (score >= 50) return "Moderate (C)";
  if (score >= 25) return "Poor (D)";
  return "Critical (F)";
}

function getUpgradeCost(score: number | null): string {
  if (score === null) return "R 9,500 once-off";
  if (score >= 90) return "R 1,200/mo monitoring";
  if (score >= 75) return "R 3,500 once-off + R 1,200/mo";
  if (score >= 50) return "R 6,500 once-off + R 1,200/mo";
  if (score >= 25) return "R 9,500 once-off + R 1,200/mo";
  return "R 12,500 once-off + R 1,500/mo";
}

/** 48-hour urgency rate — 20% discount on the once-off component */
function getUrgentCost(score: number | null): string {
  if (score === null) return "R 7,600 once-off";
  if (score >= 90) return "R 960/mo monitoring";
  if (score >= 75) return "R 2,800 once-off + R 1,200/mo";
  if (score >= 50) return "R 5,200 once-off + R 1,200/mo";
  if (score >= 25) return "R 7,600 once-off + R 1,200/mo";
  return "R 10,000 once-off + R 1,500/mo";
}

function buildOwnerNotification(params: {
  url: string;
  businessName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  overallScore: number | null;
  seoScore: number | null;
  sgoScore: number | null;
  geoScore: number | null;
  tier: string;
  upgradeCost: string;
  isDemoMode: boolean;
}): { title: string; content: string } {
  const {
    url, businessName, contactName, email, phone,
    overallScore, seoScore, sgoScore, geoScore,
    tier, upgradeCost, isDemoMode,
  } = params;
  const displayName = contactName ?? businessName ?? "Anonymous visitor";
  const hasContact = email || phone;
  const urgentCost = getUrgentCost(overallScore);
  // Sales urgency signal based on score
  const urgencySignal = overallScore === null ? "⚠️ Demo mode"
    : overallScore < 25 ? "🔴 CRITICAL — high-value lead, act within 24hrs"
    : overallScore < 50 ? "🟠 HIGH PRIORITY — strong upgrade potential"
    : overallScore < 75 ? "🟡 MEDIUM PRIORITY — targeted fixes available"
    : overallScore < 90 ? "🟢 LOW PRIORITY — close to AI-ready, small win"
    : "✅ AI-READY — monitoring upsell opportunity";
  const title = hasContact
    ? `🔔 New Lead: ${displayName} audited ${url}`
    : `👁 Anonymous audit: ${url}`;
  const followUp = buildFollowUpDraft(url, contactName, businessName, email, phone, overallScore, tier, upgradeCost);
  const content = [
    "═══════════════════════════════════════",
    "  SMAIDM SSG — NEW AUDIT LEAD",
    "═══════════════════════════════════════",
    `  URGENCY: ${urgencySignal}`,
    "",
    "── CLIENT DETAILS ──────────────────────",
    `  Name:     ${contactName ?? "Not provided"}`,
    `  Business: ${businessName ?? "Not provided"}`,
    `  Email:    ${email ?? "Not provided"}`,
    `  Phone:    ${phone ?? "Not provided"}`,
    "",
    "── FULL AUDIT RESULTS ──────────────────",
    `  Website:  ${url}`,
    `  Score:    ${overallScore ?? "Demo mode"}/100 — Grade ${tier}`,
    `  SEO:      ${seoScore ?? "—"}/100  (Search Discoverability)`,
    `  SGO:      ${sgoScore ?? "—"}/100  (AI Answer Readiness)`,
    `  GEO:      ${geoScore ?? "—"}/100  (Business Trust & Authority)`,
    `  Mode:     ${isDemoMode ? "Demo (backend offline)" : "Live audit"}`,
    "",
    "── INVESTMENT ────────────────────────",
    `  Standard rate:  ${upgradeCost}`,
    `  24-hr rate:     ${urgentCost}  ← 20% discount if booked today`,
    "",
    followUp,
  ].join("\n");
  return { title, content };
}

function buildFollowUpDraft(
  url: string,
  contactName: string | null,
  businessName: string | null,
  email: string | null,
  phone: string | null,
  score: number | null,
  tier: string,
  upgradeCost: string
): string {
  const siteName = businessName ?? url.replace(/https?:\/\/(www\.)?/, "").split("/")[0];
  const greeting = contactName ? `Hi ${contactName},` : "Hi,";
  const replyTo = email ? `Reply to: ${email}` : "";
  const callAt = phone ? `Or call: ${phone}` : "";

  return `
─── PERSONALISED FOLLOW-UP DRAFT ───────

Subject: Your AI visibility score for ${siteName}: ${score ?? "Demo"}/100

${greeting}
${replyTo}
${callAt}

I noticed ${siteName} just ran an AI visibility audit on the SMAIDM platform.

Your current score is ${score ?? "N/A"}/100 — Grade ${tier}.

${
    score === null
      ? "The audit ran in demo mode. A live audit will reveal your actual score."
      : score >= 90
      ? "Great news — your site is already AI-ready. Monthly monitoring keeps it there."
      : score >= 75
      ? "You're close to the AI-recommended tier. A few targeted fixes will get you there."
      : score >= 50
      ? "AI engines can find you but aren't recommending you. Structured data and FAQ content are the key gaps."
      : score >= 25
      ? "Your site is visible but not being cited by ChatGPT, Perplexity, or Google SGE. Schema markup and content structure are the priority fixes."
      : "Your site is effectively invisible to AI search engines. This is fixable in 2–4 weeks."
  }

Investment to reach the next tier: ${upgradeCost}

SALocations.com went from 26/100 to 62/100 in a single session — happy to show you the same for ${siteName}.

Would a 15-minute call this week work?

Jardin Roestorff
SMAIDM | 082 266 0899 | smaidmsagency@outlook.com
─── END DRAFT ───────────────────────────`.trim();
}

function buildClientReportEmail(params: {
  url: string;
  businessName: string | null;
  contactName: string | null;
  overallScore: number | null;
  seoScore: number | null;
  sgoScore: number | null;
  geoScore: number | null;
  tier: string;
  upgradeCost: string;
  isDemoMode: boolean;
}): string {
  const {
    url, businessName, contactName,
    overallScore, seoScore, sgoScore, geoScore,
    tier, upgradeCost, isDemoMode,
  } = params;

  const siteName = businessName ?? url.replace(/https?:\/\/(www\.)?/, "").split("/")[0];
  const greeting = contactName ? `Hi ${contactName},` : "Hi,";

  return `
${greeting}

Thank you for running your free AI Visibility Audit on the SMAIDM SSG Platform.

Here is your full report for ${siteName} (${url}):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OVERALL SCORE:  ${overallScore ?? "Demo"}/100 — Grade ${tier}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SEO Fundamentals:          ${seoScore ?? "—"}/100
  SGO (Search Generative):   ${sgoScore ?? "—"}/100
  GEO (Generative Engine):   ${geoScore ?? "—"}/100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${isDemoMode ? "Note: This was a demo audit. A live audit will analyse your actual website signals.\n\n" : ""}WHAT THIS MEANS FOR YOUR BUSINESS

${
    overallScore === null || isDemoMode
      ? "Your live audit will reveal exactly which AI visibility signals are missing and what to fix first."
      : overallScore >= 90
      ? "Your site is AI-ready — ChatGPT, Perplexity, and Google SGE can find and recommend you. Monthly monitoring ensures you stay there."
      : overallScore >= 75
      ? "You're close to being AI-recommended. A few targeted fixes to your structured data and content structure will push you into the top tier."
      : overallScore >= 50
      ? "AI engines can find your site but are not actively recommending it. The key gaps are structured data (schema markup) and question-based content architecture."
      : overallScore >= 25
      ? "Your site is visible in traditional search but largely invisible to AI engines like ChatGPT and Perplexity. Schema markup, entity signals, and FAQ content are the priority fixes."
      : "Your site is effectively invisible to AI search engines. This is fully fixable — most clients see a 30–40 point improvement in the first session."
  }

INVESTMENT TO REACH THE NEXT TIER

${upgradeCost}

NEXT STEP

Book a free 15-minute strategy call to see exactly what we would fix and what the result looks like:
→ smaidmsagency@outlook.com
→ 082 266 0899

Jardin Roestorff
Founder, SMAIDM Digital Services
AI Search Visibility Specialist
`.trim();
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  aiMentions: aiMentionsRouter,
  admin: adminRouter,

  audit: router({
    /**
     * Run a live AI visibility audit.
     * - Proxies to the Python FastAPI backend if AUDIT_API_URL is configured.
     * - Falls back to demo mode when backend is unavailable.
     * - ALWAYS saves the lead and fires owner notification (even anonymous visitors).
     * - Notification includes full client details: name, email, phone, score breakdown, follow-up draft.
     * - Sends client their own full report email if they provided an email address.
     * - Also fires Zapier webhook for email automation to smaidmsagency@outlook.com.
     */
    run: publicProcedure
      .input(
        z.object({
          url: z.string().url("Please enter a valid URL"),
          businessName: z.string().optional(),
          contactName: z.string().optional(),
          email: z.string().email("Please enter a valid email").optional(),
          phone: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        let auditResult: Record<string, unknown> | null = null;
        let isDemoMode = !AUDIT_API_URL;
        if (isDemoMode) {
          // Demo mode: no backend configured — save lead, notify owner, fire webhook, return null data
          const tier = "Demo";
          const upgradeCost = "R 9,500 once-off + R 1,200/mo";
          await insertAuditLead({
            url: input.url,
            businessName: input.businessName ?? null,
            contactName: input.contactName ?? null,
            email: input.email ?? null,
            phone: input.phone ?? null,
            overallScore: null,
            seoScore: null,
            sgoScore: null,
            geoScore: null,
            tier,
            isDemoMode: 1,
          }).catch((err) => { console.error("[Audit] DB insert failed (non-fatal):", err); });
          const { title: demoTitle, content: demoContent } = buildOwnerNotification({
            url: input.url,
            businessName: input.businessName ?? null,
            contactName: input.contactName ?? null,
            email: input.email ?? null,
            phone: input.phone ?? null,
            overallScore: null,
            seoScore: null,
            sgoScore: null,
            geoScore: null,
            tier,
            upgradeCost,
            isDemoMode: true,
          });
          await notifyOwner({ title: demoTitle, content: demoContent }).catch(() => {});
          const followUpDraft = buildFollowUpDraft(
            input.url, input.contactName ?? null, input.businessName ?? null,
            input.email ?? null, input.phone ?? null, null, tier, upgradeCost
          );
          await fireZapierWebhook({
            email: input.email ?? null,
            businessName: input.businessName ?? null,
            contactName: input.contactName ?? null,
            phone: input.phone ?? null,
            url: input.url,
            overallScore: null,
            seoScore: null,
            sgoScore: null,
            geoScore: null,
            tier,
            upgradeCost,
            isDemoMode: true,
            followUpDraft,
            submittedAt: new Date().toISOString(),
          }).catch(() => {});
          return { isDemoMode: true, data: null };
        }
        try {
          const response = await fetch(`${AUDIT_API_URL}/audit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: input.url,
              business_name: input.businessName ?? "",
              email: input.email ?? "",
            }),
            signal: AbortSignal.timeout(30_000),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error((errData as { detail?: string }).detail ?? `Audit API error ${response.status}`);
          }

          auditResult = await response.json() as Record<string, unknown>;
        } catch (err) {
          console.error("[Audit] Backend call failed:", err);
          const message = err instanceof Error ? err.message : "Unexpected error";
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `We couldn't complete the audit for this URL. ${message}`,
          });
        }

        // Extract scores from result
        const scores = auditResult as {
          overall_score?: number;
          total_score?: number;
          seo?: { score?: number };
          sgo?: { score?: number };
          geo?: { score?: number };
          tier?: string;
        } | null;

        const overallScore = scores?.overall_score ?? scores?.total_score ?? null;
        const seoScore = scores?.seo?.score ?? null;
        const sgoScore = scores?.sgo?.score ?? null;
        const geoScore = scores?.geo?.score ?? null;
        const tier = getTierLabel(overallScore);
        const upgradeCost = getUpgradeCost(overallScore);

        // ── Save lead to database (non-blocking, fires on every audit) ──────
        await insertAuditLead({
          url: input.url,
          businessName: input.businessName ?? null,
          contactName: input.contactName ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          overallScore: overallScore,
          seoScore: seoScore,
          sgoScore: sgoScore,
          geoScore: geoScore,
          tier: tier,
          isDemoMode: isDemoMode ? 1 : 0,
        }).catch((err) => {
          console.error("[Audit] DB insert failed (non-fatal):", err);
        });

        // ── Notify owner via Manus in-app notification (EVERY audit) ────────
        const { title: notifTitle, content: notifContent } = buildOwnerNotification({
          url: input.url,
          businessName: input.businessName ?? null,
          contactName: input.contactName ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          overallScore,
          seoScore,
          sgoScore,
          geoScore,
          tier,
          upgradeCost,
          isDemoMode,
        });

        await notifyOwner({
          title: notifTitle,
          content: notifContent,
        }).catch(() => {}); // non-fatal

        // ── Send client their full report email via Resend API (Phase 16) ──
        if (input.email) {
          const offerExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
          const urgentCost = getUrgentCost(overallScore);
          const regularCost = upgradeCost;
          const emailHtml = buildAuditReportHtml({
            url: input.url,
            businessName: input.businessName ?? null,
            contactName: input.contactName ?? null,
            overallScore,
            seoScore,
            sgoScore,
            geoScore,
            tier,
            regularCost,
            urgentCost,
            isDemoMode,
            offerExpiresAt,
          });
          const emailText = buildAuditReportText({
            url: input.url,
            businessName: input.businessName ?? null,
            contactName: input.contactName ?? null,
            overallScore,
            seoScore,
            sgoScore,
            geoScore,
            tier,
            regularCost,
            urgentCost,
            isDemoMode,
            offerExpiresAt,
          });
          const siteName = input.businessName ?? input.url.replace(/https?:\/\/(www\.)?/, "").split("/")[0];
          await sendEmail({
            to: input.email,
            subject: `Your AI Visibility Audit Report — ${siteName} (${overallScore ?? "Demo"}/100)`,
            html: emailHtml,
            text: emailText,
          }).catch((err) => {
            console.error("[Audit] Resend email failed (non-fatal):", err);
          });
        }

        // ── Fire Zapier webhook → email to smaidmsagency@outlook.com ────────
        const followUpDraft = buildFollowUpDraft(
          input.url,
          input.contactName ?? null,
          input.businessName ?? null,
          input.email ?? null,
          input.phone ?? null,
          overallScore,
          tier,
          upgradeCost
        );

        await fireZapierWebhook({
          email: input.email ?? null,
          businessName: input.businessName ?? null,
          contactName: input.contactName ?? null,
          phone: input.phone ?? null,
          url: input.url,
          overallScore: overallScore,
          seoScore: seoScore,
          sgoScore: sgoScore,
          geoScore: geoScore,
          tier: tier,
          upgradeCost: upgradeCost,
          isDemoMode,
          followUpDraft: followUpDraft,
          submittedAt: new Date().toISOString(),
        }).catch(() => {}); // non-fatal

        return {
          isDemoMode,
          data: auditResult,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
