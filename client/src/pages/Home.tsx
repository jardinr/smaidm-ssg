/* ============================================================
   Home — SMAIDM SSG Platform landing page
   Design: Visibility Engine — deep navy hero, centered audit funnel
   Live mode: calls tRPC audit.run → Python backend → DB lead capture
   Demo mode: falls back to mock data when no backend is reachable
   ============================================================ */
import { useState } from "react";
import { AuditForm } from "@/components/AuditForm";
import { AuditResults } from "@/components/AuditResults";
import { generateMockAudit, type AuditData } from "@/lib/mockAudit";
import { trpc } from "@/lib/trpc";

const HERO_BG = "https://private-us-east-1.manuscdn.com/sessionFile/LA7p5OssYnpbYcP7768cVq/sandbox/5PHDfPMQCle2OVyJY3lIc3-img-1_1771959823000_na1fn_aGVyby1iZw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvTEE3cDVPc3NZbnBiWWNQNzc2OGNWcS9zYW5kYm94LzVQSERmUE1RQ2xlMk9WeUpZM2xJYzMtaW1nLTFfMTc3MTk1OTgyMzAwMF9uYTFmbl9hR1Z5YnkxaVp3LnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=JvdZjfkEwBe4EexZQgWSPhsKYVo6vcN42hAsYDYQYBqE4~QaK6~oGZF7NPJ1X7DkaSi7VZqnFB80y~5sU2HwLyhdgq7iYU89IzG9CV5O1K8heqczDGnpMgqQXY2ZJOYfxtWCX1xkDVWncR2-JIY2PH~STwvKHbqWdpgG9kpYfLQ8NukjV2auPkETZ7S6zCAoD4iBFJcR8M3k2bNO2Bn9IadZn3qqYKqsAN4bbNr6wSYZNd3xJV5Zta9-0W3A9pYi5DCzRLhCiGIFGP22SFLsOFOp1xker0~puRQz96pCys9oXYeglQpXWndvj5D63wfMTu2B9TT0KihB7WPYrugOSg__";

export default function Home() {
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const auditMutation = trpc.audit.run.useMutation({
    onSuccess: (result) => {
      if (result.isDemoMode || !result.data) {
        setAuditData(generateMockAudit(""));
        setIsDemoMode(true);
      } else {
        setAuditData(result.data as unknown as AuditData);
        setIsDemoMode(false);
      }
    },
    onError: (err) => {
      setAuditError(err.message ?? "An unexpected error occurred. Please try again.");
    },
  });

  const handleAudit = async (formData: { url: string; businessName: string; email: string }) => {
    setAuditError(null);
    setAuditData(null);
    setIsDemoMode(false);

    auditMutation.mutate({
      url: formData.url,
      businessName: formData.businessName || undefined,
      email: formData.email || undefined,
    });
  };

  const handleReset = () => {
    setAuditData(null);
    setAuditError(null);
    setIsDemoMode(false);
    auditMutation.reset();
  };

  const isLoading = auditMutation.isPending;

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
        <div className="flex items-center gap-3">
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663245699750/iiiwCRQyohWmOVPx.jpeg"
            alt="SMAIDM Logo"
            className="h-8 w-auto object-contain"
            style={{ filter: "drop-shadow(0 0 6px oklch(0.72 0.14 185 / 0.3))" }}
          />
          <span className="syne font-bold text-white text-sm tracking-wide hidden sm:block">SSG Platform</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="tel:+27822660899"
            className="text-xs mono text-white/40 hover:text-white/70 transition-colors hidden sm:block"
          >
            082 266 0899
          </a>
          <a
            href="mailto:smaidmsagency@outlook.com"
            className="text-xs mono text-white/40 hover:text-white/70 transition-colors"
          >
            smaidmsagency@outlook.com
          </a>
        </div>
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
                {auditError && (
                  <div
                    className="mt-4 p-4 rounded-lg text-sm"
                    style={{
                      background: "oklch(0.65 0.22 15 / 0.10)",
                      border: "1px solid oklch(0.65 0.22 15 / 0.25)",
                      color: "oklch(0.75 0.18 15)",
                    }}
                  >
                    <strong>Audit failed:</strong> {auditError}
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
      <footer className="relative z-10 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs mono text-white/40 font-medium">Jardin Roestorff · Founder, SMAIDM</p>
              <p className="text-xs mono text-white/20 mt-0.5">© 2026 SMAIDM Digital Services · AI Search Visibility Diagnostic Platform</p>
            </div>
            <div className="flex items-center gap-5">
              <a
                href="mailto:smaidmsagency@outlook.com"
                className="text-xs mono text-white/30 hover:text-teal-400 transition-colors"
              >
                smaidmsagency@outlook.com
              </a>
              <a
                href="tel:+27822660899"
                className="text-xs mono text-white/30 hover:text-teal-400 transition-colors"
              >
                082 266 0899
              </a>
              <a
                href="https://quzllhzj.manus.space/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs mono text-white/30 hover:text-teal-400 transition-colors"
              >
                Website
              </a>
              <a
                href="http://www.youtube.com/@SMAIDM"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs mono text-white/30 hover:text-teal-400 transition-colors"
              >
                YouTube
              </a>
            </div>
          </div>
        </div>
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
