export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Calendly booking link for the main strategy call CTA.
 * Set VITE_CALENDLY_URL in your environment to override.
 * The default points to the SMAIDM Calendly page once it is created.
 */
export const CALENDLY_URL =
  (import.meta.env.VITE_CALENDLY_URL as string | undefined) ??
  "https://calendly.com/smaidm/strategy-call";

// Generate login URL at runtime so redirect URI reflects the current origin.
// Returns a safe fallback when OAuth env vars are not configured (e.g. self-hosted deployments).
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // If OAuth is not configured, return the current page (no-op redirect)
  if (!oauthPortalUrl || !appId) {
    return typeof window !== "undefined" ? window.location.href : "/";
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
