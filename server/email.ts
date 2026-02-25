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
 *   - Full score breakdown
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
}): string {
  const {
    url, businessName, contactName,
    overallScore, seoScore, sgoScore, geoScore,
    tier, regularCost, urgentCost, isDemoMode, offerExpiresAt,
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
                <td width="33%" style="text-align:center;padding:12px;background:rgba(255,255,255,0.04);border-radius:8px;margin-right:4px;">
                  <p style="margin:0;font-size:22px;font-weight:700;color:${scoreColor(seoScore)};font-family:monospace;">${seoScore ?? "—"}</p>
                  <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">SEO</p>
                </td>
                <td width="4px"></td>
                <td width="33%" style="text-align:center;padding:12px;background:rgba(255,255,255,0.04);border-radius:8px;">
                  <p style="margin:0;font-size:22px;font-weight:700;color:${scoreColor(sgoScore)};font-family:monospace;">${sgoScore ?? "—"}</p>
                  <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">SGO</p>
                </td>
                <td width="4px"></td>
                <td width="33%" style="text-align:center;padding:12px;background:rgba(255,255,255,0.04);border-radius:8px;">
                  <p style="margin:0;font-size:22px;font-weight:700;color:${scoreColor(geoScore)};font-family:monospace;">${geoScore ?? "—"}</p>
                  <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">GEO</p>
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
                  <a href="mailto:smaidmsagency@outlook.com?subject=Priority Fix — ${siteName} (${scoreDisplay})&body=Hi Jardin,%0A%0AI want to book the 48-hour priority fix for ${url}.%0A%0APlease confirm availability."
                     style="display:inline-block;background:#14B8A6;color:#0B1426;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;">
                    Book Priority Fix Now →
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
              If the 48-hour window has passed, no problem — reach out anytime and we will discuss the best path forward for ${siteName}.
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
}): string {
  const {
    url, businessName, contactName,
    overallScore, seoScore, sgoScore, geoScore,
    tier, regularCost, urgentCost, isDemoMode, offerExpiresAt,
  } = params;

  const siteName = businessName ?? url.replace(/https?:\/\/(www\.)?/, "").split("/")[0];
  const greeting = contactName ? `Hi ${contactName},` : "Hi,";
  const scoreDisplay = overallScore != null ? `${overallScore}/100` : "Demo";
  const offerDate = new Date(offerExpiresAt).toLocaleDateString("en-ZA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return `${greeting}

Thank you for running your free AI Visibility Audit on the SMAIDM SSG Platform.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OVERALL SCORE:  ${scoreDisplay} — ${tier}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SEO Fundamentals:          ${seoScore ?? "—"}/100
  SGO (Search Generative):   ${sgoScore ?? "—"}/100
  GEO (Generative Engine):   ${geoScore ?? "—"}/100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${isDemoMode ? "\nNote: This was a demo audit. A live audit will analyse your actual website.\n" : ""}

⚡ 48-HOUR PRIORITY FIX OFFER
──────────────────────────────
Book your AI visibility fix within 48 hours and lock in the priority rate:

  Priority Rate (48hrs):  ${urgentCost}
  Standard Rate (after):  ${regularCost}

Offer expires: ${offerDate}

To book: smaidmsagency@outlook.com or call 082 266 0899

Subject line to use: "Priority Fix — ${siteName} (${scoreDisplay})"

──────────────────────────────
If the 48-hour window has passed, reach out anytime — we will discuss the best path forward.

Jardin Roestorff
Founder, SMAIDM Digital Services
smaidmsagency@outlook.com | 082 266 0899`.trim();
}
