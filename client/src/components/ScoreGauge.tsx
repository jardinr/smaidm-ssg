/* ============================================================
   ScoreGauge — Animated SVG circular score dial
   Design: Visibility Engine — teal arc on dark navy ring
   ============================================================ */
import { useEffect, useRef, useState } from "react";

interface ScoreGaugeProps {
  score: number;      // 0–100
  maxScore?: number;  // default 100
  size?: number;      // SVG size in px, default 160
  grade: string;
}

const GRADE_COLORS: Record<string, string> = {
  "AI Ready":         "#14B8A6",
  "Competitive":      "#22C55E",
  "At Risk":          "#F59E0B",
  "Weak Structure":   "#F97316",
  "Invisible to AI":  "#F43F5E",
};

export function ScoreGauge({ score, maxScore = 100, size = 160, grade }: ScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [animated, setAnimated] = useState(false);
  const rafRef = useRef<number>(0);

  const radius = (size / 2) - 14;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(score / maxScore, 1);
  const dashOffset = circumference * (1 - pct);
  const color = GRADE_COLORS[grade] ?? "#14B8A6";

  useEffect(() => {
    setAnimated(false);
    setDisplayScore(0);
    const start = performance.now();
    const duration = 1400;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setAnimated(true);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={10}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? dashOffset : circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: animated ? "none" : `stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)`,
            filter: `drop-shadow(0 0 8px ${color}88)`,
          }}
        />
        {/* Score number */}
        <text
          x={size / 2}
          y={size / 2 - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={size * 0.22}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="500"
        >
          {displayScore}
        </text>
        {/* /100 label */}
        <text
          x={size / 2}
          y={size / 2 + size * 0.14}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize={size * 0.09}
          fontFamily="'Inter', sans-serif"
        >
          / {maxScore}
        </text>
      </svg>
      <span
        className="text-sm font-semibold tracking-wide uppercase mono"
        style={{ color }}
      >
        {grade}
      </span>
    </div>
  );
}
