/* ============================================================
   DimensionBar — Animated score bar for SEO / SGO / GEO
   Design: Visibility Engine — glassmorphism card with teal fill
   ============================================================ */
import { useEffect, useState } from "react";

interface DimensionBarProps {
  label: string;
  score: number;
  maxScore: number;
  color?: string;
  delay?: number;
}

const DIMENSION_COLORS: Record<string, string> = {
  SEO: "#60A5FA",   // blue
  SGO: "#14B8A6",   // teal
  GEO: "#A78BFA",   // violet
};

export function DimensionBar({ label, score, maxScore, color, delay = 0 }: DimensionBarProps) {
  const [width, setWidth] = useState(0);
  const pct = Math.round((score / maxScore) * 100);
  const barColor = color ?? DIMENSION_COLORS[label] ?? "#14B8A6";

  useEffect(() => {
    const timer = setTimeout(() => setWidth(pct), delay + 100);
    return () => clearTimeout(timer);
  }, [pct, delay]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest uppercase mono" style={{ color: barColor }}>
          {label}
        </span>
        <span className="text-xs mono" style={{ color: barColor }}>
          {score}<span className="text-white/30">/{maxScore}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${width}%`,
            background: barColor,
            boxShadow: `0 0 8px ${barColor}66`,
            transitionDelay: `${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}
