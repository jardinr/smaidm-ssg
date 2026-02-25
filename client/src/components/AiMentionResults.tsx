/**
 * AiMentionResults — displays the four AI visibility signals:
 *   1. Brand mention detection
 *   2. Brand positioning analysis
 *   3. Competitor recommendation detection
 *   4. Authority signal scoring
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { AiMentionResult } from "../../../server/routers/aiMentions";

interface Props {
  url: string;
  businessName?: string;
}

const SENTIMENT_CONFIG = {
  positive: { label: "Positive", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  neutral: { label: "Neutral", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  negative: { label: "Negative", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
  not_mentioned: { label: "Not Mentioned", color: "text-white/40", bg: "bg-white/5 border-white/10" },
};

const THREAT_CONFIG = {
  high: { label: "High Threat", color: "text-red-400", dot: "bg-red-400" },
  medium: { label: "Medium Threat", color: "text-yellow-400", dot: "bg-yellow-400" },
  low: { label: "Low Threat", color: "text-emerald-400", dot: "bg-emerald-400" },
};

function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text
          x={size / 2} y={size / 2 + 1}
          textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize={size < 70 ? 13 : 16} fontWeight="700"
          style={{ transform: "rotate(90deg)", transformOrigin: `${size / 2}px ${size / 2}px` }}
        >
          {score}
        </text>
      </svg>
      <span className="text-xs text-white/50 text-center leading-tight">{label}</span>
    </div>
  );
}

function SignalBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${
        active
          ? "bg-emerald-400/10 border-emerald-400/25 text-emerald-400"
          : "bg-white/5 border-white/10 text-white/35"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-white/20"}`} />
      {label}
    </div>
  );
}

export function AiMentionResults({ url, businessName }: Props) {
  const [triggered, setTriggered] = useState(false);

  const mutation = trpc.aiMentions.analyse.useMutation();

  const handleAnalyse = () => {
    setTriggered(true);
    mutation.mutate({ url, businessName });
  };

  const data: AiMentionResult | undefined = mutation.data;
  const isLoading = mutation.isPending;
  const isError = mutation.isError;

  return (
    <div
      className="rounded-xl border mt-6 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(20,184,166,0.05) 0%, rgba(11,20,38,0.8) 100%)",
        borderColor: "rgba(20,184,166,0.2)",
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">AI Engine Visibility Analysis</h3>
          <p className="text-xs text-white/45 mt-0.5">
            Simulates how ChatGPT, Perplexity & Google SGE respond to category searches for your brand
          </p>
        </div>
        {!triggered && (
          <button
            onClick={handleAnalyse}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: "oklch(0.72 0.14 185)",
              color: "#0B1426",
            }}
          >
            Run AI Analysis
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="px-5 py-8 flex flex-col items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "oklch(0.72 0.14 185 / 0.15)" }} />
            <div className="absolute inset-2 rounded-full animate-pulse" style={{ background: "oklch(0.72 0.14 185 / 0.35)" }} />
          </div>
          <p className="text-xs text-white/40 text-center">
            Querying AI engines for brand mentions, positioning, and competitor data...
          </p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-red-400">Analysis failed. Please try again.</p>
          <button
            onClick={handleAnalyse}
            className="mt-3 text-xs text-white/40 hover:text-white/70 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {data && !isLoading && (
        <div className="p-5 space-y-6">

          {/* Score overview row */}
          <div className="flex items-center justify-around gap-4 py-2">
            <ScoreRing score={data.mentionConfidence} label="Mention Confidence" />
            <ScoreRing score={data.authorityScore} label="Authority Score" />
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-4 ${
                  data.isMentioned ? "border-emerald-400 bg-emerald-400/10" : "border-red-400/50 bg-red-400/10"
                }`}
              >
                {data.isMentioned ? "✓" : "✗"}
              </div>
              <span className="text-xs text-white/50 text-center">
                {data.isMentioned ? "Brand Mentioned" : "Not Mentioned"}
              </span>
            </div>
          </div>

          {/* Positioning */}
          {data.positioning && (
            <div>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">How AI Engines Position Your Brand</p>
              <div
                className={`px-4 py-3 rounded-lg border text-sm leading-relaxed ${
                  SENTIMENT_CONFIG[data.positioningSentiment].bg
                } ${SENTIMENT_CONFIG[data.positioningSentiment].color}`}
              >
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mr-2 ${
                    SENTIMENT_CONFIG[data.positioningSentiment].bg
                  }`}
                >
                  {SENTIMENT_CONFIG[data.positioningSentiment].label}
                </span>
                {data.positioning}
              </div>
            </div>
          )}

          {!data.positioning && (
            <div className="px-4 py-3 rounded-lg border border-white/10 bg-white/5">
              <p className="text-sm text-white/40 italic">
                Your brand was not found in simulated AI engine responses for your category. This is the core problem to fix.
              </p>
            </div>
          )}

          {/* Competitors */}
          {data.competitors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                Competitors Being Recommended Instead
              </p>
              <div className="space-y-2">
                {data.competitors.map((comp, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-4 py-3 rounded-lg border border-white/8 bg-white/3"
                  >
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${THREAT_CONFIG[comp.threatLevel].dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{comp.name}</span>
                        <span className={`text-xs ${THREAT_CONFIG[comp.threatLevel].color}`}>
                          {THREAT_CONFIG[comp.threatLevel].label}
                        </span>
                      </div>
                      <p className="text-xs text-white/45 mt-0.5">{comp.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Authority signals */}
          <div>
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Authority Signals</p>
            <div className="flex flex-wrap gap-2">
              <SignalBadge active={data.authoritySignals.hasWikipediaOrKnowledgePanel} label="Knowledge Panel" />
              <SignalBadge active={data.authoritySignals.hasNewsOrPressReferences} label="Press References" />
              <SignalBadge active={data.authoritySignals.hasIndustryDirectoryListings} label="Directory Listings" />
              <SignalBadge active={data.authoritySignals.hasSocialProofSignals} label="Social Proof" />
              <SignalBadge active={data.authoritySignals.hasConsistentNapData} label="Consistent NAP Data" />
            </div>
            <p className="text-xs text-white/35 mt-2">Domain age estimate: {data.authoritySignals.domainAgeEstimate}</p>
          </div>

          {/* Queries used */}
          <div>
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">AI Queries Simulated</p>
            <div className="space-y-1">
              {data.queriesUsed.map((q, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-white/40">
                  <span className="shrink-0 text-teal-500/60 mt-0.5">›</span>
                  <span className="italic">"{q}"</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
              Recommended Actions to Improve AI Mention Rate
            </p>
            <div className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                  <span
                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ background: "oklch(0.72 0.14 185 / 0.15)", color: "#14B8A6" }}
                  >
                    {i + 1}
                  </span>
                  {rec}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Idle state — not yet triggered */}
      {!triggered && (
        <div className="px-5 py-6 text-center">
          <p className="text-xs text-white/35 leading-relaxed">
            This analysis simulates how ChatGPT, Perplexity, and Google SGE respond to category searches for your brand —
            revealing whether you are being mentioned, how you are positioned, and which competitors are being recommended instead.
          </p>
        </div>
      )}
    </div>
  );
}
