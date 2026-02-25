/**
 * Tests for the Admin Router — owner-only audit lead management procedures.
 *
 * Covers:
 *   1. getLeads — returns paginated leads (admin only)
 *   2. getStats — returns aggregate stats (admin only)
 *   3. deleteLead — removes a lead by ID (admin only)
 *   4. exportCsv — returns CSV string (admin only)
 *   5. Access control — non-admin and unauthenticated users are rejected
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ── Mock DB helpers ───────────────────────────────────────────────────────────
// Note: vi.mock is hoisted — all data must be inlined inside the factory.

vi.mock("./db", () => ({
  insertAuditLead: vi.fn().mockResolvedValue(undefined),
  getAuditLeads: vi.fn().mockResolvedValue({
    leads: [
      {
        id: 1,
        url: "https://smaidm.co.za",
        businessName: "SMAIDM",
        contactName: "Jardin Roestorff",
        email: "smaidmsagency@outlook.com",
        phone: "0822660899",
        overallScore: 72,
        seoScore: 22,
        sgoScore: 26,
        geoScore: 24,
        tier: "Developing Presence",
        isDemoMode: 0,
        createdAt: new Date("2026-02-01T10:00:00Z"),
      },
      {
        id: 2,
        url: "https://example.co.za",
        businessName: null,
        contactName: null,
        email: null,
        phone: null,
        overallScore: 38,
        seoScore: 12,
        sgoScore: 14,
        geoScore: 12,
        tier: "Minimal Presence",
        isDemoMode: 1,
        createdAt: new Date("2026-02-10T14:30:00Z"),
      },
    ],
    total: 2,
  }),
  getAuditLeadStats: vi.fn().mockResolvedValue({
    total: 2,
    withContact: 1,
    liveAudits: 1,
    avgScore: 72,
  }),
  deleteAuditLead: vi.fn().mockResolvedValue(undefined),
  getDailyStats: vi.fn().mockResolvedValue(
    Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - (29 - i));
      return {
        day: d.toISOString().slice(0, 10),
        count: i % 3 === 0 ? 2 : 0,
        avgScore: i % 3 === 0 ? 68 : null,
      };
    })
  ),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./webhooks", () => ({
  fireZapierWebhook: vi.fn().mockResolvedValue(undefined),
}));

// ── Context factories ─────────────────────────────────────────────────────────

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "owner-open-id",
      name: "Jardin Roestorff",
      email: "smaidmsagency@outlook.com",
      loginMethod: "oauth",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } satisfies User,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user-id",
      name: "Regular User",
      email: "user@example.com",
      loginMethod: "oauth",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } satisfies User,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("admin.getLeads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns paginated leads for admin user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.getLeads({ page: 1, limit: 25 });

    expect(result.leads).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
    expect(result.totalPages).toBe(1);
  });

  it("passes search parameter to db helper", async () => {
    const { getAuditLeads } = await import("./db");
    const caller = appRouter.createCaller(createAdminContext());

    await caller.admin.getLeads({ page: 1, limit: 25, search: "smaidm" });

    expect(getAuditLeads).toHaveBeenCalledWith(
      expect.objectContaining({ search: "smaidm" })
    );
  });

  it("calculates correct offset for page 2", async () => {
    const { getAuditLeads } = await import("./db");
    const caller = appRouter.createCaller(createAdminContext());

    await caller.admin.getLeads({ page: 2, limit: 10 });

    expect(getAuditLeads).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 10, limit: 10 })
    );
  });

  it("throws FORBIDDEN for non-admin authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());

    await expect(caller.admin.getLeads({ page: 1, limit: 25 })).rejects.toThrow();
  });

  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.admin.getLeads({ page: 1, limit: 25 })).rejects.toThrow();
  });
});

describe("admin.getStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns aggregate stats for admin user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const stats = await caller.admin.getStats();

    expect(stats.total).toBe(2);
    expect(stats.withContact).toBe(1);
    expect(stats.liveAudits).toBe(1);
    expect(stats.avgScore).toBe(72);
  });

  it("throws FORBIDDEN for non-admin user", async () => {
    const caller = appRouter.createCaller(createUserContext());

    await expect(caller.admin.getStats()).rejects.toThrow();
  });
});

describe("admin.deleteLead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls deleteAuditLead with the correct ID", async () => {
    const { deleteAuditLead } = await import("./db");
    const caller = appRouter.createCaller(createAdminContext());

    const result = await caller.admin.deleteLead({ id: 1 });

    expect(result.success).toBe(true);
    expect(deleteAuditLead).toHaveBeenCalledWith(1);
  });

  it("throws FORBIDDEN for non-admin user", async () => {
    const caller = appRouter.createCaller(createUserContext());

    await expect(caller.admin.deleteLead({ id: 1 })).rejects.toThrow();
  });

  it("rejects invalid (non-positive) IDs", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    await expect(caller.admin.deleteLead({ id: 0 })).rejects.toThrow();
    await expect(caller.admin.deleteLead({ id: -5 })).rejects.toThrow();
  });
});

describe("admin.getDailyStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 30 daily entries by default", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.getDailyStats({ days: 30 });

    expect(result).toHaveLength(30);
    expect(result[0]).toHaveProperty("day");
    expect(result[0]).toHaveProperty("count");
    expect(result[0]).toHaveProperty("avgScore");
  });

  it("passes the days parameter to the db helper", async () => {
    const { getDailyStats } = await import("./db");
    const caller = appRouter.createCaller(createAdminContext());

    await caller.admin.getDailyStats({ days: 14 });

    expect(getDailyStats).toHaveBeenCalledWith(14);
  });

  it("rejects days below 7", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    await expect(caller.admin.getDailyStats({ days: 3 })).rejects.toThrow();
  });

  it("rejects days above 90", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    await expect(caller.admin.getDailyStats({ days: 100 })).rejects.toThrow();
  });

  it("throws FORBIDDEN for non-admin user", async () => {
    const caller = appRouter.createCaller(createUserContext());

    await expect(caller.admin.getDailyStats({ days: 30 })).rejects.toThrow();
  });
});

describe("admin.exportCsv", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a CSV string with header row and data rows", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.exportCsv();

    expect(typeof result.csv).toBe("string");
    expect(result.csv).toContain("ID,URL,Business Name");
    expect(result.csv).toContain("smaidm.co.za");
    expect(result.count).toBe(2);
  });

  it("CSV contains correct number of rows (header + data)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.exportCsv();

    const rows = result.csv.trim().split("\n");
    // 1 header + 2 data rows
    expect(rows).toHaveLength(3);
  });

  it("marks demo mode correctly in CSV", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.exportCsv();

    expect(result.csv).toContain("Live");
    expect(result.csv).toContain("Demo");
  });

  it("throws FORBIDDEN for non-admin user", async () => {
    const caller = appRouter.createCaller(createUserContext());

    await expect(caller.admin.exportCsv()).rejects.toThrow();
  });
});
