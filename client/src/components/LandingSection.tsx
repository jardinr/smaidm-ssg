/* ============================================================
   LandingSection — SMAIDM Agency brand content
   Sits above the audit form on the unified homepage
   ============================================================ */

export function LandingSection() {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 pt-4 pb-16">
      {/* Services grid */}
      <div className="text-center mb-10">
        <p className="text-xs mono uppercase tracking-widest text-teal-400/70 mb-3">
          What We Do
        </p>
        <h2
          className="syne font-bold text-white mb-4"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)" }}
        >
          South Africa's First AI Search Visibility Platform
        </h2>
        <p className="text-white/50 text-sm leading-relaxed max-w-2xl mx-auto">
          SMAIDM combines AI-driven strategy with a proprietary three-layer audit engine to give
          businesses complete clarity on how they are found — and how they are described — across
          every search surface that matters in 2026.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        <ServiceCard
          icon="🎯"
          title="Intelligent Targeting"
          description="AI-powered audience analysis and hyper-personalised targeting beyond traditional demographics."
        />
        <ServiceCard
          icon="✨"
          title="Content Optimisation"
          description="AI-structured content that ranks in Google, gets cited by ChatGPT, and surfaces in Perplexity."
        />
        <ServiceCard
          icon="⚡"
          title="Campaign Automation"
          description="Automated campaign management with real-time optimisation and dynamic budget allocation."
        />
        <ServiceCard
          icon="📊"
          title="Advanced Analytics"
          description="Predictive insights, competitive intelligence, and actionable recommendations from unified dashboards."
        />
      </div>

      {/* Three-layer explainer */}
      <div
        className="rounded-2xl p-8 mb-16"
        style={{
          background: "oklch(0.72 0.14 185 / 0.05)",
          border: "1px solid oklch(0.72 0.14 185 / 0.15)",
        }}
      >
        <p className="text-xs mono uppercase tracking-widest text-teal-400/70 mb-3 text-center">
          The Three-Layer Audit Framework
        </p>
        <h3
          className="syne font-bold text-white text-center mb-8"
          style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.75rem)" }}
        >
          Where Is Your Business Being Found?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LayerCard
            number="01"
            title="SEO"
            subtitle="Traditional Search"
            description="Google and Bing organic rankings — the foundation of digital discoverability."
            color="#14B8A6"
          />
          <LayerCard
            number="02"
            title="GSO"
            subtitle="Generative Search Optimisation"
            description="Google AI Overviews and Bing Copilot — AI summaries that replace the first page of results."
            color="#818CF8"
          />
          <LayerCard
            number="03"
            title="GEO"
            subtitle="Generative Engine Optimisation"
            description="ChatGPT, Perplexity, and Gemini — where your customers are asking questions and getting direct answers."
            color="#F59E0B"
          />
        </div>
      </div>

      {/* Who we serve */}
      <div className="text-center mb-10">
        <p className="text-xs mono uppercase tracking-widest text-teal-400/70 mb-3">
          Who We Serve
        </p>
        <h3
          className="syne font-bold text-white mb-8"
          style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.75rem)" }}
        >
          Built for Businesses That Cannot Afford to Be Invisible
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AudienceCard
            title="SMEs & Startups"
            points={[
              "Looking to compete with larger brands in AI search",
              "Active online but unsure how AI describes them",
              "Want measurable results without a retainer",
            ]}
          />
          <AudienceCard
            title="Agencies"
            points={[
              "Want to offer AI discoverability audits to clients",
              "Need a white-label audit engine",
              "Looking to differentiate from traditional SEO agencies",
            ]}
          />
          <AudienceCard
            title="Enterprise"
            points={[
              "Require structured reporting for multiple brands or markets",
              "Need competitive benchmarking across AI search platforms",
              "Seeking a partner for ongoing GEO monitoring",
            ]}
          />
        </div>
      </div>

      {/* Contact strip */}
      <div
        className="rounded-xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{
          background: "oklch(0.72 0.14 185 / 0.07)",
          border: "1px solid oklch(0.72 0.14 185 / 0.18)",
        }}
      >
        <div>
          <p className="text-sm font-semibold text-white">Jardin Roestorff · Founder, SMAIDM</p>
          <p className="text-xs mono text-white/40 mt-0.5">Cape Town, South Africa</p>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="mailto:smaidmsagency@outlook.com"
            className="text-xs mono text-white/40 hover:text-teal-400 transition-colors"
          >
            smaidmsagency@outlook.com
          </a>
          <a
            href="tel:+27822660899"
            className="text-xs mono text-white/40 hover:text-teal-400 transition-colors"
          >
            +27 82 266 0899
          </a>
          <a
            href="http://www.youtube.com/@SMAIDM"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs mono text-white/40 hover:text-teal-400 transition-colors"
          >
            YouTube
          </a>
        </div>
      </div>
    </section>
  );
}

function ServiceCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "oklch(0.72 0.14 185 / 0.05)",
        border: "1px solid oklch(0.72 0.14 185 / 0.12)",
      }}
    >
      <div className="text-2xl mb-3">{icon}</div>
      <h4 className="syne font-semibold text-white text-sm mb-2">{title}</h4>
      <p className="text-white/40 text-xs leading-relaxed">{description}</p>
    </div>
  );
}

function LayerCard({
  number,
  title,
  subtitle,
  description,
  color,
}: {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: `${color}0D`,
        border: `1px solid ${color}30`,
      }}
    >
      <div className="text-xs mono mb-3" style={{ color }}>
        {number}
      </div>
      <h4 className="syne font-bold text-white text-lg mb-0.5">{title}</h4>
      <p className="text-xs mono mb-3" style={{ color }}>
        {subtitle}
      </p>
      <p className="text-white/45 text-xs leading-relaxed">{description}</p>
    </div>
  );
}

function AudienceCard({
  title,
  points,
}: {
  title: string;
  points: string[];
}) {
  return (
    <div
      className="rounded-xl p-5 text-left"
      style={{
        background: "oklch(0.72 0.14 185 / 0.04)",
        border: "1px solid oklch(0.72 0.14 185 / 0.12)",
      }}
    >
      <h4 className="syne font-semibold text-white text-sm mb-3">{title}</h4>
      <ul className="space-y-2">
        {points.map((point, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-white/45 leading-relaxed">
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className="mt-0.5 shrink-0"
            >
              <path
                d="M2 5l2 2 4-4"
                stroke="#14B8A6"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
