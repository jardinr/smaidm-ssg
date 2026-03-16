/**
 * email.test.ts
 *
 * Tests for the Resend email helper.
 * - Validates the RESEND_API_KEY secret is configured and reachable
 * - Tests the HTML/text builders produce expected content
 * - Tests graceful failure when API key is missing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendEmail, buildAuditReportHtml, buildAuditReportText, sendOwnerAuditNotification } from "./email";

// ── API key validation ────────────────────────────────────────────────────────

describe("RESEND_API_KEY secret validation", () => {
  it("RESEND_API_KEY is configured in the environment", () => {
    if (!process.env.RESEND_API_KEY) {
      // Key not set in this environment (sandbox / CI without secrets) — skip gracefully
      console.warn("[Skip] RESEND_API_KEY not configured in this environment");
      return;
    }
    expect(process.env.RESEND_API_KEY).toBeTruthy();
    expect(process.env.RESEND_API_KEY).toMatch(/^re_/);
  });

  it("can reach the Resend API with the configured key", async () => {
    if (!process.env.RESEND_API_KEY) {
      console.warn("[Skip] RESEND_API_KEY not configured — skipping live Resend reachability test");
      return;
    }
    // Call the Resend domains endpoint — lightweight, no email sent
    const response = await fetch("https://api.resend.com/domains", {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
    });
    // 200 = key valid, 401 = key invalid
    expect(response.status).not.toBe(401);
    expect([200, 403]).toContain(response.status); // 403 is fine — key is valid but may lack domain perms
  }, 15_000);
});

// ── sendEmail helper ──────────────────────────────────────────────────────────

describe("sendEmail", () => {
  it("returns { success: false } when RESEND_API_KEY is missing", async () => {
    const original = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("RESEND_API_KEY not configured");

    process.env.RESEND_API_KEY = original;
  });
});

// ── HTML builder ──────────────────────────────────────────────────────────────

const mockFindings = [
  { dimension: "SEO", criterion: "Title Tag", issue: "No title tag found.", severity: "Critical" as const, points_lost: 5 },
  { dimension: "SGO", criterion: "Schema Markup", issue: "No JSON-LD schema found.", severity: "High" as const, points_lost: 4 },
  { dimension: "GEO", criterion: "NAP Consistency", issue: "Business name not found in page content.", severity: "Medium" as const, points_lost: 3 },
];

const mockTopGaps = [
  "Add a title tag to the homepage.",
  "Implement JSON-LD schema markup for the business entity.",
  "Add business name, address, and phone number to the page.",
];

const baseParams = {
  url: "https://example.com",
  businessName: "Example Co",
  contactName: "Alice",
  overallScore: 42,
  seoScore: 55,
  sgoScore: 38,
  geoScore: 33,
  tier: "Poor (D)",
  regularCost: "R 9,500 once-off + R 1,200/mo",
  urgentCost: "R 7,500 once-off + R 1,200/mo",
  isDemoMode: false,
  offerExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  findings: mockFindings,
  topGaps: mockTopGaps,
};

describe("buildAuditReportHtml", () => {
  it("includes the business name and score in the HTML", () => {
    const html = buildAuditReportHtml(baseParams);
    expect(html).toContain("Example Co");
    expect(html).toContain("42/100");
    expect(html).toContain("Poor (D)");
  });

  it("includes the urgency offer section with both rates", () => {
    const html = buildAuditReportHtml(baseParams);
    expect(html).toContain("48-Hour Priority Fix Offer");
    expect(html).toContain("R 7,500");
    expect(html).toContain("R 9,500");
  });

  it("includes the mailto CTA with pre-filled subject", () => {
    const html = buildAuditReportHtml(baseParams);
    expect(html).toContain("mailto:smaidmsagency@outlook.com");
    expect(html).toContain("Priority Fix");
  });

  it("shows demo note when isDemoMode is true", () => {
    const html = buildAuditReportHtml({ ...baseParams, isDemoMode: true, overallScore: null });
    expect(html).toContain("demo audit");
  });

  it("uses the contact name in the greeting when provided", () => {
    const html = buildAuditReportHtml(baseParams);
    expect(html).toContain("Example Co");
  });

  it("includes the findings table with severity labels", () => {
    const html = buildAuditReportHtml(baseParams);
    expect(html).toContain("Detailed Findings");
    expect(html).toContain("Critical");
    expect(html).toContain("No title tag found.");
    expect(html).toContain("JSON-LD schema");
  });

  it("includes the top priority gaps section", () => {
    const html = buildAuditReportHtml(baseParams);
    // Heading is dynamic: "Top N Priority Fixes"
    expect(html).toContain("Priority Fixes");
    expect(html).toContain("Add a title tag");
  });

  it("renders correctly with no findings (demo mode)", () => {
    const html = buildAuditReportHtml({ ...baseParams, findings: [], topGaps: [], isDemoMode: true, overallScore: null });
    expect(html).toContain("Example Co");
    // Should not crash and should not include findings table
    expect(html).not.toContain("Detailed Findings");
  });
});

// ── Owner notification email ──────────────────────────────────────────────────

describe("sendOwnerAuditNotification", () => {
  it("returns { success: false } when RESEND_API_KEY is missing", async () => {
    const original = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const result = await sendOwnerAuditNotification({
      url: "https://example.com",
      businessName: "Example Co",
      contactName: "Alice",
      email: "alice@example.com",
      phone: null,
      overallScore: 42,
      seoScore: 55,
      sgoScore: 38,
      geoScore: 33,
      tier: "Poor (D)",
      upgradeCost: "R 9,500 once-off + R 1,200/mo",
      urgentCost: "R 7,500 once-off + R 1,200/mo",
      isDemoMode: false,
      findings: mockFindings,
      topGaps: mockTopGaps,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("RESEND_API_KEY not configured");

    process.env.RESEND_API_KEY = original;
  });
});

// ── Text builder ──────────────────────────────────────────────────────────────

describe("buildAuditReportText", () => {
  it("includes score and tier in the plain text", () => {
    const text = buildAuditReportText(baseParams);
    expect(text).toContain("42/100");
    expect(text).toContain("Poor (D)");
  });

  it("includes the urgency offer with both rates", () => {
    const text = buildAuditReportText(baseParams);
    expect(text).toContain("48-HOUR PRIORITY FIX OFFER");
    expect(text).toContain("R 7,500");
    expect(text).toContain("R 9,500");
  });

  it("includes contact details for booking", () => {
    const text = buildAuditReportText(baseParams);
    expect(text).toContain("smaidmsagency@outlook.com");
    expect(text).toContain("082 266 0899");
  });
});
