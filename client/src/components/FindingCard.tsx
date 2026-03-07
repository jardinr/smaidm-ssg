/* ============================================================
   FindingCard — Individual audit finding with severity badge
   Design: Visibility Engine — glassmorphism, severity color coding
   Enhancement: Three-part card structure (Issue / Impact / Recommendation)
   for improved executive readability. Recommendation is derived from the
   existing criterion and dimension data — no new backend fields required.
   ============================================================ */

interface Finding {
  dimension: string;
  criterion: string;
  issue: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  points_lost: number;
  recommendation?: string; // optional — populated by backend when available
}

interface FindingCardProps {
  finding: Finding;
  index: number;
}

const SEVERITY_CONFIG = {
  Critical: { badge: "badge-critical", label: "Critical", icon: "●" },
  High:     { badge: "badge-high",     label: "High",     icon: "●" },
  Medium:   { badge: "badge-medium",   label: "Medium",   icon: "●" },
  Low:      { badge: "badge-low",      label: "Low",      icon: "●" },
};

const DIMENSION_COLORS: Record<string, string> = {
  SEO: "#60A5FA",
  SGO: "#14B8A6",
  GEO: "#A78BFA",
};

/**
 * Derives a business-growth impact statement from the finding's dimension,
 * criterion, and severity. Language is written for a business owner, not a
 * developer — focused on customers, revenue, and competitive position.
 */
function deriveImpact(finding: Finding): string {
  const isCriticalOrHigh = finding.severity === "Critical" || finding.severity === "High";

  // Criterion-specific impact statements — most specific, highest priority
  const criterionImpact: Record<string, string> = {
    "Title Tag": isCriticalOrHigh
      ? "AI tools can't identify what your business does, so they skip it entirely when recommending services to potential customers."
      : "AI tools may misidentify your business category, reducing how often you appear for relevant searches.",
    "Meta Description": isCriticalOrHigh
      ? "AI summarisation tools have no ready-made description to quote, making your business less likely to appear in AI-generated answers."
      : "AI tools may generate a less accurate summary of your business, reducing click-through from AI results.",
    "Canonical URL": "Duplicate content signals confuse AI crawlers, diluting your authority and reducing how confidently AI tools recommend your business.",
    "H1 Structure": isCriticalOrHigh
      ? "Without a clear primary heading, AI tools cannot determine what your page is about — making your business invisible for that topic."
      : "Weak heading structure reduces how accurately AI tools categorise your services.",
    "Question-Based Headings": isCriticalOrHigh
      ? "Your website doesn't answer the questions customers are typing into ChatGPT and Perplexity — so competitors who do are being recommended instead of you."
      : "AI tools are less likely to surface your content when customers ask questions your business could answer.",
    "Question-Based Headings (H2/H3)": isCriticalOrHigh
      ? "Your website doesn't answer the questions customers are typing into ChatGPT and Perplexity — so competitors who do are being recommended instead of you."
      : "AI tools are less likely to surface your content when customers ask questions your business could answer.",
    "Atomic Answer Blocks": isCriticalOrHigh
      ? "AI tools need short, direct answers to quote and recommend. Without them, your business is passed over in favour of sites that provide them."
      : "AI tools are less likely to cite your content directly, reducing your visibility in AI-generated responses.",
    "Atomic Answer Structure": isCriticalOrHigh
      ? "AI tools need short, direct answers to quote and recommend. Without them, your business is passed over in favour of sites that provide them."
      : "AI tools are less likely to cite your content directly, reducing your visibility in AI-generated responses.",
    "Structured Data": isCriticalOrHigh
      ? "AI tools have no structured information to cite about your business — making it significantly harder for them to recommend you accurately."
      : "Without structured data, AI tools rely on guesswork to describe your services, reducing recommendation accuracy.",
    "Structured Data Presence": isCriticalOrHigh
      ? "AI tools have no structured information to cite about your business — making it significantly harder for them to recommend you accurately."
      : "Without structured data, AI tools rely on guesswork to describe your services, reducing recommendation accuracy.",
    "Business Schema Type": "AI tools can't categorise your business type, reducing how often you appear when customers search for your specific services.",
    "Entity Consistency": isCriticalOrHigh
      ? "Inconsistent business details across the web reduce AI confidence in your business — making it less likely to be recommended."
      : "Minor inconsistencies in your business details can reduce how confidently AI tools recommend you.",
    "Readability": "Content that's difficult to parse is less likely to be quoted or recommended by AI tools, reducing your visibility in AI-generated answers.",
    "Author / Publisher Signals": "Without clear authorship signals, AI tools treat your content as less authoritative — reducing how often it's cited.",
    "External Authority Links": "Pages without credible external references appear less authoritative to AI systems, reducing recommendation confidence.",
    "Canonical Tag": "Without a canonical tag, AI crawlers may index duplicate versions of your pages, diluting your authority and reducing visibility.",
  };

  if (criterionImpact[finding.criterion]) {
    return criterionImpact[finding.criterion];
  }

  // Dimension-level fallback
  const dimensionImpact: Record<string, string> = {
    SEO: isCriticalOrHigh
      ? "This gap is actively preventing AI tools from finding and indexing your business — directly reducing how often you appear to potential customers."
      : "This gap reduces how reliably AI tools can find and categorise your business online.",
    SGO: isCriticalOrHigh
      ? "This gap means AI tools like ChatGPT and Perplexity are not recommending your business when customers search for what you offer."
      : "This gap reduces how accurately AI tools summarise and recommend your services.",
    GEO: isCriticalOrHigh
      ? "This gap reduces AI confidence in your business, making it less likely to be recommended when customers are ready to buy."
      : "This gap may reduce how confidently AI tools verify and recommend your business.",
  };

  return dimensionImpact[finding.dimension] ?? "This gap is reducing your visibility to AI-powered search tools that potential customers are using to find businesses like yours.";
}

/**
 * Derives a plain-language recommendation from the criterion name.
 * Used as a fallback when no explicit recommendation is provided by the backend.
 */
function deriveRecommendation(finding: Finding): string {
  const fallbacks: Record<string, string> = {
    "Title Tag": "Add a descriptive, keyword-rich title tag (50–60 characters) to every page.",
    "Meta Description": "Write a concise meta description (120–155 characters) summarising the page's core value.",
    "Canonical URL": "Add a canonical <link> tag to each page to prevent duplicate content signals.",
    "Question-Based Headings": "Rewrite H2/H3 headings as questions that mirror how your customers search (e.g. 'What services does [Business] offer?').",
    "Atomic Answer Blocks": "Place a 30–80 word direct-answer paragraph immediately below each question heading.",
    "Structured Data": "Implement JSON-LD schema for Organization, FAQPage, and Service to give AI engines structured, citable data.",
    "Readability": "Simplify sentence structure and reduce jargon to achieve a Flesch readability score between 50 and 70.",
    "Entity Consistency": "Ensure your business name, address, and phone number are identical across the page, Google Business Profile, and social profiles.",
    "Author / Publisher Signals": "Add author bylines, an About page, and publisher schema to establish content authority.",
    "External Authority Links": "Link out to at least 2–3 credible external sources relevant to your services.",
  };

  return (
    finding.recommendation ??
    fallbacks[finding.criterion] ??
    `Review and address the ${finding.criterion} gap to improve your ${finding.dimension} score.`
  );
}

export function FindingCard({ finding, index }: FindingCardProps) {
  const config = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.Low;
  const dimColor = DIMENSION_COLORS[finding.dimension] ?? "#14B8A6";
  const impact = deriveImpact(finding);
  const recommendation = deriveRecommendation(finding);

  return (
    <div
      className="glass-card p-4 fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header row: dimension badge, severity badge, points lost */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs font-semibold tracking-widest uppercase mono px-2 py-0.5 rounded"
            style={{
              color: dimColor,
              background: `${dimColor}18`,
              border: `1px solid ${dimColor}30`,
            }}
          >
            {finding.dimension}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${config.badge}`}>
            {config.icon} {config.label}
          </span>
        </div>
        <span className="text-xs mono text-white/30 shrink-0">
          -{finding.points_lost}pts
        </span>
      </div>

      {/* Criterion title */}
      <p className="text-xs font-semibold text-white/70 mb-3">{finding.criterion}</p>

      {/* Three-part card body */}
      <div className="flex flex-col gap-2.5">

        {/* 1 — What was found */}
        <div
          className="rounded p-2.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mono mb-1">
            What We Found
          </p>
          <p className="text-sm text-white/60 leading-relaxed">{finding.issue}</p>
        </div>

        {/* 2 — What it costs you */}
        <div
          className="rounded p-2.5"
          style={{
            background: `${dimColor}08`,
            border: `1px solid ${dimColor}20`,
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mono mb-1"
            style={{ color: dimColor, opacity: 0.7 }}
          >
            What This Is Costing You
          </p>
          <p className="text-sm leading-relaxed" style={{ color: dimColor, opacity: 0.85 }}>
            {impact}
          </p>
        </div>

        {/* 3 — How to fix it */}
        <div
          className="rounded p-2.5"
          style={{
            background: "oklch(0.72 0.14 185 / 0.05)",
            border: "1px solid oklch(0.72 0.14 185 / 0.15)",
          }}
        >
          <p className="text-xs font-semibold text-teal-400/60 uppercase tracking-widest mono mb-1">
            How to Fix It
          </p>
          <p className="text-sm text-white/65 leading-relaxed">{recommendation}</p>
        </div>

      </div>
    </div>
  );
}
