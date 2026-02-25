/**
 * AuditTrendChart — 30-day dual-axis chart for the admin dashboard.
 *
 * Left axis  (bars):  daily audit submission count
 * Right axis (line):  daily average score for live audits only
 *
 * Built with recharts ComposedChart so both series share the same x-axis.
 */

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DayStat = {
  day: string;        // YYYY-MM-DD
  count: number;      // total audits that day
  avgScore: number | null; // avg score for live audits (null = no live audits)
};

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const date = label
    ? new Date(label + "T00:00:00Z").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : label;

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-xs shadow-xl"
      style={{
        background: "rgba(11,20,38,0.97)",
        borderColor: "rgba(20,184,166,0.25)",
        backdropFilter: "blur(8px)",
      }}
    >
      <p className="mono text-white/50 mb-2">{date}</p>
      {payload.map(entry => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-white/60">{entry.name}:</span>
          <span className="font-semibold text-white">
            {entry.value == null
              ? "—"
              : entry.name === "Avg Score"
              ? `${entry.value}/100`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="flex items-end gap-1 h-48 px-2">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm animate-pulse"
          style={{
            height: `${20 + Math.random() * 60}%`,
            background: "rgba(255,255,255,0.05)",
          }}
        />
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function ChartEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-2">
      <p className="text-sm text-white/30">No audit data in the past 30 days.</p>
      <p className="text-xs mono text-white/20">Chart will populate after the first audit submission.</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  data: DayStat[] | undefined;
  isLoading: boolean;
  days?: number;
};

export function AuditTrendChart({ data, isLoading, days = 30 }: Props) {
  const hasData = data && data.some(d => d.count > 0);

  // Format x-axis tick: show "1 Feb", "15 Feb" etc. — only show every ~5th label
  const formatXTick = (value: string, index: number) => {
    if (index % 5 !== 0) return "";
    const d = new Date(value + "T00:00:00Z");
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: "rgba(11,20,38,0.7)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Audit Volume &amp; Score Trend
          </h2>
          <p className="text-xs mono text-white/35 mt-0.5">
            Past {days} days — bars = submissions, line = avg score (live only)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs mono">
          <span className="flex items-center gap-1.5 text-white/40">
            <span className="w-3 h-3 rounded-sm" style={{ background: "oklch(0.72 0.14 185 / 0.7)" }} />
            Audits
          </span>
          <span className="flex items-center gap-1.5 text-white/40">
            <span className="w-5 h-0.5 rounded" style={{ background: "#F59E0B" }} />
            Avg Score
          </span>
        </div>
      </div>

      {/* Chart area */}
      {isLoading ? (
        <ChartSkeleton />
      ) : !hasData ? (
        <ChartEmpty />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tickFormatter={formatXTick}
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              interval={0}
            />
            {/* Left axis — audit count */}
            <YAxis
              yAxisId="count"
              orientation="left"
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={28}
            />
            {/* Right axis — score 0–100 */}
            <YAxis
              yAxisId="score"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              width={32}
              tickFormatter={v => `${v}`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            {/* Audit volume bars */}
            <Bar
              yAxisId="count"
              dataKey="count"
              name="Audits"
              fill="oklch(0.72 0.14 185 / 0.55)"
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
            />
            {/* Average score line */}
            <Line
              yAxisId="score"
              dataKey="avgScore"
              name="Avg Score"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#F59E0B", strokeWidth: 0 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
