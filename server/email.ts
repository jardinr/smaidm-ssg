/**
 * Resend Email Helper
 *
 * Sends transactional HTML emails via the Resend API.
 * Credentials are injected from the RESEND_API_KEY environment variable.
 *
 * Sending address: onboarding@resend.dev (Resend shared domain — works immediately,
 * no DNS setup required). Once a custom domain is verified in the Resend dashboard,
 * update FROM_ADDRESS to e.g. "SMAIDM <noreply@smaidm.co.za>".
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "SMAIDM SSG Platform <onboarding@resend.dev>";
const OWNER_EMAIL = "smaidmsagency@outlook.com";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/** A single audit finding from the scoring engine */
export interface AuditFinding {
  dimension: string;
  criterion: string;
  issue: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  points_lost: number;
}

/**
 * Send a transactional email via Resend.
 * Returns { success: true, id } on success, { success: false, error } on failure.
 * Never throws — callers should treat email delivery as non-fatal.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY is not configured — skipping email delivery");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await response.json().catch(() => ({})) as Record<string, unknown>;

    if (!response.ok) {
      const errMsg = (data.message as string) ?? `Resend API error ${response.status}`;
      console.error("[Email] Resend API error:", errMsg);
      return { success: false, error: errMsg };
    }

    const id = data.id as string | undefined;
    console.log(`[Email] Sent successfully to ${opts.to} — id: ${id}`);
    return { success: true, id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Email] Send failed:", msg);
    return { success: false, error: msg };
  }
}

// ── HTML email builder ────────────────────────────────────────────────────────

/**
 * Build the HTML audit report email for a tester.
 * Includes:
 *   - Full score breakdown (SEO / SGO / GEO)
 *   - Detailed findings table (all issues with severity and points lost)
 *   - Top 3 priority gaps
 *   - 24-48hr urgent offer at a discounted rate
 *   - Follow-up CTA after the offer expires
 */
export function buildAuditReportHtml(params: {
  url: string;
  businessName: string | null;
  contactName: string | null;
  overallScore: number | null;
  seoScore: number | null;
  sgoScore: number | null;
  geoScore: number | null;
  tier: string;
  regularCost: string;
  urgentCost: string;
  isDemoMode: boolean;
  offerExpiresAt: string; // ISO string — 48 hrs from now
  findings?: AuditFinding[];
  topGaps?: string[];
  /** Optional Calendly booking URL — falls back to mailto: if not provided */
  calendlyUrl?: string;
}): string {
  const {
    url, businessName, contactName,
    overallScore, seoScore, sgoScore, geoScore,
    tier, regularCost, urgentCost, isDemoMode, offerExpiresAt,
    findings = [], topGaps = [],
    calendlyUrl,
  } = params;

  const siteName = businessName ?? url.replace(/https?:\/\/(www\.)?/, "").split("/")[0];
  const greeting = contactName ? `Hi ${contactName},` : "Hi,";
  const scoreDisplay = overallScore != null ? `${overallScore}/100` : "Demo";

  const scoreColor = (s: number | null) => {
    if (s === null) return "#6B7280";
    if (s >= 75) return "#10B981";
    if (s >= 50) return "#F59E0B";
    if (s >= 25) return "#F97316";
    return "#EF4444";
  };

  const severityColor = (sev: string) => {
    switch (sev) {
      case "Critical": return "#EF4444";
      case "High":     return "#F97316";
      case "Medium":   return "#F59E0B";
      case "Low":      return "#6B7280";
      default:         return "#6B7280";
    }
  };

  const severityBg = (sev: string) => {
    switch (sev) {
      case "Critical": return "rgba(239,68,68,0.12)";
      case "High":     return "rgba(249,115,22,0.12)";
      case "Medium":   return "rgba(245,158,11,0.12)";
      case "Low":      return "rgba(107,114,128,0.12)";
      default:         return "rgba(107,114,128,0.12)";
    }
  };

  const whatItMeans = (() => {
    if (isDemoMode || overallScore === null)
      return "This was a demo audit. A live audit will reveal your actual AI visibility signals and exactly what to fix first.";
    if (overallScore >= 90)
      return "Your site is AI-ready — ChatGPT, Perplexity, and Google SGE can find and recommend you. Monthly monitoring keeps you there.";
    if (overallScore >= 75)
      return "You're close to being AI-recommended. A few targeted fixes to your structured data and content structure will push you into the top tier.";
    if (overallScore >= 50)
      return "AI engines can find your site but are not actively recommending it. The key gaps are structured data (schema markup) and question-based content architecture.";
    if (overallScore >= 25)
      return "Your site is visible in traditional search but largely invisible to AI engines like ChatGPT and Perplexity. Schema markup, entity signals, and FAQ content are the priority fixes.";
    return "Your site is effectively invisible to AI search engines. This is fully fixable — most clients see a 30–40 point improvement in the first session.";
  })();

  const offerDate = new Date(offerExpiresAt).toLocaleDateString("en-ZA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // ── Findings section HTML ────────────────────────────────────────────────────
  const findingsHtml = (() => {
    if (!findings || findings.length === 0) return "";

    const criticalFindings = findings.filter(f => f.severity === "Critical");
    const highFindings     = findings.filter(f => f.severity === "High");
    const mediumFindings   = findings.filter(f => f.severity === "Medium");
    const lowFindings      = findings.filter(f => f.severity === "Low");

    const renderGroup = (label: string, items: AuditFinding[]) => {
      if (items.length === 0) return "";
      const rows = items.map(f => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:top;">
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:${severityBg(f.severity)};color:${severityColor(f.severity)};font-family:monospace;">${f.severity}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:top;">
            <p style="margin:0 0 2px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.85);">${f.dimension} — ${f.criterion}</p>
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.55);line-height:1.5;">${f.issue}</p>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:top;text-align:right;white-space:nowrap;">
            <span style="font-size:12px;font-weight:700;color:${severityColor(f.severity)};font-family:monospace;">−${f.points_lost} pts</span>
          </td>
        </tr>`).join("");
      return rows;
    };

    const allRows = [
      renderGroup("Critical", criticalFindings),
      renderGroup("High", highFindings),
      renderGroup("Medium", mediumFindings),
      renderGroup("Low", lowFindings),
    ].join("");

    const passedCount = 0; // Findings only lists issues; passed checks are implicit
    const totalIssues = findings.length;

    return `
        <!-- Findings Detail Section -->
        <tr>
          <td style="background:#0F1E35;padding:24px 32px 0;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;color:rgba(255,255,255,0.4);font-family:monospace;text-transform:uppercase;">Detailed Findings</p>
            <p style="margin:0 0 16px;font-size:13px;color:rgba(255,255,255,0.5);">${totalIssues} issue${totalIssues !== 1 ? "s" : ""} identified across SEO, SGO, and GEO dimensions</p>
          </td>
        </tr>
        <tr>
          <td style="background:#0F1E35;padding:0 32px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:rgba(255,255,255,0.04);">
                  <th style="padding:10px 12px;text-align:left;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,0.35);font-family:monospace;text-transform:uppercase;font-weight:600;width:90px;">Severity</th>
                  <th style="padding:10px 12px;text-align:left;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,0.35);font-family:monospace;text-transform:uppercase;font-weight:600;">Issue</th>
                  <th style="padding:10px 12px;text-align:right;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,0.35);font-family:monospace;text-transform:uppercase;font-weight:600;width:70px;">Impact</th>
                </tr>
              </thead>
              <tbody>
                ${allRows}
              </tbody>
            </table>
          </td>
        </tr>`;
  })();

  // ── Top Gaps section HTML ────────────────────────────────────────────────────
  const topGapsHtml = (() => {
    if (!topGaps || topGaps.length === 0) return "";
    const items = topGaps.map((gap, i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:28px;vertical-align:top;">
                <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:rgba(239,68,68,0.15);text-align:center;line-height:20px;font-size:11px;font-weight:700;color:#EF4444;font-family:monospace;">${i + 1}</span>
              </td>
              <td style="vertical-align:top;padding-left:8px;">
                <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);line-height:1.5;">${gap}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`).join("");
    return `
        <!-- Top Priority Gaps -->
        <tr>
          <td style="background:#0F1E35;padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0 0 16px;font-size:12px;letter-spacing:1px;color:rgba(255,255,255,0.4);font-family:monospace;text-transform:uppercase;">Top ${topGaps.length} Priority Fixes</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${items}
            </table>
          </td>
        </tr>`;
  })();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your AI Visibility Audit Report — ${siteName}</title>
</head>
<body style="margin:0;padding:0;background:#0B1426;font-family:'Segoe UI',Arial,sans-serif;color:#E2E8F0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1426;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0D1F3C;border-radius:12px 12px 0 0;padding:32px 32px 24px;border-bottom:1px solid rgba(20,184,166,0.2);">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#14B8A6;font-family:monospace;text-transform:uppercase;">SMAIDM SSG Platform</p>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;">Your AI Visibility Audit Report</h1>
            <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.5);">${siteName} &nbsp;·&nbsp; ${url}</p>
          </td>
        </tr>

        <!-- Score card -->
        <tr>
          <td style="background:#0F1E35;padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0 0 16px;font-size:12px;letter-spacing:1px;color:rgba(255,255,255,0.4);font-family:monospace;text-transform:uppercase;">Overall Score</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:52px;font-weight:800;color:${scoreColor(overallScore)};font-family:monospace;">${scoreDisplay}</span>
                  <span style="font-size:16px;color:rgba(255,255,255,0.3);margin-left:4px;">— ${tier}</span>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr>
                <td width="33%" style="text-align:center;padding:12px;background:rgba(255,255,255,0.04);border-radius:8px;">
                  <p style="margin:0;font-size:22px;font-weight:700;color:${scoreColor(seoScore)};font-family:monospace;">${seoScore ?? "—"}</p>
                  <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">SEO</p>
                  <p style="margin:2px 0 0;font-size:10px;color:rgba(255,255,255,0.25);">Search Discoverability</p>
                </td>
                <td width="4px"></td>
                <td width="33%" style="text-align:center;padding:12px;background:rgba(255,255,255,0.04);border-radius:8px;">
                  <p style="margin:0;font-size:22px;font-weight:700;color:${scoreColor(sgoScore)};font-family:monospace;">${sgoScore ?? "—"}</p>
                  <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">SGO</p>
                  <p style="margin:2px 0 0;font-size:10px;color:rgba(255,255,255,0.25);">AI Answer Readiness</p>
                </td>
                <td width="4px"></td>
                <td width="33%" style="text-align:center;padding:12px;background:rgba(255,255,255,0.04);border-radius:8px;">
                  <p style="margin:0;font-size:22px;font-weight:700;color:${scoreColor(geoScore)};font-family:monospace;">${geoScore ?? "—"}</p>
                  <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">GEO</p>
                  <p style="margin:2px 0 0;font-size:10px;color:rgba(255,255,255,0.25);">Business Trust & Authority</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- What it means -->
        <tr>
          <td style="background:#0F1E35;padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:1px;color:rgba(255,255,255,0.4);font-family:monospace;text-transform:uppercase;">What This Means</p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.75);">${whatItMeans}</p>
          </td>
        </tr>

        ${topGapsHtml}
        ${findingsHtml}

        <!-- URGENT OFFER BANNER -->
        <tr>
          <td style="background:linear-gradient(135deg,#0D2B1F 0%,#0A2218 100%);padding:28px 32px;border:1px solid rgba(20,184,166,0.3);border-radius:0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;color:#14B8A6;font-family:monospace;text-transform:uppercase;">⚡ 48-Hour Priority Fix Offer</p>
                  <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#FFFFFF;">Act Now — Save on Your Fix</h2>
                  <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.65);">
                    Book your AI visibility fix within <strong style="color:#14B8A6;">48 hours</strong> and lock in our priority rate.
                    After this window closes, the standard rate applies.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                    <tr>
                      <td width="48%" style="background:rgba(255,255,255,0.04);border-radius:8px;padding:14px;text-align:center;">
                        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Priority Rate (48hrs)</p>
                        <p style="margin:6px 0 0;font-size:20px;font-weight:800;color:#14B8A6;font-family:monospace;">${urgentCost}</p>
                      </td>
                      <td width="4%"></td>
                      <td width="48%" style="background:rgba(255,255,255,0.02);border-radius:8px;padding:14px;text-align:center;opacity:0.6;">
                        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Standard Rate (after)</p>
                        <p style="margin:6px 0 0;font-size:20px;font-weight:800;color:rgba(255,255,255,0.5);font-family:monospace;text-decoration:line-through;">${regularCost}</p>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 16px;font-size:12px;color:rgba(255,255,255,0.4);font-family:monospace;">⏰ Offer expires: ${offerDate}</p>
                  <a href="${calendlyUrl ?? `mailto:smaidmsagency@outlook.com?subject=Priority Fix — ${siteName} (${scoreDisplay})&body=Hi Jardin,%0A%0AI want to book the 48-hour priority fix for ${url}.%0A%0APlease confirm availability.`}"
                     style="display:inline-block;background:#14B8A6;color:#0B1426;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;">
                    📅 Book Priority Fix Now →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Follow-up note -->
        <tr>
          <td style="background:#0D1F3C;padding:24px 32px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.6);line-height:1.6;">
              ${greeting} If you have any questions about your report or would like to discuss the findings, reply to this email or reach out directly:
            </p>
            <p style="margin:12px 0 0;font-size:13px;color:rgba(255,255,255,0.5);">
              📧 <a href="mailto:smaidmsagency@outlook.com" style="color:#14B8A6;text-decoration:none;">smaidmsagency@outlook.com</a>
              &nbsp;&nbsp;📞 <a href="tel:+27822660899" style="color:#14B8A6;text-decoration:none;">082 266 0899</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0B1426;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);">
              Jardin Roestorff · Founder, SMAIDM Digital Services · AI Search Visibility Specialist<br/>
              © 2026 SMAIDM · <a href="https://quzllhzj.manus.space/" style="color:rgba(255,255,255,0.3);text-decoration:none;">smaidm.co.za</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Build the plain-text fallback for the audit report email.
 * Includes full findings breakdown.
 */
export function buildAuditReportText(params: {
  url: string;
  businessName: string | null;
  contactName: string | null;
  overallScore: number | null;
  seoScore: number | null;
  sgoScore: number | null;
  geoScore: number | null;
  tier: string;
  regularCost: string;
  urgentCost: string;
  isDemoMode: boolean;
  offerExpiresAt: string;
  findings?: AuditFinding[];
  topGaps?: string[];
  /** Optional Calendly booking URL — falls back to mailto instructions if not provided */
  calendlyUrl?: string;
}): string {
  const {
    url, businessName, contactName,
    overallScore, seoScore, sgoScore, geoScore,
    tier, regularCost, urgentCost, isDemoMode, offerExpiresAt,
    findings = [], topGaps = [],
    calendlyUrl,
  } = params;
  const siteName = businessName ?? url.replace(/https?:\/\/(www\.)?/, "").split("/")[0];
  const greeting = contactName ? `Hi ${contactName},` : "Hi,";
  const scoreDisplay = overallScore != null ? `${overallScore}/100` : "Demo";
  const offerDate = new Date(offerExpiresAt).toLocaleDateString("en-ZA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const bookingInstructions = calendlyUrl
    ? `Book your slot here: ${calendlyUrl}`
    : `To book: smaidmsagency@outlook.com or call 082 266 0899\nSubject line to use: "Priority Fix — ${siteName} (${scoreDisplay})"`;

  // Build findings text block
  const findingsText = (() => {
    if (!findings || findings.length === 0) return "";
    const lines = ["", "── DETAILED FINDINGS ───────────────────────"];
    const severityOrder = ["Critical", "High", "Medium", "Low"];
    for (const sev of severityOrder) {
      const group = findings.filter(f => f.severity === sev);
      if (group.length === 0) continue;
      lines.push(`\n  [${sev.toUpperCase()}]`);
      for (const f of group) {
        lines.push(`  • ${f.dimension} — ${f.criterion} (−${f.points_lost} pts)`);
        lines.push(`    ${f.issue}`);
      }
    }
    return lines.join("\n");
  })();

  const topGapsText = (() => {
    if (!topGaps || topGaps.length === 0) return "";
    const lines = ["", "── TOP PRIORITY FIXES ──────────────────────"];
    topGaps.forEach((gap, i) => lines.push(`  ${i + 1}. ${gap}`));
    return lines.join("\n");
  })();

  return `${greeting}
Thank you for running your free AI Visibility Audit on the SMAIDM SSG Platform.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OVERALL SCORE:  ${scoreDisplay} — ${tier}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SEO Fundamentals:          ${seoScore ?? "—"}/100  (Search Discoverability)
  SGO (Search Generative):   ${sgoScore ?? "—"}/100  (AI Answer Readiness)
  GEO (Generative Engine):   ${geoScore ?? "—"}/100  (Business Trust & Authority)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${isDemoMode ? "\nNote: This was a demo audit. A live audit will analyse your actual website.\n" : ""}${topGapsText}${findingsText}

⚡ 48-HOUR PRIORITY FIX OFFER
──────────────────────────────
Book your AI visibility fix within 48 hours and lock in the priority rate:
  Priority Rate (48hrs):  ${urgentCost}
  Standard Rate (after):  ${regularCost}
Offer expires: ${offerDate}
${bookingInstructions}
──────────────────────────────
If the 48-hour window has passed, reach out anytime — we will discuss the best path forward.
Jardin Roestorff
Founder, SMAIDM Digital Services
smaidmsagency@outlook.com | 082 266 0899`.trim();
}

// ── Owner notification email ──────────────────────────────────────────────────

/**
 * Build and send a direct email notification to the platform owner
 * (smaidmsagency@outlook.com) on every audit completion.
 * This is independent of Zapier — it fires via Resend directly.
 */
export async function sendOwnerAuditNotification(params: {
  url: string;
  businessName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  overallScore: number | null;
  seoScore: number | null;
  sgoScore: number | null;
  geoScore: number | null;
  tier: string;
  upgradeCost: string;
  urgentCost: string;
  isDemoMode: boolean;
  findings?: AuditFinding[];
  topGaps?: string[];
}): Promise<SendEmailResult> {
  const {
    url, businessName, contactName, email, phone,
    overallScore, seoScore, sgoScore, geoScore,
    tier, upgradeCost, urgentCost, isDemoMode,
    findings = [], topGaps = [],
  } = params;

  const siteName = businessName ?? url.replace(/https?:\/\/(www\.)?/, "").split("/")[0];
  const scoreDisplay = overallScore != null ? `${overallScore}/100` : "Demo";
  const hasContact = email || phone;
  const displayName = contactName ?? businessName ?? "Anonymous visitor";

  const urgencySignal = overallScore === null ? "⚠️ Demo mode"
    : overallScore < 25 ? "🔴 CRITICAL — high-value lead, act within 24hrs"
    : overallScore < 50 ? "🟠 HIGH PRIORITY — strong upgrade potential"
    : overallScore < 75 ? "🟡 MEDIUM PRIORITY — targeted fixes available"
    : overallScore < 90 ? "🟢 LOW PRIORITY — close to AI-ready, small win"
    : "✅ AI-READY — monitoring upsell opportunity";

  const severityColor = (sev: string) => {
    switch (sev) {
      case "Critical": return "#EF4444";
      case "High":     return "#F97316";
      case "Medium":   return "#F59E0B";
      case "Low":      return "#6B7280";
      default:         return "#6B7280";
    }
  };

  const findingsHtml = (() => {
    if (!findings || findings.length === 0) return "<p style='color:rgba(255,255,255,0.4);font-size:12px;'>No findings data (demo mode or backend offline)</p>";
    const rows = findings.map(f => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;color:${severityColor(f.severity)};font-family:monospace;font-weight:700;">${f.severity}</td>
        <td style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;color:rgba(255,255,255,0.7);">${f.dimension} — ${f.criterion}</td>
        <td style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;color:rgba(255,255,255,0.5);">${f.issue}</td>
        <td style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;color:${severityColor(f.severity)};font-family:monospace;text-align:right;">−${f.points_lost}</td>
      </tr>`).join("");
    return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:11px;">
      <thead><tr style="background:rgba(255,255,255,0.06);">
        <th style="padding:6px 10px;text-align:left;color:rgba(255,255,255,0.35);font-family:monospace;font-size:10px;text-transform:uppercase;">Severity</th>
        <th style="padding:6px 10px;text-align:left;color:rgba(255,255,255,0.35);font-family:monospace;font-size:10px;text-transform:uppercase;">Dimension</th>
        <th style="padding:6px 10px;text-align:left;color:rgba(255,255,255,0.35);font-family:monospace;font-size:10px;text-transform:uppercase;">Issue</th>
        <th style="padding:6px 10px;text-align:right;color:rgba(255,255,255,0.35);font-family:monospace;font-size:10px;text-transform:uppercase;">Pts</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  })();

  const topGapsHtml = topGaps.length > 0
    ? topGaps.map((g, i) => `<p style="margin:4px 0;font-size:12px;color:rgba(255,255,255,0.7);"><strong style="color:#EF4444;">${i + 1}.</strong> ${g}</p>`).join("")
    : "<p style='font-size:12px;color:rgba(255,255,255,0.4);'>No top gaps data</p>";

  const mailtoLink = `mailto:${email ?? ""}?subject=Your AI Visibility Score: ${scoreDisplay} — ${siteName}&body=Hi ${contactName ?? "there"},%0A%0AThank you for running your audit...`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>New Audit Lead — ${siteName}</title></head>
<body style="margin:0;padding:0;background:#0B1426;font-family:'Segoe UI',Arial,sans-serif;color:#E2E8F0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1426;padding:24px 16px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

        <tr><td style="background:#0D1F3C;border-radius:10px 10px 0 0;padding:24px 28px 20px;border-bottom:1px solid rgba(20,184,166,0.2);">
          <p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;color:#14B8A6;font-family:monospace;text-transform:uppercase;">SMAIDM SSG — Owner Notification</p>
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;">🔔 New Audit Lead</h1>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.5);">${siteName} &nbsp;·&nbsp; ${url}</p>
        </td></tr>

        <tr><td style="background:#0F1E35;padding:20px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0 0 4px;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,0.35);font-family:monospace;text-transform:uppercase;">Urgency Signal</p>
          <p style="margin:0;font-size:14px;font-weight:600;color:#FFFFFF;">${urgencySignal}</p>
        </td></tr>

        <tr><td style="background:#0F1E35;padding:20px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0 0 12px;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,0.35);font-family:monospace;text-transform:uppercase;">Client Details</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.5);">Name</td>
              <td width="50%" style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.85);font-weight:600;">${contactName ?? "Not provided"}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.5);">Business</td>
              <td style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.85);font-weight:600;">${businessName ?? "Not provided"}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.5);">Email</td>
              <td style="padding:4px 0;font-size:12px;color:#14B8A6;">${email ? `<a href="${mailtoLink}" style="color:#14B8A6;text-decoration:none;">${email}</a>` : "Not provided"}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.5);">Phone</td>
              <td style="padding:4px 0;font-size:12px;color:#14B8A6;">${phone ? `<a href="tel:${phone}" style="color:#14B8A6;text-decoration:none;">${phone}</a>` : "Not provided"}</td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="background:#0F1E35;padding:20px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0 0 12px;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,0.35);font-family:monospace;text-transform:uppercase;">Audit Scores</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-size:12px;color:rgba(255,255,255,0.5);">Overall Score</td>
              <td style="padding:6px 0;font-size:14px;font-weight:800;color:#FFFFFF;font-family:monospace;">${scoreDisplay} — ${tier}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.5);">SEO (Search Discoverability)</td>
              <td style="padding:4px 0;font-size:12px;font-weight:700;color:#FFFFFF;font-family:monospace;">${seoScore ?? "—"}/100</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.5);">SGO (AI Answer Readiness)</td>
              <td style="padding:4px 0;font-size:12px;font-weight:700;color:#FFFFFF;font-family:monospace;">${sgoScore ?? "—"}/100</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.5);">GEO (Business Trust & Authority)</td>
              <td style="padding:4px 0;font-size:12px;font-weight:700;color:#FFFFFF;font-family:monospace;">${geoScore ?? "—"}/100</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.5);">Mode</td>
              <td style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.7);">${isDemoMode ? "Demo (backend offline)" : "Live audit"}</td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="background:#0F1E35;padding:20px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0 0 10px;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,0.35);font-family:monospace;text-transform:uppercase;">Top Priority Fixes</p>
          ${topGapsHtml}
        </td></tr>

        <tr><td style="background:#0F1E35;padding:20px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0 0 10px;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,0.35);font-family:monospace;text-transform:uppercase;">All Findings (${findings.length} issues)</p>
          ${findingsHtml}
        </td></tr>

        <tr><td style="background:#0D2B1F;padding:20px 28px;border:1px solid rgba(20,184,166,0.2);">
          <p style="margin:0 0 8px;font-size:10px;letter-spacing:1px;color:#14B8A6;font-family:monospace;text-transform:uppercase;">Investment</p>
          <p style="margin:0 0 4px;font-size:13px;color:rgba(255,255,255,0.7);">Standard rate: <strong style="color:#FFFFFF;">${upgradeCost}</strong></p>
          <p style="margin:0 0 12px;font-size:13px;color:rgba(255,255,255,0.7);">24-hr priority rate: <strong style="color:#14B8A6;">${urgentCost}</strong> ← 20% discount if booked today</p>
          ${hasContact ? `<a href="${mailtoLink}" style="display:inline-block;background:#14B8A6;color:#0B1426;font-weight:700;font-size:13px;padding:12px 24px;border-radius:6px;text-decoration:none;">Reply to Lead →</a>` : ""}
        </td></tr>

        <tr><td style="background:#0B1426;border-radius:0 0 10px 10px;padding:16px 28px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">SMAIDM SSG Platform · Owner Notification · ${new Date().toLocaleString("en-ZA")}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const subject = hasContact
    ? `🔔 New Lead: ${displayName} audited ${siteName} — ${scoreDisplay}`
    : `👁 Anonymous audit: ${siteName} — ${scoreDisplay}`;

  return sendEmail({
    to: OWNER_EMAIL,
    subject,
    html,
  });
}
