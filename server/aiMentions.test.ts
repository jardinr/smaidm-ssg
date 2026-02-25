/**
 * Tests for the AI Mention Detection Router (aiMentions.analyse)
 *
 * These tests mock the LLM helper so no real API calls are made.
 * They verify:
 *   1. The procedure returns a valid AiMentionResult structure
 *   2. The queriesUsed field is populated from the URL/businessName
 *   3. A graceful fallback is returned when the LLM call fails
 *   4. The domain name is extracted correctly when businessName is omitted
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { AiMentionResult } from "./routers/aiMentions";

// ── Mock LLM so tests don't make real API calls ───────────────────────────────
// Note: vi.mock is hoisted to the top of the file, so we cannot reference
// variables defined in the module scope. Instead, we inline the mock data.

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            isMentioned: true,
            mentionConfidence: 72,
            positioning: "A well-regarded digital marketing agency in South Africa known for AI-driven SEO strategies.",
            positioningSentiment: "positive",
            competitors: [
              {
                name: "Webfluential",
                reason: "Larger brand presence and more press coverage",
                threatLevel: "medium",
              },
            ],
            queriesUsed: [],
            responseSnippets: ["SMAIDM is frequently cited for AI visibility work in South Africa."],
            authorityScore: 65,
            authoritySignals: {
              hasWikipediaOrKnowledgePanel: false,
              hasNewsOrPressReferences: true,
              hasIndustryDirectoryListings: true,
              hasSocialProofSignals: true,
              hasConsistentNapData: true,
              domainAgeEstimate: "2–5 years",
            },
            recommendations: [
              "Add LocalBusiness schema markup to your homepage",
              "Create a Google Business Profile with consistent NAP data",
              "Publish FAQ content targeting common questions in your category",
            ],
          }),
        },
      },
    ],
  }),
}));

// ── Test context ──────────────────────────────────────────────────────────────

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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("aiMentions.analyse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a valid AiMentionResult structure", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const result = await caller.aiMentions.analyse({
      url: "https://smaidm.co.za",
      businessName: "SMAIDM",
    });

    expect(result).toBeDefined();
    expect(typeof result.isMentioned).toBe("boolean");
    expect(typeof result.mentionConfidence).toBe("number");
    expect(result.mentionConfidence).toBeGreaterThanOrEqual(0);
    expect(result.mentionConfidence).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.competitors)).toBe(true);
    expect(Array.isArray(result.queriesUsed)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.authoritySignals).toBeDefined();
    expect(typeof result.authorityScore).toBe("number");
  });

  it("populates queriesUsed with three category-based queries", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const result = await caller.aiMentions.analyse({
      url: "https://smaidm.co.za",
      businessName: "SMAIDM",
    });

    expect(result.queriesUsed).toHaveLength(3);
    result.queriesUsed.forEach(q => {
      expect(typeof q).toBe("string");
      expect(q.length).toBeGreaterThan(0);
    });
  });

  it("extracts domain name as businessName when businessName is omitted", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const caller = appRouter.createCaller(createPublicContext());

    await caller.aiMentions.analyse({
      url: "https://salocations.co.za",
    });

    // The LLM should have been called with a prompt mentioning "Salocations"
    expect(invokeLLM).toHaveBeenCalledOnce();
    const callArgs = (invokeLLM as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const userMessage = callArgs.messages.find((m: { role: string }) => m.role === "user");
    expect(userMessage.content).toContain("Salocations");
  });

  it("returns graceful fallback when LLM call fails", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("LLM timeout"));

    const caller = appRouter.createCaller(createPublicContext());

    const result = await caller.aiMentions.analyse({
      url: "https://example.co.za",
      businessName: "Example Business",
    });

    // Should not throw — returns safe fallback
    expect(result.isMentioned).toBe(false);
    expect(result.mentionConfidence).toBe(0);
    expect(result.positioning).toBeNull();
    expect(result.positioningSentiment).toBe("not_mentioned");
    expect(result.authorityScore).toBe(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.queriesUsed).toHaveLength(3);
  });

  it("includes all required authority signal fields in the response", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const result = await caller.aiMentions.analyse({
      url: "https://smaidm.co.za",
      businessName: "SMAIDM",
    });

    const signals = result.authoritySignals;
    expect(typeof signals.hasWikipediaOrKnowledgePanel).toBe("boolean");
    expect(typeof signals.hasNewsOrPressReferences).toBe("boolean");
    expect(typeof signals.hasIndustryDirectoryListings).toBe("boolean");
    expect(typeof signals.hasSocialProofSignals).toBe("boolean");
    expect(typeof signals.hasConsistentNapData).toBe("boolean");
    expect(typeof signals.domainAgeEstimate).toBe("string");
  });
});
