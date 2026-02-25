/* ============================================================
   FindingCard — Individual audit finding with severity badge
   Design: Visibility Engine — glassmorphism, severity color coding
   ============================================================ */

interface Finding {
  dimension: string;
  criterion: string;
  issue: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  points_lost: number;
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

export function FindingCard({ finding, index }: FindingCardProps) {
  const config = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.Low;
  const dimColor = DIMENSION_COLORS[finding.dimension] ?? "#14B8A6";

  return (
    <div
      className="glass-card p-4 fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
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
      <p className="text-xs font-semibold text-white/70 mb-1">{finding.criterion}</p>
      <p className="text-sm text-white/60 leading-relaxed">{finding.issue}</p>
    </div>
  );
}
