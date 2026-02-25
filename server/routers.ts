import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { insertAuditLead } from "./db";
import { notifyOwner } from "./_core/notification";
import { z } from "zod";

// Python FastAPI backend URL — set AUDIT_API_URL env var to point to deployed backend
const AUDIT_API_URL = process.env.AUDIT_API_URL ?? "";

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
     * - Falls back to a structured error so the frontend can use demo mode.
     * - Always saves the lead to the database (non-fatal if DB is unavailable).
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
            // Signal to frontend to use demo mode
            isDemoMode = true;
          }
        } else {
          isDemoMode = true;
        }

        // Save lead to database (non-blocking)
        if (input.email || input.businessName) {
          const scores = auditResult as {
            overall_score?: number;
            seo?: { score?: number };
            sgo?: { score?: number };
            geo?: { score?: number };
            tier?: string;
          } | null;

          await insertAuditLead({
            url: input.url,
            businessName: input.businessName ?? null,
            email: input.email ?? null,
            overallScore: scores?.overall_score ?? null,
            seoScore: scores?.seo?.score ?? null,
            sgoScore: scores?.sgo?.score ?? null,
            geoScore: scores?.geo?.score ?? null,
            tier: scores?.tier ?? null,
            isDemoMode: isDemoMode ? 1 : 0,
          });

          // Notify owner of new lead
          if (input.email) {
            await notifyOwner({
              title: `New AI Visibility Audit Lead`,
              content: `${input.email} just audited ${input.url}${input.businessName ? ` (${input.businessName})` : ""}. Score: ${scores?.overall_score ?? "demo"}/100.`,
            }).catch(() => {}); // non-fatal
          }
        }

        return {
          isDemoMode,
          data: auditResult,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
