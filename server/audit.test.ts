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

// Mock the Zapier webhook so tests don't make real HTTP calls
vi.mock("./webhooks", () => ({
  fireZapierWebhook: vi.fn().mockResolvedValue(undefined),
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

describe("AUDIT_API_URL secret validation", () => {
  it("can reach the live Railway backend health endpoint", async () => {
    const url = "https://smaidm-ssg-api-production.up.railway.app/health";
    const res = await fetch(url);
    expect(res.ok).toBe(true);
    const body = await res.json() as { status: string };
    expect(body.status).toBe("ok");
  });
});

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

  it("saves lead to database for every audit — including anonymous visitors", async () => {
    const { insertAuditLead } = await import("./db");
    const caller = appRouter.createCaller(createPublicContext());

    // Anonymous visitor — no email, no business name
    await caller.audit.run({ url: "https://example.com" });

    expect(insertAuditLead).toHaveBeenCalledOnce();
    expect(insertAuditLead).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com",
        email: null,
        businessName: null,
        isDemoMode: 1,
      })
    );
  });

  it("saves lead with email and business name when provided", async () => {
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

  it("notifies owner on EVERY audit — even anonymous visitors", async () => {
    const { notifyOwner } = await import("./_core/notification");
    const caller = appRouter.createCaller(createPublicContext());

    // Anonymous visitor
    await caller.audit.run({ url: "https://anonymous-visitor.com" });

    expect(notifyOwner).toHaveBeenCalledOnce();
    // Title should indicate anonymous visit
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("anonymous-visitor.com"),
      })
    );
  });

  it("includes personalised follow-up draft in owner notification", async () => {
    const { notifyOwner } = await import("./_core/notification");
    const caller = appRouter.createCaller(createPublicContext());

    await caller.audit.run({
      url: "https://filmset.co.za",
      email: "info@filmset.co.za",
      businessName: "FilmSet",
    });

    expect(notifyOwner).toHaveBeenCalledOnce();
    const call = (notifyOwner as ReturnType<typeof vi.fn>).mock.calls[0][0] as { title: string; content: string };
    expect(call.content).toContain("PERSONALISED FOLLOW-UP DRAFT");
    expect(call.content).toContain("filmset.co.za");
    expect(call.content).toContain("info@filmset.co.za");
  });

  it("fires Zapier webhook on every audit with upgrade cost and follow-up draft", async () => {
    const { fireZapierWebhook } = await import("./webhooks");
    const caller = appRouter.createCaller(createPublicContext());

    await caller.audit.run({
      url: "https://thecallsheet.co.za",
      email: "editor@thecallsheet.co.za",
    });

    expect(fireZapierWebhook).toHaveBeenCalledOnce();
    expect(fireZapierWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://thecallsheet.co.za",
        email: "editor@thecallsheet.co.za",
        upgradeCost: expect.any(String),
        followUpDraft: expect.stringContaining("PERSONALISED FOLLOW-UP DRAFT"),
      })
    );
  });

  it("rejects invalid URLs", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.audit.run({ url: "not-a-url" })).rejects.toThrow();
  });

  it("rejects invalid email addresses", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.audit.run({ url: "https://example.com", email: "not-an-email" })
    ).rejects.toThrow();
  });
});
