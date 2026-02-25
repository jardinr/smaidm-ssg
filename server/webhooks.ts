/**
 * Zapier Webhook Integration
 *
 * Fires a POST request to the configured ZAPIER_WEBHOOK_URL whenever a new
 * audit lead is captured. In Zapier, this triggers a "Catch Hook" step which
 * can then send an email, add a row to Google Sheets, post to Slack, etc.
 *
 * Setup:
 *   1. Create a Zap: Trigger = "Webhooks by Zapier" → "Catch Hook"
 *   2. Copy the webhook URL Zapier gives you
 *   3. Add it as the ZAPIER_WEBHOOK_URL secret in Manus Secrets
 *   4. Set the Action to "Gmail / Outlook" → "Send Email" → to smaidmsagency@outlook.com
 */

export interface AuditLeadPayload {
  email: string | null;
  businessName: string | null;
  contactName: string | null;
  phone: string | null;
  url: string;
  overallScore: number | null;
  seoScore: number | null;
  sgoScore: number | null;
  geoScore: number | null;
  tier: string | null;
  upgradeCost?: string;
  isDemoMode: boolean;
  followUpDraft?: string;
  submittedAt: string; // ISO 8601
}

/**
 * Sends the audit lead payload to the Zapier webhook.
 * Silently swallows errors so a webhook failure never blocks the audit response.
 */
export async function fireZapierWebhook(payload: AuditLeadPayload): Promise<void> {
  const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;

  if (!webhookUrl) {
    // Not configured — skip silently
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000), // 8 s max — don't block the audit
    });

    if (!response.ok) {
      console.warn(`[Zapier] Webhook responded with ${response.status}`);
    } else {
      console.log(`[Zapier] Webhook fired successfully for ${payload.email ?? payload.url}`);
    }
  } catch (err) {
    // Network errors, timeouts, etc. — non-fatal
    console.warn("[Zapier] Webhook call failed (non-fatal):", err);
  }
}
