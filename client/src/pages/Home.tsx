/* ============================================================
   Home — SMAIDM SSG Platform landing page
   Design: Visibility Engine — deep navy hero, centered audit funnel
   Demo mode: falls back to mock data when no backend is reachable
   ============================================================ */
import { useState } from "react";
import { AuditForm } from "@/components/AuditForm";
import { AuditResults } from "@/components/AuditResults";
import { generateMockAudit, type AuditData } from "@/lib/mockAudit";

const HERO_BG = "https://private-us-east-1.manuscdn.com/sessionFile/LA7p5OssYnpbYcP7768cVq/sandbox/5PHDfPMQCle2OVyJY3lIc3-img-1_1771959823000_na1fn_aGVyby1iZw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvTEE3cDVPc3NZbnBiWWNQNzc2OGNWcS9zYW5kYm94LzVQSERmUE1RQ2xlMk9WeUpZM2xJYzMtaW1nLTFfMTc3MTk1OTgyMzAwMF9uYTFmbl9hR1Z5YnkxaVp3LnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=JvdZjfkEwBe4EexZQgWSPhsKYVo6vcN42hAsYDYQYBqE4~QaK6~oGZF7NPJ1X7DkaSi7VZqnFB80y~5sU2HwLyhdgq7iYU89IzG9CV5O1K8heqczDGnpMgqQXY2ZJOYfxtWCX1xkDVWncR2-JIY2PH~STwvKHbqWdpgG9kpYfLQ8NukjV2auPkETZ7S6zCAoD4iBFJcR8M3k2bNO2Bn9IadZn3qqYKqsAN4bbNr6wSYZNd3xJV5Zta9-0W3A9pYi5DCzRLhCiGIFGP22SFLsOFOp1xker0~puRQz96pCys9oXYeglQpXWndvj5D63wfMTu2B9TT0KihB7WPYrugOSg__";

// Set VITE_API_BASE in your environment to point to the deployed backend.
// When not set, the platform runs in demo mode with illustrative sample data.
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const handleAudit = async (formData: { url: string; businessName: string; email: string }) => {
    setIsLoading(true);
    setError(null);
    setAuditData(null);
    setIsDemoMode(false);

    // If no backend is configured, use demo mode immediately
    if (!API_BASE) {
      await new Promise(r => setTimeout(r, 1800)); // simulate scan delay
      setAuditData(generateMockAudit(formData.url));
      setIsDemoMode(true);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: formData.url,
          business_name: formData.businessName,
          email: formData.email,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail ?? `Error ${response.status}: Audit failed`);
      }

      const data: AuditData = await response.json();
      setAuditData(data);
    } catch (err: unknown) {
      // If backend is unreachable, fall back to demo mode gracefully
      const isNetworkError = err instanceof TypeError && (
        err.message.includes("fetch") ||
        err.message.includes("Failed to fetch") ||
        err.message.includes("NetworkError")
      );

      if (isNetworkError) {
        setAuditData(generateMockAudit(formData.url));
        setIsDemoMode(true);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAuditData(null);
    setError(null);
    setIsDemoMode(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(135deg, #0B1426 0%, #1A2744 60%, #0D1F3C 100%)",
      }}
    >
      {/* Background image overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center right",
          opacity: 0.12,
          zIndex: 0,
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "oklch(0.72 0.14 185 / 0.2)", border: "1px solid oklch(0.72 0.14 185 / 0.4)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="#14B8A6" strokeWidth="1.2" strokeOpacity="0.5" />
              <circle cx="7" cy="7" r="3" stroke="#14B8A6" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="1" fill="#14B8A6" />
            </svg>
          </div>
          <span className="syne font-bold text-white text-sm tracking-wide">SMAIDM SSG</span>
        </div>
        <a
          href="mailto:hello@smaidm.com"
          className="text-xs mono text-white/40 hover:text-white/70 transition-colors"
        >
          hello@smaidm.com
        </a>
      </nav>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl mx-auto">
          {!auditData ? (
            <>
              {/* Hero copy */}
              <div className="text-center mb-10">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mono mb-6"
                  style={{
                    background: "oklch(0.72 0.14 185 / 0.10)",
                    border: "1px solid oklch(0.72 0.14 185 / 0.25)",
                    color: "#14B8A6",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  AI Search Visibility Diagnostic Engine
                </div>

                <h1
                  className="syne font-extrabold text-white leading-tight mb-4"
                  style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
                >
                  Is Your Business{" "}
                  <span style={{ color: "#14B8A6" }}>Invisible</span>{" "}
                  to AI Search?
                </h1>

                <p className="text-white/55 text-base leading-relaxed max-w-lg mx-auto">
                  ChatGPT, Perplexity, and Google SGE are replacing traditional search.
                  Find out if AI engines can find, understand, and recommend your business —
                  in under 60 seconds.
                </p>
              </div>

              {/* Audit form card */}
              <div className="glass-card p-6 sm:p-8">
                <AuditForm onSubmit={handleAudit} isLoading={isLoading} />

                {/* Loading state */}
                {isLoading && (
                  <div className="mt-6 flex flex-col items-center gap-3">
                    <div className="relative w-12 h-12">
                      <div
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: "oklch(0.72 0.14 185 / 0.15)" }}
                      />
                      <div
                        className="absolute inset-2 rounded-full animate-pulse"
                        style={{ background: "oklch(0.72 0.14 185 / 0.3)" }}
                      />
                    </div>
                    <p className="text-xs mono text-white/40">
                      Scanning SEO signals, structured data, and entity consistency...
                    </p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div
                    className="mt-4 p-4 rounded-lg text-sm"
                    style={{
                      background: "oklch(0.65 0.22 15 / 0.10)",
                      border: "1px solid oklch(0.65 0.22 15 / 0.25)",
                      color: "oklch(0.75 0.18 15)",
                    }}
                  >
                    <strong>Audit failed:</strong> {error}
                  </div>
                )}
              </div>

              {/* Trust signals */}
              <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
                <TrustBadge label="SEO Fundamentals" />
                <TrustBadge label="SGO Readiness" />
                <TrustBadge label="GEO Signals" />
              </div>
            </>
          ) : (
            <>
              {/* Demo mode banner */}
              {isDemoMode && (
                <div
                  className="mb-4 px-4 py-3 rounded-lg text-xs mono flex items-center gap-2"
                  style={{
                    background: "oklch(0.75 0.15 60 / 0.10)",
                    border: "1px solid oklch(0.75 0.15 60 / 0.25)",
                    color: "oklch(0.85 0.12 60)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                  <span>
                    <strong>Demo mode</strong> — showing illustrative sample data.
                    Connect the backend API to run a live audit.
                  </span>
                </div>
              )}
              <AuditResults data={auditData} onReset={handleReset} />
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 px-4">
        <p className="text-xs mono text-white/20">
          © 2025 SMAIDM Digital Services · AI Search Visibility Diagnostic Platform
        </p>
      </footer>
    </div>
  );
}

function TrustBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs mono text-white/30">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5l2 2 4-4" stroke="#14B8A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </div>
  );
}
