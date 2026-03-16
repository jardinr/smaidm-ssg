/* ============================================================
   UrgencyOfferBanner — 24-hour countdown urgency offer
   Displays a time-limited discounted rate CTA at the top of
   AuditResults. Counts down from 24 hours from first render.
   Visibility Engine design: deep navy + teal + amber accents.
   ============================================================ */
import { useEffect, useRef, useState } from "react";

interface UrgencyOfferBannerProps {
  /** The standard (full) rate string, e.g. "R 9,500 once-off + R 1,200/mo" */
  regularCost: string;
  /** The discounted urgency rate string, e.g. "R 7,600 once-off + R 1,200/mo" */
  urgentCost: string;
  /** Business name or URL for the mailto subject line */
  siteName: string;
  /** Overall audit score (0–100) or null for demo */
  score: number | null;
  /** Tier label, e.g. "Poor (D)" */
  tier: string;
  /** Optional Calendly booking URL — falls back to mailto if not provided */
  calendlyUrl?: string;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(expiresAt: number): TimeLeft {
  const diff = Math.max(0, expiresAt - Date.now());
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function UrgencyOfferBanner({
  regularCost,
  urgentCost,
  siteName,
  score,
  tier,
  calendlyUrl,
}: UrgencyOfferBannerProps) {
  // Persist the expiry time across re-renders using a ref
  const expiresAtRef = useRef<number>(Date.now() + 24 * 60 * 60 * 1000);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calcTimeLeft(expiresAtRef.current)
  );
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calcTimeLeft(expiresAtRef.current);
      setTimeLeft(remaining);
      if (
        remaining.hours === 0 &&
        remaining.minutes === 0 &&
        remaining.seconds === 0
      ) {
        setExpired(true);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const scoreDisplay = score != null ? `${score}/100` : "Demo";
  const mailtoSubject = encodeURIComponent(
    `Priority Fix — ${siteName} (${scoreDisplay})`
  );
  const mailtoBody = encodeURIComponent(
    `Hi Jardin,\n\nI want to book the 48-hour priority fix for ${siteName}.\n\nPlease confirm availability.`
  );
  const ctaHref = calendlyUrl
    ? calendlyUrl
    : `mailto:smaidmsagency@outlook.com?subject=${mailtoSubject}&body=${mailtoBody}`;
  const ctaLabel = calendlyUrl ? "Book a Strategy Call →" : "Book Priority Fix Now →";

  if (expired) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "20px" }}>⏰</span>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.5,
            }}
          >
            The 24-hour priority offer has expired. Reach out anytime — we will
            discuss the best path forward for{" "}
            <strong style={{ color: "rgba(255,255,255,0.8)" }}>{siteName}</strong>.
          </p>
          <a
            href={`mailto:smaidmsagency@outlook.com`}
            style={{
              display: "inline-block",
              marginTop: "8px",
              fontSize: "13px",
              color: "#14B8A6",
              textDecoration: "none",
            }}
          >
            smaidmsagency@outlook.com
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(20,184,166,0.08) 100%)",
        border: "1px solid rgba(245,158,11,0.35)",
        borderRadius: "12px",
        padding: "20px 24px",
        marginBottom: "28px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle pulse ring decoration */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-40px",
          right: "-40px",
          width: "160px",
          height: "160px",
          borderRadius: "50%",
          border: "1px solid rgba(245,158,11,0.15)",
          pointerEvents: "none",
        }}
      />

      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "14px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            background: "rgba(245,158,11,0.18)",
            color: "#F59E0B",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            padding: "3px 10px",
            borderRadius: "20px",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ⚡ Limited Offer
        </span>
        <span
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          Expires in:
        </span>
        {/* Countdown timer */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            alignItems: "center",
          }}
        >
          {[
            { value: timeLeft.hours, label: "hr" },
            { value: timeLeft.minutes, label: "min" },
            { value: timeLeft.seconds, label: "sec" },
          ].map(({ value, label }, i) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              {i > 0 && (
                <span
                  style={{
                    color: "rgba(245,158,11,0.6)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "16px",
                    marginRight: "2px",
                  }}
                >
                  :
                </span>
              )}
              <span
                style={{
                  background: "rgba(245,158,11,0.15)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  borderRadius: "6px",
                  padding: "2px 7px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#F59E0B",
                  minWidth: "36px",
                  textAlign: "center",
                }}
              >
                {pad(value)}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.35)",
                  marginLeft: "2px",
                }}
              >
                {label}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "24px",
          flexWrap: "wrap",
        }}
      >
        {/* Pricing comparison */}
        <div style={{ flex: "1 1 220px" }}>
          <p
            style={{
              margin: "0 0 6px",
              fontSize: "13px",
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            24-Hour Priority Rate
          </p>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: "22px",
              fontWeight: 800,
              color: "#14B8A6",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {urgentCost}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "rgba(255,255,255,0.35)",
              textDecoration: "line-through",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Standard: {regularCost}
          </p>
        </div>

        {/* Score + tier badge */}
        <div
          style={{
            flex: "0 0 auto",
            textAlign: "center",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
            padding: "12px 20px",
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: "11px",
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            Your Score
          </p>
          <p
            style={{
              margin: "0 0 2px",
              fontSize: "26px",
              fontWeight: 800,
              color: "#fff",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {scoreDisplay}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            {tier}
          </p>
        </div>

        {/* CTA button */}
        <div
          style={{
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
          }}
        >
          <a
            href={ctaHref}
            target={calendlyUrl ? "_blank" : undefined}
            rel={calendlyUrl ? "noopener noreferrer" : undefined}
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)",
              color: "#0B1426",
              fontWeight: 700,
              fontSize: "14px",
              padding: "14px 28px",
              borderRadius: "8px",
              textDecoration: "none",
              whiteSpace: "nowrap",
              boxShadow: "0 0 20px rgba(20,184,166,0.3)",
              transition: "box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 0 32px rgba(20,184,166,0.55)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 0 20px rgba(20,184,166,0.3)";
            }}
          >
            {ctaLabel}
          </a>
        </div>
      </div>

      {/* Fine print */}
      <p
        style={{
          margin: "14px 0 0",
          fontSize: "11px",
          color: "rgba(255,255,255,0.3)",
          lineHeight: 1.5,
        }}
      >
        Offer valid for 24 hours from audit completion. After expiry, standard rates apply.
        Contact{" "}
        <a
          href="mailto:smaidmsagency@outlook.com"
          style={{ color: "rgba(20,184,166,0.7)", textDecoration: "none" }}
        >
          smaidmsagency@outlook.com
        </a>{" "}
        or call{" "}
        <a
          href="tel:+27822660899"
          style={{ color: "rgba(20,184,166,0.7)", textDecoration: "none" }}
        >
          082 266 0899
        </a>
        .
      </p>
    </div>
  );
}
