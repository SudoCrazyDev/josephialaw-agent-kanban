/**
 * Optional allow-list. If neither AUTH_ALLOWED_EMAILS nor AUTH_ALLOWED_DOMAINS
 * is set, any verified Google account can sign in. Set one (or both) for
 * an internal-tool deployment.
 *
 *   AUTH_ALLOWED_DOMAINS=josephialaw.com,divorcewithaplan.com
 *   AUTH_ALLOWED_EMAILS=info@josephialaw.com,founder@example.com
 */

function splitEnv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string): boolean {
  const allowedEmails  = splitEnv("AUTH_ALLOWED_EMAILS");
  const allowedDomains = splitEnv("AUTH_ALLOWED_DOMAINS");

  if (allowedEmails.length === 0 && allowedDomains.length === 0) return true;

  const lower = email.toLowerCase();
  if (allowedEmails.includes(lower)) return true;
  const domain = lower.split("@")[1] ?? "";
  return allowedDomains.includes(domain);
}
