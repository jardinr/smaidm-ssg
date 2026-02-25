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

    expect(fireZapierWebhook).toHaveBeenCalled();
    const zapierCalls = vi.mocked(fireZapierWebhook).mock.calls;
    const matchingCall = zapierCalls.find(c =>
      c[0].url === "https://thecallsheet.co.za" &&
      c[0].email === "editor@thecallsheet.co.za"
    );
    expect(matchingCall).toBeDefined();
    expect(matchingCall![0].upgradeCost).toBeTruthy();
    expect(matchingCall![0].followUpDraft).toContain("PERSONALISED FOLLOW-UP DRAFT");
  }, 15_000);

  it("saves contactName and phone to DB when provided", async () => {
    const { insertAuditLead } = await import("./db");
    const caller = appRouter.createCaller(createPublicContext());

    await caller.audit.run({
      url: "https://salocations.com",
      contactName: "Jardin Roestorff",
      phone: "+27822660899",
      email: "jardinr@gmail.com",
      businessName: "SALocations",
    });

    expect(insertAuditLead).toHaveBeenCalledWith(
      expect.objectContaining({
        contactName: "Jardin Roestorff",
        phone: "+27822660899",
      })
    );
  });

  it("includes phone and contactName in owner notification content", async () => {
    const { notifyOwner } = await import("./_core/notification");
    const caller = appRouter.createCaller(createPublicContext());

    await caller.audit.run({
      url: "https://filmcapetown.co.za",
      contactName: "Jane Smith",
      phone: "+27831234567",
      email: "jane@filmcapetown.co.za",
    });

    const notifyCalls = vi.mocked(notifyOwner).mock.calls;
    const matchingCall = notifyCalls.find(c =>
      c[0].title.includes("Jane Smith") || c[0].content.includes("Jane Smith")
    );
    expect(matchingCall).toBeDefined();
    expect(matchingCall![0].content).toContain("+27831234567");
    expect(matchingCall![0].content).toContain("Jane Smith");
  }, 15_000);

  it("includes contactName and phone in Zapier webhook payload", async () => {
    const { fireZapierWebhook } = await import("./webhooks");
    const caller = appRouter.createCaller(createPublicContext());

    await caller.audit.run({
      url: "https://example.com",
      contactName: "Test User",
      phone: "+27800000000",
      email: "test@example.com",
    });

    expect(fireZapierWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        contactName: "Test User",
        phone: "+27800000000",
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
