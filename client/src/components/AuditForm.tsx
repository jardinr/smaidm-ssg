/* ============================================================
   AuditForm — URL input + lead capture form
   Design: Visibility Engine — glassmorphism card, teal CTA
   ============================================================ */
import { useState } from "react";

interface AuditFormProps {
  onSubmit: (data: {
    url: string;
    businessName: string;
    contactName: string;
    email: string;
    phone: string;
  }) => void;
  isLoading: boolean;
}

export function AuditForm({ onSubmit, isLoading }: AuditFormProps) {
  const [url, setUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Normalise a raw input value into a full https:// URL
  const normaliseUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    return `https://${trimmed}`;
  };

  // Strip the https:// prefix for display in the input
  const displayUrl = url.replace(/^https?:\/\//i, "");

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!url.trim()) errs.url = "Website URL is required";
    else if (!/^(https?:\/\/)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+/.test(url.trim())) {
      errs.url = "Please enter a valid website URL";
    }
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const normalisedUrl = normaliseUrl(url);
    onSubmit({
      url: normalisedUrl,
      businessName: businessName.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    fontFamily: "'JetBrains Mono', monospace",
  } as React.CSSProperties;

  const focusHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = "1px solid oklch(0.72 0.14 185 / 0.6)";
    e.target.style.boxShadow = "0 0 0 3px oklch(0.72 0.14 185 / 0.12)";
  };

  const blurHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = "1px solid rgba(255,255,255,0.10)";
    e.target.style.boxShadow = "none";
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">

      {/* URL field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-widest uppercase text-white/50 mono">
          Website URL
        </label>
        <div
          className="relative flex items-center rounded-lg overflow-hidden"
          style={{
            border: errors.url
              ? "1px solid oklch(0.65 0.22 15 / 0.6)"
              : "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <span
            className="pl-4 pr-1 py-3 text-sm select-none shrink-0"
            style={{ color: "oklch(0.72 0.14 185)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            https://
          </span>
          <input
            type="text"
            value={displayUrl}
            onChange={(e) => {
              const stripped = e.target.value
                .replace(/^https?:\/\//i, "")
                .replace(/^\/\//, "");
              setUrl(stripped ? `https://${stripped}` : "");
            }}
            placeholder="yourbusiness.com"
            className="flex-1 pr-4 py-3 bg-transparent text-white placeholder-white/25 text-sm focus:outline-none"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            onFocus={(e) => {
              const parent = e.target.closest("div") as HTMLElement;
              if (parent) {
                parent.style.border = "1px solid oklch(0.72 0.14 185 / 0.6)";
                parent.style.boxShadow = "0 0 0 3px oklch(0.72 0.14 185 / 0.12)";
              }
            }}
            onBlur={(e) => {
              const parent = e.target.closest("div") as HTMLElement;
              if (parent) {
                parent.style.border = errors.url
                  ? "1px solid oklch(0.65 0.22 15 / 0.6)"
                  : "1px solid rgba(255,255,255,0.10)";
                parent.style.boxShadow = "none";
              }
              if (url) setUrl(normaliseUrl(url));
            }}
          />
        </div>
        {errors.url && (
          <p className="text-xs" style={{ color: "oklch(0.75 0.18 15)" }}>{errors.url}</p>
        )}
      </div>

      {/* Two-column row: Contact Name + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-widest uppercase text-white/50 mono">
            Your Name <span className="text-white/25 normal-case tracking-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full px-4 py-3 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none transition-all"
            style={inputStyle}
            onFocus={focusHandler}
            onBlur={blurHandler}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-widest uppercase text-white/50 mono">
            Phone <span className="text-white/25 normal-case tracking-normal">(optional)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+27 82 000 0000"
            className="w-full px-4 py-3 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none transition-all"
            style={inputStyle}
            onFocus={focusHandler}
            onBlur={blurHandler}
          />
        </div>
      </div>

      {/* Business name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-widest uppercase text-white/50 mono">
          Business Name <span className="text-white/25 normal-case tracking-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="ACME Corp"
          className="w-full px-4 py-3 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none transition-all"
          style={inputStyle}
          onFocus={focusHandler}
          onBlur={blurHandler}
        />
      </div>

      {/* Email for lead capture */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-widest uppercase text-white/50 mono">
          Email <span className="text-white/25 normal-case tracking-normal">(get full report)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full px-4 py-3 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none transition-all"
          style={inputStyle}
          onFocus={focusHandler}
          onBlur={blurHandler}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn-teal w-full py-3.5 rounded-lg text-sm font-semibold tracking-wide uppercase disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <ScanIcon />
            Scanning...
          </span>
        ) : (
          "Run Free AI Visibility Audit →"
        )}
      </button>

      <p className="text-xs text-center text-white/25">
        Free audit · No credit card · Results in ~15 seconds
      </p>
    </form>
  );
}

function ScanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-spin">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
