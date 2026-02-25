import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database insert so tests don't need a real DB
vi.mock("./db", () => ({
  insertAuditLead: vi.fn().mockResolvedValue(undefined),
  getAuditLeads: vi.fn().mockResolvedValue([]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue(null),
}));

// Mock the notification helper
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("audit.run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure no AUDIT_API_URL is set so we always get demo mode in tests
    delete process.env.AUDIT_API_URL;
  });

  it("returns demo mode when AUDIT_API_URL is not configured", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const result = await caller.audit.run({
      url: "https://example.com",
      businessName: "Test Business",
      email: "test@example.com",
    });

    expect(result.isDemoMode).toBe(true);
    expect(result.data).toBeNull();
  });

  it("saves lead to database when email is provided", async () => {
    const { insertAuditLead } = await import("./db");
    const caller = appRouter.createCaller(createPublicContext());

    await caller.audit.run({
      url: "https://example.com",
      businessName: "SMAIDM Test",
      email: "jardin@smaidm.com",
    });

    expect(insertAuditLead).toHaveBeenCalledOnce();
    expect(insertAuditLead).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com",
        businessName: "SMAIDM Test",
        email: "jardin@smaidm.com",
        isDemoMode: 1,
      })
    );
  });

  it("does not save lead when no email or business name is provided", async () => {
    const { insertAuditLead } = await import("./db");
    const caller = appRouter.createCaller(createPublicContext());

    await caller.audit.run({
      url: "https://example.com",
    });

    expect(insertAuditLead).not.toHaveBeenCalled();
  });

  it("rejects invalid URLs", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.audit.run({ url: "not-a-url" })
    ).rejects.toThrow();
  });

  it("rejects invalid email addresses", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.audit.run({
        url: "https://example.com",
        email: "not-an-email",
      })
    ).rejects.toThrow();
  });

  it("notifies owner when email is provided", async () => {
    const { notifyOwner } = await import("./_core/notification");
    const caller = appRouter.createCaller(createPublicContext());

    await caller.audit.run({
      url: "https://smaidm.com",
      email: "client@business.com",
    });

    expect(notifyOwner).toHaveBeenCalledOnce();
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New AI Visibility Audit Lead",
      })
    );
  });
});
