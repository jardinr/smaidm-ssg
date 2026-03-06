/* ============================================================
   ReportContext — Executive-facing context blocks for the SSG report
   Enhancement: Adds Executive Summary, per-dimension Purpose + Business
   Impact labels, and a Closing Note to improve readability for
   directors and decision-makers.
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
        AI Visibility Structural Assessment
      </h2>
      <div className="flex flex-col gap-2.5 text-sm text-white/60 leading-relaxed">
        <p>
          Modern search is increasingly driven by AI systems that summarise information
          rather than simply listing websites. Platforms such as generative search engines
          and conversational AI assistants rely on structured website content to understand
          what a company offers and when to recommend it.
        </p>
        <p>
          Websites that clearly present their services through structured headings, direct
          answers, and recognised data signals are far more likely to be interpreted and
          surfaced by these systems.
        </p>
        <p>
          This assessment evaluates how effectively your website communicates its services
          to AI-driven search systems — and identifies structural adjustments that can
          improve how your business is interpreted, summarised, and recommended online.
          These refinements typically <strong className="text-white/80">do not require a website redesign</strong>.
          They focus on improving the structure and clarity of existing content.
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
    label: "SEO Foundations",
    purpose:
      "This section evaluates the technical signals that allow search engines to correctly identify and index your website. While traditional SEO remains important, it now acts as a foundational layer that supports AI-driven discovery.",
    keyElements: [
      "Page titles and meta descriptions",
      "Heading structure (H1, H2, H3)",
      "Canonical signals",
      "Indexing permissions and crawlability",
    ],
    impact:
      "Clear SEO foundations ensure that search engines can reliably identify and categorise your website content — a prerequisite for AI-driven visibility.",
  },
  SGO: {
    color: "#14B8A6",
    label: "SGO — Search Generative Optimisation",
    purpose:
      "This section evaluates how well the website is structured to provide direct answers to common questions. Modern AI systems prioritise websites that present information clearly and concisely in response to typical user queries.",
    keyElements: [
      "Question-based headings that mirror how people search",
      "Atomic answer blocks — short paragraphs placed directly below headings",
      "Structured data (JSON-LD schema) for services, FAQs, and business identity",
    ],
    impact:
      "Improving these structures helps AI engines accurately summarise your services when potential clients search for solutions — increasing the likelihood your business is cited or recommended.",
  },
  GEO: {
    color: "#A78BFA",
    label: "GEO — Generative Engine Optimisation",
    purpose:
      "This section evaluates signals that confirm the legitimacy and authority of a business. AI systems rely on strong entity signals to verify that a business is real, active, and trustworthy.",
    keyElements: [
      "Entity signals — consistent business name, phone, location, and social profiles",
      "Authority indicators — testimonials, company background, and secure infrastructure",
      "Content depth — clear service explanations that help AI understand the scope of the business",
    ],
    impact:
      "Stronger entity signals improve how confidently AI systems recommend a company to potential customers — directly influencing whether your business appears in AI-generated answers.",
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
      <p className="text-xs text-white/50 leading-relaxed mb-2">
        <span className="font-semibold text-white/70">Purpose — </span>
        {ctx.purpose}
      </p>

      {/* Key elements */}
      <div className="mb-2">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mono mb-1.5">
          Key elements evaluated
        </p>
        <ul className="flex flex-col gap-1">
          {ctx.keyElements.map((el, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-white/45">
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
        <span className="font-semibold">Business impact — </span>
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
        The goal of this assessment is not to criticise existing design or content. Most
        websites were built for traditional search environments — and they work well in
        that context. As AI-driven discovery becomes more prominent, small structural
        refinements can significantly improve how businesses are interpreted and recommended
        online. The findings above represent opportunities, not failures.
      </p>
    </div>
  );
}
