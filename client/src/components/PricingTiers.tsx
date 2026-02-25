/* ============================================================
   PricingTiers — Score-based tiered pricing component
   Shows the client's current score band, what it costs to
   reach the next tier, and the full rate card.
   ============================================================ */

interface Tier {
  id: string;
  label: string;
  range: [number, number];
  grade: string;
  description: string;
  zarOnceOff: number;
  zarMonthly: number;
  targetScore: number;
  color: string;
  bgColor: string;
  borderColor: string;
  fixes: string[];
}

const TIERS: Tier[] = [
  {
    id: "critical",
    label: "Critical",
    range: [0, 24],
    grade: "F",
    description: "Effectively invisible to AI search engines. ChatGPT, Perplexity, and Google SGE cannot identify, cite, or recommend this business.",
    zarOnceOff: 12500,
    zarMonthly: 1500,
    targetScore: 50,
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.25)",
    fixes: [
      "Page title, meta description, H1 — all missing or broken",
      "Zero structured data / schema markup",
      "No canonical tag — duplicate content risk",
      "Image alt tags missing across entire site",
      "Word count below AI citation threshold (< 300 words)",
    ],
  },
  {
    id: "poor",
    label: "Poor",
    range: [25, 49],
    grade: "D",
    description: "AI engines can find the site but cannot reliably understand, categorise, or recommend the business. High risk of being replaced by competitors in AI results.",
    zarOnceOff: 9500,
    zarMonthly: 1200,
    targetScore: 75,
    color: "#f97316",
    bgColor: "rgba(249,115,22,0.08)",
    borderColor: "rgba(249,115,22,0.25)",
    fixes: [
      "Meta description present but too short or keyword-poor",
      "Schema markup present but broken @id or missing FAQPage",
      "Canonical tag missing",
      "Partial image alt tag coverage (< 50%)",
      "Content below 600-word AI citation threshold",
    ],
  },
  {
    id: "moderate",
    label: "Moderate",
    range: [50, 74],
    grade: "C",
    description: "Visible to AI engines but not being recommended or cited. Competitors with better structured data and FAQ content will consistently outrank this site in AI-generated answers.",
    zarOnceOff: 6500,
    zarMonthly: 1200,
    targetScore: 90,
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.08)",
    borderColor: "rgba(245,158,11,0.25)",
    fixes: [
      "FAQPage schema missing — highest AI citation ROI",
      "Person schema missing — no founder/owner entity signal",
      "Service schema not implemented",
      "Content lacks question-based answer structure",
      "Social sameAs links not in schema",
    ],
  },
  {
    id: "good",
    label: "Good",
    range: [75, 89],
    grade: "B",
    description: "AI engines can identify and sometimes recommend this business. Minor structural gaps prevent consistent citation. One or two targeted fixes will push into the AI-ready tier.",
    zarOnceOff: 3500,
    zarMonthly: 1200,
    targetScore: 95,
    color: "#14B8A6",
    bgColor: "rgba(20,184,166,0.08)",
    borderColor: "rgba(20,184,166,0.25)",
    fixes: [
      "Fine-tune FAQ content for specific AI answer patterns",
      "Add Review/Rating schema for trust signals",
      "Expand content to 1000+ words for deeper AI indexing",
      "Add BreadcrumbList schema for site structure",
    ],
  },
  {
    id: "excellent",
    label: "AI-Ready",
    range: [90, 100],
    grade: "A",
    description: "Eligible for citation by ChatGPT, Perplexity, and Google SGE. The business appears in AI-generated answers, summaries, and recommendations.",
    zarOnceOff: 0,
    zarMonthly: 1200,
    targetScore: 100,
    color: "#a78bfa",
    bgColor: "rgba(167,139,250,0.08)",
    borderColor: "rgba(167,139,250,0.25)",
    fixes: [
      "Monthly monitoring to maintain score as AI algorithms evolve",
      "Competitor gap analysis to stay ahead",
      "New page / content schema as site grows",
    ],
  },
];

function getTierForScore(score: number): Tier {
  return TIERS.find((t) => score >= t.range[0] && score <= t.range[1]) ?? TIERS[0];
}

interface PricingTiersProps {
  score: number;
}

export function PricingTiers({ score }: PricingTiersProps) {
  const currentTier = getTierForScore(score);
  const isTopTier = currentTier.id === "excellent";

  return (
    <div className="w-full space-y-6">
      {/* Current band highlight */}
      <div
        className="rounded-xl p-5 border"
        style={{
          background: currentTier.bgColor,
          borderColor: currentTier.borderColor,
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded"
                style={{ background: currentTier.borderColor, color: currentTier.color }}
              >
                Grade {currentTier.grade} — {currentTier.label}
              </span>
              <span className="text-xs font-mono text-white/40">
                Score {currentTier.range[0]}–{currentTier.range[1]}
              </span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed max-w-xl">
              {currentTier.description}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-mono text-white/40 mb-1 uppercase tracking-widest">
              {isTopTier ? "Maintenance" : `To reach ${currentTier.targetScore}+`}
            </div>
            {!isTopTier && (
              <div className="text-2xl font-black" style={{ color: currentTier.color }}>
                R {currentTier.zarOnceOff.toLocaleString()}
              </div>
            )}
            <div className="text-sm font-mono text-white/50">
              + R {currentTier.zarMonthly.toLocaleString()}/mo monitoring
            </div>
          </div>
        </div>

        {/* What's holding you back */}
        <div className="mt-4 pt-4 border-t" style={{ borderColor: currentTier.borderColor }}>
          <p className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2">
            {isTopTier ? "Ongoing maintenance includes" : "Key gaps at this score band"}
          </p>
          <ul className="space-y-1">
            {currentTier.fixes.map((fix, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                <span style={{ color: currentTier.color }} className="mt-0.5 shrink-0">▸</span>
                {fix}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Full rate card */}
      <div>
        <h3 className="text-xs font-mono font-bold tracking-widest uppercase text-white/40 mb-3">
          Full Rate Card — Score Improvement Tiers
        </h3>
        <div className="rounded-xl overflow-hidden border border-white/8">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                <th className="text-left px-4 py-3 font-mono text-white/40 uppercase tracking-widest font-normal">Band</th>
                <th className="text-left px-4 py-3 font-mono text-white/40 uppercase tracking-widest font-normal">Current Score</th>
                <th className="text-left px-4 py-3 font-mono text-white/40 uppercase tracking-widest font-normal">Target</th>
                <th className="text-right px-4 py-3 font-mono text-white/40 uppercase tracking-widest font-normal">Once-off (ZAR)</th>
                <th className="text-right px-4 py-3 font-mono text-white/40 uppercase tracking-widest font-normal">Monthly</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((tier) => {
                const isActive = tier.id === currentTier.id;
                return (
                  <tr
                    key={tier.id}
                    style={{
                      background: isActive ? tier.bgColor : "transparent",
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: tier.color }}
                        />
                        <span className="font-semibold" style={{ color: isActive ? tier.color : "rgba(255,255,255,0.7)" }}>
                          {tier.label}
                          {isActive && (
                            <span className="ml-2 text-xs font-mono text-white/40">← you are here</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-white/50">
                      {tier.range[0]}–{tier.range[1]}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: tier.color }}>
                      {tier.id === "excellent" ? "Maintain" : `${tier.targetScore}+`}
                    </td>
                    <td className="px-4 py-3 font-mono text-right font-bold" style={{ color: tier.id === "excellent" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.85)" }}>
                      {tier.zarOnceOff > 0 ? `R ${tier.zarOnceOff.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-white/50">
                      R {tier.zarMonthly.toLocaleString()}/mo
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs font-mono text-white/25 mt-2 text-center">
          All prices in South African Rand (ZAR) · VAT excluded · International clients billed in USD/EUR via Wise or Stripe
        </p>
      </div>

      {/* CTA */}
      <div
        className="rounded-xl p-5 text-center border"
        style={{
          background: "rgba(20,184,166,0.06)",
          borderColor: "rgba(20,184,166,0.2)",
        }}
      >
        <p className="text-sm text-white/70 mb-3">
          Ready to move your business into the{" "}
          <span style={{ color: "#14B8A6" }} className="font-semibold">
            AI-Recommended tier?
          </span>
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="mailto:smaidmsagency@outlook.com?subject=AI Visibility Implementation — Quote Request"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: "#14B8A6",
              color: "#0B1426",
            }}
          >
            Get a Quote
          </a>
          <a
            href="tel:+27822660899"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border transition-all"
            style={{
              borderColor: "rgba(20,184,166,0.3)",
              color: "#14B8A6",
            }}
          >
            Call 082 266 0899
          </a>
        </div>
      </div>
    </div>
  );
}
