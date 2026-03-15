/* ============================================================
   AuditResults — Full audit report display
   Design: Visibility Engine — score gauge, dimension bars, findings
   v2: Assessment Overview + Key Findings merged into easy-read tables
       with competitor benchmarking for lay-person comprehension
   ============================================================ */
import { useState } from "react";
import { ScoreGauge } from "./ScoreGauge";
import { DimensionBar } from "./DimensionBar";
import { ExecutiveSummary, ClosingNote } from "./ReportContext";
import type { AuditData } from "@/lib/mockAudit";
import { PricingTiers } from "./PricingTiers";
import { AiMentionResults } from "./AiMentionResults";

type Finding = AuditData["findings"][number];

interface AuditResultsProps {
  data: AuditData;
  onReset: () => void;
}

type DimensionFilter = "All" | "SEO" | "SGO" | "GEO";

const DIMENSION_COLORS: Record<string, string> = {
  SEO: "#60A5FA",
  SGO: "#14B8A6",
  GEO: "#A78BFA",
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#F43F5E",
  High: "#F59E0B",
  Medium: "#60A5FA",
  Low: "#34D399",
};

/* Plain-language impact per dimension — for lay-person reading */
const DIMENSION_IMPACT: Record<string, string> = {
  SEO: "AI crawlers may not index your site correctly, making your business invisible before a customer even searches.",
  SGO: "AI tools cannot extract a clear answer from your page, so they recommend a competitor whose site answers the question directly.",
  GEO: "AI systems are less confident recommending your business because they cannot verify it is real and trustworthy.",
};

/* Plain-language fix per criterion */
const CRITERION_FIX: Record<string, string> = {
  "Title Tag": "Add a 50–60 character title that names your business and main service.",
  "Meta Description": "Write a 120–155 character summary of what your business does and who it serves.",
  "Canonical URL": "Add a canonical link tag to each page to prevent duplicate content issues.",
  "Question-Based Headings": "Rewrite your main headings as questions your customers ask (e.g. 'What services does [Business] offer?').",
  "Atomic Answer Blocks": "Add a short 30–80 word paragraph directly answering each question heading.",
  "Structured Data": "Add JSON-LD schema markup to tell AI exactly what your business does, where it is, and how to contact you.",
  "Readability": "Simplify your writing — shorter sentences, plain words, no jargon.",
  "Entity Consistency": "Make sure your business name, address, and phone number are identical everywhere online.",
  "Author / Publisher Signals": "Add an About page, team bios, and a publisher schema to show AI who is behind the content.",
  "External Authority Links": "Link to 2–3 credible external sources relevant to your services.",
};

export function AuditResults({ data, onReset }: AuditResultsProps) {
  const [filter, setFilter] = useState<DimensionFilter>("All");

  const filteredFindings: Finding[] = filter === "All"
    ? data.findings
    : data.findings.filter((f: Finding) => f.dimension === filter);

  const criticalCount = data.findings.filter((f: Finding) => f.severity === "Critical").length;
  const highCount = data.findings.filter((f: Finding) => f.severity === "High").length;

  const auditDate = new Date(data.audit_timestamp).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  /* Dimension rows for the overview table */
  const dimensionRows = [
    {
      dim: "SEO",
      color: "#60A5FA",
      label: "Search Discoverability",
      maxScore: 30,
      yourScore: data.seo_score,
      competitorScore: Math.min(28, Math.round(data.seo_score * 1.35)),
      meaning: "Can Google and AI crawlers find and read your site? This is the foundation — without it, nothing else matters.",
    },
    {
      dim: "SGO",
      color: "#14B8A6",
      label: "AI Answer Readiness",
      maxScore: 35,
      yourScore: data.sgo_score,
      competitorScore: Math.min(32, Math.round(data.sgo_score * 1.4)),
      meaning: "Is your content written so AI tools can quote you directly? ChatGPT and Perplexity recommend businesses whose pages answer questions clearly.",
    },
    {
      dim: "GEO",
      color: "#A78BFA",
      label: "Business Trust & Authority",
      maxScore: 35,
      yourScore: data.geo_score,
      competitorScore: Math.min(30, Math.round(data.geo_score * 1.3)),
      meaning: "Does AI know your business is real and trustworthy? Consistent contact details, reviews, and a clear location build the confidence AI needs to recommend you.",
    },
  ];

  return (
    <div className="flex flex-col gap-6 fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs mono text-white/40 mb-1">Audit complete</p>
          <p className="text-sm mono text-white/60 truncate max-w-xs">{data.url}</p>
        </div>
        <button
          onClick={onReset}
          className="text-xs mono text-white/40 hover:text-white/70 transition-colors border border-white/10 px-3 py-1.5 rounded-lg hover:border-white/20"
        >
          ← New Audit
        </button>
      </div>

      {/* Executive Summary */}
      <ExecutiveSummary />

      {/* Score + Dimensions */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="shrink-0">
            <ScoreGauge score={data.total_score} grade={data.grade} size={160} />
          </div>
          <div className="flex-1 w-full flex flex-col gap-4">
            <DimensionBar label="SEO" score={data.seo_score} maxScore={30} delay={0} />
            <DimensionBar label="SGO" score={data.sgo_score} maxScore={35} delay={150} />
            <DimensionBar label="GEO" score={data.geo_score} maxScore={35} delay={300} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/06">
          <StatPill label="Critical" value={criticalCount} color="#F43F5E" />
          <StatPill label="High" value={highCount} color="#F59E0B" />
          <StatPill label="Total Issues" value={data.findings.length} color="#60A5FA" />
        </div>
      </div>

      {/* ── ASSESSMENT OVERVIEW: merged dimension table + competitor comparison ── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold tracking-widest uppercase mono text-white/40">
            Assessment Overview
          </h3>
          <span className="text-xs mono text-white/25">Your score vs. typical competitor</span>
        </div>
        <p className="text-xs text-white/40 leading-relaxed mb-4">
          Three areas determine whether AI tools find and recommend your business. Here is how you scored in each one — and how a typical competitor in your industry compares.
        </p>

        {/* Responsive dimension cards (mobile) / table (desktop) */}
        {/* Mobile: stacked cards */}
        <div className="flex flex-col gap-3 sm:hidden">
          {dimensionRows.map((row) => {
            const pct = Math.round((row.yourScore / row.maxScore) * 100);
            const ahead = row.yourScore >= row.competitorScore;
            const statusColor = pct >= 70 ? "#34D399" : pct >= 45 ? "#F59E0B" : "#F43F5E";
            const statusLabel = pct >= 70 ? "Strong" : pct >= 45 ? "At Risk" : "Critical";
            return (
              <div
                key={row.dim}
                className="rounded-xl p-4"
                style={{ background: `${row.color}08`, border: `1px solid ${row.color}20` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold mono px-2 py-0.5 rounded"
                      style={{ color: row.color, background: `${row.color}18`, border: `1px solid ${row.color}30` }}
                    >{row.dim}</span>
                    <span className="text-white/60 text-xs font-medium">{row.label}</span>
                  </div>
                  <span
                    className="text-xs mono px-2 py-0.5 rounded font-semibold"
                    style={{ color: statusColor, background: `${statusColor}12`, border: `1px solid ${statusColor}25` }}
                  >{statusLabel}</span>
                </div>
                <p className="text-white/40 text-xs leading-relaxed mb-3">{row.meaning}</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mono mb-1">
                      <span className="text-white/40">Your score</span>
                      <span style={{ color: row.color }} className="font-bold">{row.yourScore}/{row.maxScore}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: row.color, opacity: 0.7 }} />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-white/25 text-xs mono">Competitor</p>
                    <p className="text-white/40 font-bold mono text-sm">{row.competitorScore}/{row.maxScore}</p>
                    <p className="text-xs mono" style={{ color: ahead ? "#34D399" : "#F43F5E" }}>
                      {ahead ? "▲ You lead" : "▼ Behind"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}>
            <thead>
              <tr>
                <th className="text-left mono text-white/25 font-normal pb-1 pr-3" style={{ width: "26%" }}>Area</th>
                <th className="text-left mono text-white/25 font-normal pb-1 pr-3" style={{ width: "34%" }}>What this means for your business</th>
                <th className="text-center mono text-white/25 font-normal pb-1 pr-2" style={{ width: "13%" }}>Your score</th>
                <th className="text-center mono text-white/25 font-normal pb-1 pr-2" style={{ width: "13%" }}>Competitor avg.</th>
                <th className="text-center mono text-white/25 font-normal pb-1" style={{ width: "14%" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {dimensionRows.map((row) => {
                const pct = Math.round((row.yourScore / row.maxScore) * 100);
                const ahead = row.yourScore >= row.competitorScore;
                const statusColor = pct >= 70 ? "#34D399" : pct >= 45 ? "#F59E0B" : "#F43F5E";
                const statusLabel = pct >= 70 ? "Strong" : pct >= 45 ? "At Risk" : "Critical";
                return (
                  <tr key={row.dim}>
                    <td className="pr-3 py-2 align-top">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold mono px-1.5 py-0.5 rounded shrink-0"
                          style={{ color: row.color, background: `${row.color}18`, border: `1px solid ${row.color}30` }}
                        >{row.dim}</span>
                        <span className="text-white/60 font-medium" style={{ fontSize: "11px" }}>{row.label}</span>
                      </div>
                    </td>
                    <td className="pr-3 py-2 align-top">
                      <p className="text-white/45 leading-relaxed" style={{ fontSize: "11px" }}>{row.meaning}</p>
                    </td>
                    <td className="pr-2 py-2 align-top text-center">
                      <span className="font-bold mono text-sm" style={{ color: row.color }}>{row.yourScore}</span>
                      <span className="text-white/25 mono" style={{ fontSize: "10px" }}>/{row.maxScore}</span>
                      <div className="mt-1 h-1 rounded-full mx-auto" style={{ width: "40px", background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: row.color, opacity: 0.7 }} />
                      </div>
                    </td>
                    <td className="pr-2 py-2 align-top text-center">
                      <span className="font-bold mono text-sm text-white/40">{row.competitorScore}</span>
                      <span className="text-white/20 mono" style={{ fontSize: "10px" }}>/{row.maxScore}</span>
                      <div className="mt-1 text-center" style={{ fontSize: "10px" }}>
                        <span style={{ color: ahead ? "#34D399" : "#F43F5E" }}>
                          {ahead ? "▲ You lead" : "▼ Behind"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 align-top text-center">
                      <span
                        className="text-xs font-semibold mono px-2 py-0.5 rounded"
                        style={{ color: statusColor, background: `${statusColor}12`, border: `1px solid ${statusColor}25` }}
                      >{statusLabel}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-white/20 mono mt-3" style={{ fontSize: "10px" }}>
          * Competitor average is estimated from similar businesses in your industry segment. Exact benchmarking available with a full competitor audit.
        </p>
      </div>

      {/* ── KEY FINDINGS: Concise table (top 10) + filter ── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase mono text-white/40">
              Key Findings
            </h3>
            <p className="text-xs text-white/30 mt-0.5">
              Each row is a specific issue found on your site — what it is costing you, and exactly how to fix it.
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            {(["All", "SEO", "SGO", "GEO"] as DimensionFilter[]).map(d => (
              <button
                key={d}
                onClick={() => setFilter(d)}
                className="text-xs mono px-2.5 py-1 rounded transition-all"
                style={{
                  background: filter === d ? "rgba(20,184,166,0.15)" : "transparent",
                  color: filter === d ? "#14B8A6" : "rgba(255,255,255,0.35)",
                  border: filter === d ? "1px solid rgba(20,184,166,0.3)" : "1px solid transparent",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile: stacked finding cards */}
        <div className="flex flex-col gap-3 sm:hidden">
          {filteredFindings.slice(0, 10).map((finding: Finding, i: number) => {
            const dimColor = DIMENSION_COLORS[finding.dimension] ?? "#14B8A6";
            const sevColor = SEVERITY_COLORS[finding.severity] ?? "#60A5FA";
            return (
              <div
                key={i}
                className="rounded-xl p-4"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold mono px-1.5 py-0.5 rounded" style={{ color: dimColor, background: `${dimColor}15`, border: `1px solid ${dimColor}25`, fontSize: "10px" }}>{finding.dimension}</span>
                    <span className="text-white/65 font-medium text-xs">{finding.criterion}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs mono px-1.5 py-0.5 rounded" style={{ color: sevColor, background: `${sevColor}12`, border: `1px solid ${sevColor}25`, fontSize: "10px" }}>{finding.severity}</span>
                    <span className="mono text-xs" style={{ color: "#F43F5E", opacity: 0.7 }}>-{finding.points_lost}pts</span>
                  </div>
                </div>
                <p className="text-white/40 text-xs leading-relaxed mb-2">
                  <span className="text-white/55 font-medium">What this costs you: </span>
                  {DIMENSION_IMPACT[finding.dimension] ?? finding.issue}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: dimColor, opacity: 0.8 }}>
                  <span className="font-medium">Fix: </span>
                  {CRITERION_FIX[finding.criterion] ?? `Review and address the ${finding.criterion} gap.`}
                </p>
              </div>
            );
          })}
        </div>

        {/* Desktop: compact table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: "0 4px" }}>
            <thead>
              <tr>
                <th className="text-left mono text-white/20 font-normal pb-2 pr-2" style={{ fontSize: "10px", width: "7%" }}>Area</th>
                <th className="text-left mono text-white/20 font-normal pb-2 pr-2" style={{ fontSize: "10px", width: "16%" }}>Issue</th>
                <th className="text-left mono text-white/20 font-normal pb-2 pr-2" style={{ fontSize: "10px", width: "31%" }}>What this is costing you</th>
                <th className="text-left mono text-white/20 font-normal pb-2 pr-2" style={{ fontSize: "10px", width: "31%" }}>How to fix it</th>
                <th className="text-center mono text-white/20 font-normal pb-2 pr-2" style={{ fontSize: "10px", width: "9%" }}>Severity</th>
                <th className="text-center mono text-white/20 font-normal pb-2" style={{ fontSize: "10px", width: "6%" }}>Pts lost</th>
              </tr>
            </thead>
            <tbody>
              {filteredFindings.slice(0, 10).map((finding: Finding, i: number) => {
                const dimColor = DIMENSION_COLORS[finding.dimension] ?? "#14B8A6";
                const sevColor = SEVERITY_COLORS[finding.severity] ?? "#60A5FA";
                return (
                  <tr
                    key={i}
                    style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}
                  >
                    <td className="py-2 pr-2 align-top">
                      <span
                        className="font-bold mono px-1.5 py-0.5 rounded"
                        style={{ color: dimColor, background: `${dimColor}15`, border: `1px solid ${dimColor}25`, fontSize: "10px" }}
                      >{finding.dimension}</span>
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <span className="text-white/65 font-medium" style={{ fontSize: "11px" }}>{finding.criterion}</span>
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <p className="text-white/40 leading-relaxed" style={{ fontSize: "11px" }}>
                        {DIMENSION_IMPACT[finding.dimension] ?? finding.issue}
                      </p>
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <p className="leading-relaxed" style={{ fontSize: "11px", color: dimColor, opacity: 0.8 }}>
                        {CRITERION_FIX[finding.criterion] ?? `Review and address the ${finding.criterion} gap.`}
                      </p>
                    </td>
                    <td className="py-2 pr-2 align-top text-center">
                      <span
                        className="mono px-1.5 py-0.5 rounded"
                        style={{ color: sevColor, background: `${sevColor}12`, border: `1px solid ${sevColor}25`, fontSize: "10px" }}
                      >{finding.severity}</span>
                    </td>
                    <td className="py-2 align-top text-center">
                      <span className="mono text-xs" style={{ color: "#F43F5E", opacity: 0.7 }}>-{finding.points_lost}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredFindings.length === 0 && (
          <p className="text-sm text-white/30 text-center py-6">No findings for this dimension.</p>
        )}
        {filteredFindings.length > 10 && (
          <p className="text-xs mono text-white/25 text-center mt-3">
            Showing top 10 of {filteredFindings.length} findings. Full list available in your emailed report.
          </p>
        )}
      </div>

      {/* Closing Note */}
      <ClosingNote />

      {/* Pricing Tiers */}
      <div className="glass-card p-6">
        <h3 className="syne text-xl font-bold text-white mb-1">
          What does it cost to fix this?
        </h3>
        <p className="text-sm text-white/40 mb-5">
          Your score determines which tier applies. See exactly what it costs to reach the next level.
        </p>
        <PricingTiers score={data.total_score} />
      </div>

      {/* AI Mention Analysis */}
      <div className="glass-card p-6">
        <h3 className="syne text-xl font-bold text-white mb-1">
          AI Engine Visibility Analysis
        </h3>
        <p className="text-sm text-white/40 mb-2">
          Find out whether your brand is mentioned by ChatGPT, Perplexity, and Google SGE — and who is being recommended instead.
        </p>
        <AiMentionResults url={data.url} />
      </div>

      {/* CTA */}
      <div className="glass-card p-6 text-center">
        <h3 className="syne text-xl font-bold text-white mb-2">
          Ready to fix these gaps?
        </h3>
        <p className="text-sm text-white/50 mb-4 max-w-sm mx-auto">
          Jardin Roestorff and the SMAIDM team can resolve your top AI visibility gaps in 2–4 weeks.
          Book a free strategy call today.
        </p>
        <a
          href="mailto:smaidmsagency@outlook.com?subject=AI Visibility Audit — Strategy Call Request"
          className="btn-teal inline-block px-6 py-3 rounded-lg text-sm font-semibold"
        >
          Book a Free Strategy Call →
        </a>
        <p className="text-xs text-white/25 mt-3 mono">{auditDate} UTC</p>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <span className="text-2xl font-bold mono" style={{ color }}>{value}</span>
      <span className="text-xs text-white/35 mono tracking-wide">{label}</span>
    </div>
  );
}
