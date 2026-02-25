/**
 * Admin Router — owner-only procedures for the audit leads dashboard.
 *
 * All procedures use `adminProcedure` which enforces:
 *   1. The user must be authenticated (valid session cookie)
 *   2. The user's role must be "admin" (set automatically for the platform owner)
 *
 * Non-admin users receive a FORBIDDEN error; unauthenticated users receive UNAUTHORIZED.
 */

import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { deleteAuditLead, getAuditLeadStats, getAuditLeads } from "../db";

export const adminRouter = router({
  /**
   * Paginated list of audit leads with optional full-text search.
   * Returns leads sorted newest-first with a total count for pagination.
   */
  getLeads: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(25),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;
      const result = await getAuditLeads({
        limit: input.limit,
        offset,
        search: input.search || undefined,
      });
      return {
        leads: result.leads,
        total: result.total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(result.total / input.limit),
      };
    }),

  /**
   * Aggregate stats for the dashboard header cards.
   */
  getStats: adminProcedure.query(async () => {
    return getAuditLeadStats();
  }),

  /**
   * Delete a single audit lead by ID.
   */
  deleteLead: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await deleteAuditLead(input.id);
      return { success: true };
    }),

  /**
   * Export all leads as a CSV-formatted string.
   * Returns the raw CSV text; the client triggers a file download.
   */
  exportCsv: adminProcedure.query(async () => {
    const result = await getAuditLeads({ limit: 10000 });
    const leads = result.leads;

    const headers = [
      "ID",
      "URL",
      "Business Name",
      "Contact Name",
      "Email",
      "Phone",
      "Overall Score",
      "SEO Score",
      "SGO Score",
      "GEO Score",
      "Tier",
      "Mode",
      "Created At",
    ];

    const rows = leads.map(lead => [
      lead.id,
      lead.url,
      lead.businessName ?? "",
      lead.contactName ?? "",
      lead.email ?? "",
      lead.phone ?? "",
      lead.overallScore ?? "",
      lead.seoScore ?? "",
      lead.sgoScore ?? "",
      lead.geoScore ?? "",
      lead.tier ?? "",
      lead.isDemoMode ? "Demo" : "Live",
      lead.createdAt.toISOString(),
    ]);

    const escape = (v: unknown) => {
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const csv = [headers, ...rows]
      .map(row => row.map(escape).join(","))
      .join("\n");

    return { csv, count: leads.length };
  }),
});
