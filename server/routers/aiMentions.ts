/**
 * AI Mention Detection Router
 *
 * Simulates how ChatGPT / Perplexity respond to category-based searches
 * for a given business. Runs three structured LLM queries and extracts:
 *   1. Brand mention detection — is the business named in AI responses?
 *   2. Brand positioning — how is the brand described/framed?
 *   3. Competitor detection — which other brands are recommended instead?
 *
 * All queries run server-side via invokeLLM to keep API keys private.
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AiMentionResult {
  /** Whether the brand name was mentioned in any AI-simulated response */
  isMentioned: boolean;
  /** Confidence score 0–100 that the brand would appear in real AI engine responses */
  mentionConfidence: number;
  /** How the AI engine positions/describes the brand (or null if not mentioned) */
  positioning: string | null;
  /** Sentiment of the positioning: positive | neutral | negative | not_mentioned */
  positioningSentiment: "positive" | "neutral" | "negative" | "not_mentioned";
  /** Competitors that were recommended instead of or alongside this brand */
  competitors: Array<{
    name: string;
    reason: string;
    threatLevel: "high" | "medium" | "low";
  }>;
  /** The three simulated AI query prompts used */
  queriesUsed: string[];
  /** Raw AI response snippets for transparency */
  responseSnippets: string[];
  /** Authority signal score 0–100 based on web presence indicators */
  authorityScore: number;
  /** Authority signal breakdown */
  authoritySignals: {
    hasWikipediaOrKnowledgePanel: boolean;
    hasNewsOrPressReferences: boolean;
    hasIndustryDirectoryListings: boolean;
    hasSocialProofSignals: boolean;
    hasConsistentNapData: boolean; // Name, Address, Phone
    domainAgeEstimate: string;
  };
  /** Actionable recommendations based on findings */
  recommendations: string[];
}

// ── JSON schema for structured LLM response ──────────────────────────────────

const AI_MENTION_SCHEMA = {
  type: "object",
  properties: {
    isMentioned: {
      type: "boolean",
      description: "Whether the brand name appears in the simulated AI response",
    },
    mentionConfidence: {
      type: "integer",
      description: "Confidence 0-100 that this brand would appear in real ChatGPT/Perplexity responses for this category",
    },
    positioning: {
      type: ["string", "null"],
      description: "How the AI engine describes or positions this brand. Null if not mentioned.",
    },
    positioningSentiment: {
      type: "string",
      enum: ["positive", "neutral", "negative", "not_mentioned"],
      description: "Sentiment of the AI positioning",
    },
    competitors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          reason: { type: "string", description: "Why this competitor is recommended over the target brand" },
          threatLevel: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["name", "reason", "threatLevel"],
        additionalProperties: false,
      },
    },
    authorityScore: {
      type: "integer",
      description: "Estimated authority score 0-100 based on web presence signals",
    },
    authoritySignals: {
      type: "object",
      properties: {
        hasWikipediaOrKnowledgePanel: { type: "boolean" },
        hasNewsOrPressReferences: { type: "boolean" },
        hasIndustryDirectoryListings: { type: "boolean" },
        hasSocialProofSignals: { type: "boolean" },
        hasConsistentNapData: { type: "boolean" },
        domainAgeEstimate: { type: "string" },
      },
      required: [
        "hasWikipediaOrKnowledgePanel",
        "hasNewsOrPressReferences",
        "hasIndustryDirectoryListings",
        "hasSocialProofSignals",
        "hasConsistentNapData",
        "domainAgeEstimate",
      ],
      additionalProperties: false,
    },
    responseSnippets: {
      type: "array",
      items: { type: "string" },
      description: "Short snippets from the simulated AI responses",
    },
    recommendations: {
      type: "array",
      items: { type: "string" },
      description: "3-5 actionable recommendations to improve AI mention rate",
    },
  },
  required: [
    "isMentioned",
    "mentionConfidence",
    "positioning",
    "positioningSentiment",
    "competitors",
    "authorityScore",
    "authoritySignals",
    "responseSnippets",
    "recommendations",
  ],
  additionalProperties: false,
} as const;

// ── Helper: build category-based search queries ───────────────────────────────

function buildSearchQueries(businessName: string, url: string, category: string): string[] {
  const location = extractLocationHint(url);
  const base = category || businessName;

  return [
    `Best ${base} in ${location}`,
    `Who are the top ${base} companies in South Africa?`,
    `Recommend a ${base} for a corporate client in ${location}`,
  ];
}

function extractLocationHint(url: string): string {
  // Try to infer location from domain or common SA patterns
  if (url.includes("capetown") || url.includes("cpt")) return "Cape Town, South Africa";
  if (url.includes("jhb") || url.includes("joburg") || url.includes("johannesburg")) return "Johannesburg, South Africa";
  if (url.includes("durban") || url.includes("dbn")) return "Durban, South Africa";
  if (url.includes(".co.za") || url.includes("sa") || url.includes("south")) return "South Africa";
  return "South Africa";
}

function inferCategory(businessName: string, url: string): string {
  const combined = `${businessName} ${url}`.toLowerCase();
  if (combined.includes("film") || combined.includes("location") || combined.includes("scout")) return "film location scouting service";
  if (combined.includes("event") || combined.includes("venue")) return "event venue";
  if (combined.includes("photo") || combined.includes("shoot")) return "photography location";
  if (combined.includes("tour") || combined.includes("travel")) return "tour operator";
  if (combined.includes("restaurant") || combined.includes("food")) return "restaurant";
  if (combined.includes("hotel") || combined.includes("accommodation")) return "accommodation provider";
  if (combined.includes("digital") || combined.includes("agency") || combined.includes("seo")) return "digital marketing agency";
  if (combined.includes("wine") || combined.includes("farm")) return "wine farm";
  return "business";
}

// ── Router ────────────────────────────────────────────────────────────────────

export const aiMentionsRouter = router({
  /**
   * Analyse how AI engines mention, position, and compare a brand.
   * Runs 3 structured LLM queries and returns a full AiMentionResult.
   */
  analyse: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
        businessName: z.string().optional(),
      })
    )
    .mutation(async ({ input }): Promise<AiMentionResult> => {
      const businessName = input.businessName || extractDomainName(input.url);
      const category = inferCategory(businessName, input.url);
      const queries = buildSearchQueries(businessName, input.url, category);

      const systemPrompt = `You are an AI search engine analyst. Your job is to simulate how ChatGPT and Perplexity would respond to category-based searches, and evaluate whether a specific brand would be mentioned.

You have deep knowledge of South African businesses, their digital presence, and how AI engines evaluate authority signals.

When analysing brand visibility, consider:
- Whether the brand has structured data (schema markup) on its website
- Whether the brand is mentioned in industry directories, press, or review sites
- Whether the brand has consistent NAP (Name, Address, Phone) data across the web
- Whether the brand has social proof signals (reviews, testimonials, case studies)
- Whether the brand has a Wikipedia page or Google Knowledge Panel

Be honest and realistic. Most small South African businesses score poorly on AI visibility.`;

      const userPrompt = `Analyse the AI search visibility of this business:

Business Name: ${businessName}
Website: ${input.url}
Inferred Category: ${category}

Simulate how ChatGPT and Perplexity would respond to these three search queries:
1. "${queries[0]}"
2. "${queries[1]}"
3. "${queries[2]}"

For each query, determine:
- Would "${businessName}" be mentioned in the AI response?
- If yes, how is it positioned/described?
- Which competitors would be recommended instead or alongside?

Then provide:
- An overall brand mention confidence score (0-100)
- Authority signal assessment based on typical web presence for this type of business
- 3-5 specific, actionable recommendations to improve AI mention rate

Return a JSON object matching the schema exactly.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ai_mention_result",
              strict: true,
              schema: AI_MENTION_SCHEMA,
            },
          },
        });

        const rawContent = response.choices?.[0]?.message?.content;
        const raw = typeof rawContent === "string" ? rawContent : null;
        if (!raw) throw new Error("Empty LLM response");

        const parsed = JSON.parse(raw) as AiMentionResult;

        return {
          ...parsed,
          queriesUsed: queries,
        };
      } catch (err) {
        console.error("[AiMentions] LLM analysis failed:", err);

        // Return a safe fallback so the UI doesn't break
        return {
          isMentioned: false,
          mentionConfidence: 0,
          positioning: null,
          positioningSentiment: "not_mentioned",
          competitors: [],
          queriesUsed: queries,
          responseSnippets: ["Analysis unavailable — please try again."],
          authorityScore: 0,
          authoritySignals: {
            hasWikipediaOrKnowledgePanel: false,
            hasNewsOrPressReferences: false,
            hasIndustryDirectoryListings: false,
            hasSocialProofSignals: false,
            hasConsistentNapData: false,
            domainAgeEstimate: "Unknown",
          },
          recommendations: [
            "Add LocalBusiness schema markup to your homepage",
            "Create a Google Business Profile and keep NAP data consistent",
            "Add FAQ content targeting common questions in your category",
          ],
        };
      }
    }),
});

function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname.split(".")[0].charAt(0).toUpperCase() + hostname.split(".")[0].slice(1);
  } catch {
    return "This Business";
  }
}
