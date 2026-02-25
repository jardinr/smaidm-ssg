/**
 * Tests for the Zapier webhook helper (server/webhooks.ts)
 *
 * These tests verify that:
 *   1. fireZapierWebhook() silently skips when ZAPIER_WEBHOOK_URL is not set
 *   2. fireZapierWebhook() sends a correctly structured POST when the URL is set
 *   3. fireZapierWebhook() swallows network errors without throwing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireZapierWebhook, type AuditLeadPayload } from "./webhooks";

const SAMPLE_PAYLOAD: AuditLeadPayload = {
  email: "test@example.com",
  businessName: "Test Business",
  url: "https://example.com",
  overallScore: 72,
  seoScore: 80,
  sgoScore: 65,
  geoScore: 70,
  tier: "B",
  isDemoMode: false,
  submittedAt: "2026-02-25T10:00:00.000Z",
};

describe("fireZapierWebhook", () => {
  let originalFetch: typeof global.fetch;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalEnv = process.env.ZAPIER_WEBHOOK_URL;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEnv === undefined) {
      delete process.env.ZAPIER_WEBHOOK_URL;
    } else {
      process.env.ZAPIER_WEBHOOK_URL = originalEnv;
    }
    vi.restoreAllMocks();
  });

  it("skips silently when ZAPIER_WEBHOOK_URL is not set", async () => {
    delete process.env.ZAPIER_WEBHOOK_URL;
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof global.fetch;

    await fireZapierWebhook(SAMPLE_PAYLOAD);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends a POST request with JSON payload when webhook URL is configured", async () => {
    process.env.ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/test/abc123/";

    const mockResponse = { ok: true, status: 200 } as Response;
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
    global.fetch = fetchSpy as unknown as typeof global.fetch;

    await fireZapierWebhook(SAMPLE_PAYLOAD);

    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hooks.zapier.com/hooks/catch/test/abc123/");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({ "Content-Type": "application/json" });

    const body = JSON.parse(options.body as string) as AuditLeadPayload;
    expect(body.email).toBe("test@example.com");
    expect(body.url).toBe("https://example.com");
    expect(body.overallScore).toBe(72);
    expect(body.tier).toBe("B");
  });

  it("does not throw when the webhook returns a non-OK status", async () => {
    process.env.ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/test/abc123/";

    const mockResponse = { ok: false, status: 500 } as Response;
    global.fetch = vi.fn().mockResolvedValue(mockResponse) as unknown as typeof global.fetch;

    // Should resolve without throwing
    await expect(fireZapierWebhook(SAMPLE_PAYLOAD)).resolves.toBeUndefined();
  });

  it("does not throw when fetch itself throws a network error", async () => {
    process.env.ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/test/abc123/";

    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof global.fetch;

    // Should resolve without throwing
    await expect(fireZapierWebhook(SAMPLE_PAYLOAD)).resolves.toBeUndefined();
  });

  it("includes isDemoMode and submittedAt in the payload", async () => {
    process.env.ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/test/abc123/";

    const mockResponse = { ok: true, status: 200 } as Response;
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
    global.fetch = fetchSpy as unknown as typeof global.fetch;

    const demoPayload: AuditLeadPayload = { ...SAMPLE_PAYLOAD, isDemoMode: true };
    await fireZapierWebhook(demoPayload);

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as AuditLeadPayload;
    expect(body.isDemoMode).toBe(true);
    expect(body.submittedAt).toBe("2026-02-25T10:00:00.000Z");
  });
});
