import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { insertAuditLead } from "./db";
import { notifyOwner } from "./_core/notification";
import { fireZapierWebhook } from "./webhooks";
import { z } from "zod";

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

function buildFollowUpDraft(
  url: string,
  businessName: string | null,
  email: string | null,
  score: number | null,
  tier: string,
  upgradeCost: string
): string {
  const name = businessName ?? url.replace(/https?:\/\/(www\.)?/, "").split("/")[0];
  const hasEmail = email && email.length > 0;

  return `
--- PERSONALISED FOLLOW-UP DRAFT ---

Subject: Your AI visibility score for ${name}: ${score ?? "Demo"}/100

Hi${hasEmail ? ` — reply to: ${email}` : " (anonymous visitor)"},

I noticed ${name} just ran an AI visibility audit on the SMAIDM platform.

Your current score is ${score ?? "N/A"}/100 — Grade ${tier}.

What this means: ${
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

I'd love to show you exactly what we'd fix and what the result looks like — SALocations.com went from 26/100 to 62/100 in a single session as proof.

Would a 15-minute call this week work?

Jardin Roestorff
SMAIDM | 082 266 0899 | smaidmsagency@outlook.com
--- END DRAFT ---
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

  audit: router({
    /**
     * Run a live AI visibility audit.
     * - Proxies to the Python FastAPI backend if AUDIT_API_URL is configured.
     * - Falls back to demo mode when backend is unavailable.
     * - ALWAYS saves the lead and fires owner notification (even anonymous visitors).
     * - Notification includes full score breakdown + personalised follow-up pitch draft.
     * - Also fires Zapier webhook for email automation to smaidmsagency@outlook.com.
     */
    run: publicProcedure
      .input(
        z.object({
          url: z.string().url("Please enter a valid URL"),
          businessName: z.string().optional(),
          email: z.string().email("Please enter a valid email").optional(),
        })
      )
      .mutation(async ({ input }) => {
        let auditResult: Record<string, unknown> | null = null;
        let isDemoMode = false;

        if (AUDIT_API_URL) {
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
            isDemoMode = true;
          }
        } else {
          isDemoMode = true;
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
          email: input.email ?? null,
          overallScore: overallScore,
          seoScore: seoScore,
          sgoScore: sgoScore,
          geoScore: geoScore,
          tier: tier,
          isDemoMode: isDemoMode ? 1 : 0,
        }).catch((err) => {
          console.error("[Audit] DB insert failed (non-fatal):", err);
        });

        // ── Build follow-up pitch draft ──────────────────────────────────────
        const followUpDraft = buildFollowUpDraft(
          input.url,
          input.businessName ?? null,
          input.email ?? null,
          overallScore,
          tier,
          upgradeCost
        );

        // ── Notify owner via Manus in-app notification (EVERY audit) ────────
        const notifTitle = input.email
          ? `🔔 New Lead: ${input.email} audited ${input.url}`
          : `👁 Anonymous audit: ${input.url}`;

        const notifContent = [
          `URL: ${input.url}`,
          `Business: ${input.businessName ?? "Not provided"}`,
          `Email: ${input.email ?? "Anonymous visitor"}`,
          `Score: ${overallScore ?? "Demo mode"}/100 — ${tier}`,
          `SEO: ${seoScore ?? "—"} | SGO: ${sgoScore ?? "—"} | GEO: ${geoScore ?? "—"}`,
          `Mode: ${isDemoMode ? "Demo (backend offline)" : "Live audit"}`,
          `Investment to next tier: ${upgradeCost}`,
          "",
          followUpDraft,
        ].join("\n");

        await notifyOwner({
          title: notifTitle,
          content: notifContent,
        }).catch(() => {}); // non-fatal

        // ── Fire Zapier webhook → email to smaidmsagency@outlook.com ────────
        await fireZapierWebhook({
          email: input.email ?? null,
          businessName: input.businessName ?? null,
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
