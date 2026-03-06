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
 * Derives a plain-language business impact statement from the finding's
 * dimension and severity. Used when no explicit impact field is available.
 */
function deriveImpact(finding: Finding): string {
  const severityPhrase =
    finding.severity === "Critical" || finding.severity === "High"
      ? "significantly reduces"
      : "may reduce";

  const dimensionPhrase: Record<string, string> = {
    SEO: "how reliably search engines can identify and index your website",
    SGO: "how accurately AI engines can summarise and cite your services",
    GEO: "how confidently AI systems can verify and recommend your business",
  };

  const phrase = dimensionPhrase[finding.dimension] ?? "your overall AI search visibility";
  return `This gap ${severityPhrase} ${phrase}.`;
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

        {/* 1 — Issue */}
        <div
          className="rounded p-2.5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mono mb-1">
            Structural Issue
          </p>
          <p className="text-sm text-white/60 leading-relaxed">{finding.issue}</p>
        </div>

        {/* 2 — Impact */}
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
            Business Impact
          </p>
          <p className="text-sm leading-relaxed" style={{ color: dimColor, opacity: 0.85 }}>
            {impact}
          </p>
        </div>

        {/* 3 — Recommendation */}
        <div
          className="rounded p-2.5"
          style={{
            background: "oklch(0.72 0.14 185 / 0.05)",
            border: "1px solid oklch(0.72 0.14 185 / 0.15)",
          }}
        >
          <p className="text-xs font-semibold text-teal-400/60 uppercase tracking-widest mono mb-1">
            Recommended Fix
          </p>
          <p className="text-sm text-white/65 leading-relaxed">{recommendation}</p>
        </div>

      </div>
    </div>
  );
}
