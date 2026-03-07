/* ============================================================
   ReportContext — Business-facing context blocks for the SSG report
   Language: Growth and revenue focused, non-technical.
   Technical detail is reserved for the Recommended Fix section only.
   Design: Matches existing Visibility Engine glassmorphism system.
   ============================================================ */

/* ---------- Executive Summary ---------- */
export function ExecutiveSummary() {
  return (
    <div
      className="glass-card p-6 fade-up"
      style={{ borderLeft: "3px solid oklch(0.72 0.14 185 / 0.5)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xs font-semibold tracking-widest uppercase mono px-2 py-0.5 rounded"
          style={{
            color: "#14B8A6",
            background: "oklch(0.72 0.14 185 / 0.10)",
            border: "1px solid oklch(0.72 0.14 185 / 0.25)",
          }}
        >
          About This Report
        </span>
      </div>
      <h2 className="syne text-base font-bold text-white mb-3">
        Is Your Business Showing Up Where Customers Are Looking?
      </h2>
      <div className="flex flex-col gap-2.5 text-sm text-white/60 leading-relaxed">
        <p>
          AI tools like ChatGPT, Perplexity, and Google's AI Overviews are now the first
          stop for millions of customers researching products and services. These tools
          don't just list websites — they read them, summarise them, and recommend specific
          businesses by name. If your website isn't structured correctly, your business
          won't appear, no matter how good your offering is.
        </p>
        <p>
          This report shows you exactly where your website is losing visibility — and what
          it's costing you in missed customers. Every gap identified below is a specific,
          fixable reason why AI tools are currently overlooking your business in favour of
          competitors.
        </p>
        <p>
          The good news:{" "}
          <strong className="text-white/80">
            none of these fixes require a website redesign.
          </strong>{" "}
          They are targeted adjustments to your existing content that can be implemented
          quickly — and that typically produce measurable results within weeks.
        </p>
      </div>
    </div>
  );
}

/* ---------- Per-dimension context labels ---------- */

interface DimensionContextProps {
  dimension: "SEO" | "SGO" | "GEO";
}

const DIMENSION_CONTEXT = {
  SEO: {
    color: "#60A5FA",
    label: "Search Discoverability",
    purpose:
      "This section measures whether AI tools and search engines can actually find your business online. It's the foundation — if a search engine can't reliably read your website, your business is invisible to every AI tool that relies on it.",
    keyElements: [
      "Page titles and descriptions that tell AI what your business does",
      "Heading structure that organises your content so AI can follow it",
      "Technical signals that confirm your site is trustworthy and readable",
    ],
    impact:
      "Businesses with strong discoverability appear more consistently in AI-generated results — meaning more potential customers find you before they find your competitors.",
  },
  SGO: {
    color: "#14B8A6",
    label: "AI Answer Readiness",
    purpose:
      "This section measures how well your website answers the questions your customers are actually asking. AI tools like ChatGPT and Perplexity actively recommend businesses whose websites directly answer common questions — and they cite those businesses by name in their responses.",
    keyElements: [
      "Question-style headings that match how customers search",
      "Short, direct answer paragraphs that AI can quote",
      "Structured data that tells AI exactly what services you offer",
    ],
    impact:
      "When your website is structured to answer questions, AI tools are far more likely to recommend your business by name when a potential customer is actively looking for what you provide.",
  },
  GEO: {
    color: "#A78BFA",
    label: "Business Authority & Trust",
    purpose:
      "This section measures how confidently AI tools can verify that your business is real, established, and worth recommending. AI systems cross-reference multiple signals before recommending a business — gaps or inconsistencies reduce confidence and lower your chances of being cited.",
    keyElements: [
      "Consistent business name, location, and contact details across the web",
      "Trust signals — testimonials, company background, and secure infrastructure",
      "Clear service descriptions that help AI understand exactly what you do",
    ],
    impact:
      "Businesses with strong authority signals are recommended more confidently by AI tools — directly influencing whether a potential customer hears your name when they're ready to buy.",
  },
};

export function DimensionContext({ dimension }: DimensionContextProps) {
  const ctx = DIMENSION_CONTEXT[dimension];

  return (
    <div
      className="rounded-lg p-4 mb-3"
      style={{
        background: `${ctx.color}08`,
        border: `1px solid ${ctx.color}20`,
      }}
    >
      {/* Purpose */}
      <p className="text-xs text-white/55 leading-relaxed mb-2">
        <span className="font-semibold text-white/75">What this measures — </span>
        {ctx.purpose}
      </p>

      {/* Key elements */}
      <div className="mb-2">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mono mb-1.5">
          What we looked at
        </p>
        <ul className="flex flex-col gap-1">
          {ctx.keyElements.map((el, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-white/50">
              <span style={{ color: ctx.color }} className="mt-0.5 shrink-0">›</span>
              {el}
            </li>
          ))}
        </ul>
      </div>

      {/* Business impact */}
      <p
        className="text-xs leading-relaxed pt-2"
        style={{
          borderTop: `1px solid ${ctx.color}15`,
          color: ctx.color,
          opacity: 0.85,
        }}
      >
        <span className="font-semibold">Why this matters for your growth — </span>
        {ctx.impact}
      </p>
    </div>
  );
}

/* ---------- Closing Note ---------- */
export function ClosingNote() {
  return (
    <div
      className="glass-card p-5 fade-up"
      style={{ borderLeft: "3px solid oklch(0.72 0.14 185 / 0.3)" }}
    >
      <p className="text-xs font-semibold tracking-widest uppercase mono text-white/30 mb-2">
        A Note on This Assessment
      </p>
      <p className="text-sm text-white/55 leading-relaxed">
        Your website was almost certainly built for traditional search — and it likely
        performs well in that context. AI-driven discovery is a new layer, and most
        businesses haven't yet optimised for it. The gaps identified above are not
        criticisms of your website. They are growth opportunities. Each one represents a
        specific, fixable reason why AI tools are currently overlooking your business —
        and why addressing them can directly increase the number of customers who find
        and choose you.
      </p>
    </div>
  );
}
