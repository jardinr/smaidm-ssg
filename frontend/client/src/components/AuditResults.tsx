/* ============================================================
   AuditResults — Full audit report display
   Design: Visibility Engine — score gauge, dimension bars, findings
   Enhancement: Integrated Executive Summary, per-dimension context labels,
   and Closing Note for improved executive readability.
   ============================================================ */
import { useState } from "react";
import { ScoreGauge } from "./ScoreGauge";
import { DimensionBar } from "./DimensionBar";
import { FindingCard } from "./FindingCard";
import { ExecutiveSummary, DimensionContext, ClosingNote } from "./ReportContext";
import type { AuditData } from "@/lib/mockAudit";

type Finding = AuditData["findings"][number];

interface AuditResultsProps {
  data: AuditData;
  onReset: () => void;
}

type DimensionFilter = "All" | "SEO" | "SGO" | "GEO";

export function AuditResults({ data, onReset }: AuditResultsProps) {
  const [filter, setFilter] = useState<DimensionFilter>("All");

  const filteredFindings = filter === "All"
    ? data.findings
    : data.findings.filter((f: Finding) => f.dimension === filter);

  const criticalCount = data.findings.filter((f: Finding) => f.severity === "Critical").length;
  const highCount = data.findings.filter((f: Finding) => f.severity === "High").length;

  const auditDate = new Date(data.audit_timestamp).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

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

      {/* Executive Summary — new block */}
      <ExecutiveSummary />

      {/* Score + Dimensions */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Gauge */}
          <div className="shrink-0">
            <ScoreGauge score={data.total_score} grade={data.grade} size={160} />
          </div>

          {/* Dimension bars */}
          <div className="flex-1 w-full flex flex-col gap-4">
            <DimensionBar label="SEO" score={data.seo_score} maxScore={30} delay={0} />
            <DimensionBar label="SGO" score={data.sgo_score} maxScore={35} delay={150} />
            <DimensionBar label="GEO" score={data.geo_score} maxScore={35} delay={300} />
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/06">
          <StatPill label="Critical" value={criticalCount} color="#F43F5E" />
          <StatPill label="High" value={highCount} color="#F59E0B" />
          <StatPill label="Total Issues" value={data.findings.length} color="#60A5FA" />
        </div>
      </div>

      {/* Assessment Overview — section context labels */}
      <div className="glass-card p-5">
        <h3 className="text-xs font-semibold tracking-widest uppercase mono text-white/40 mb-4">
          Assessment Overview
        </h3>
        <p className="text-xs text-white/45 leading-relaxed mb-4">
          The SSG system evaluates three core areas that influence how AI systems interpret
          websites. Each section below explains what was assessed and why it matters to
          your business.
        </p>
        <DimensionContext dimension="SEO" />
        <DimensionContext dimension="SGO" />
        <DimensionContext dimension="GEO" />
      </div>

      {/* Top 3 Gaps */}
      {data.top_gaps.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold tracking-widest uppercase mono text-white/40 mb-3">
            Top Priority Gaps
          </h3>
          <div className="flex flex-col gap-2">
            {data.top_gaps.map((gap: string, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mono mt-0.5"
                  style={{ background: "oklch(0.65 0.22 15 / 0.15)", color: "oklch(0.75 0.18 15)" }}
                >
                  {i + 1}
                </span>
                <p className="text-sm text-white/70 leading-relaxed">{gap}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Findings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold tracking-widest uppercase mono text-white/40">
            Key Findings ({data.findings.length})
          </h3>
          {/* Filter tabs */}
          <div className="flex gap-1">
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

        <div className="flex flex-col gap-2">
          {filteredFindings.map((finding: Finding, i: number) => (
            <FindingCard key={i} finding={finding} index={i} />
          ))}
          {filteredFindings.length === 0 && (
            <p className="text-sm text-white/30 text-center py-6">No findings for this dimension.</p>
          )}
        </div>
      </div>

      {/* Closing Note — new block */}
      <ClosingNote />

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
          href="mailto:smaidmsa@outlook.com?subject=AI Visibility Audit — Strategy Call Request"
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
