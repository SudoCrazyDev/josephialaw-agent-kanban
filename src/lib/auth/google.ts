/**
 * Google OAuth 2.0 — Authorization Code flow (server-side, with client_secret).
 * No PKCE since we hold the secret. Standard /authorize → /token → /userinfo dance.
 */

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL     = "https://oauth2.googleapis.com/token";
const USERINFO_URL  = "https://www.googleapis.com/oauth2/v3/userinfo";

export type GoogleUser = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name?: string;
  family_name?: string;
  hd?: string; // hosted domain (Workspace)
};

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not configured`);
  return v;
}

export function buildAuthorizeUrl(args: { state: string; redirectUri: string }): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", getEnv("GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", args.state);
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("access_type", "online");
  return url.toString();
}

export async function exchangeCodeForToken(args: {
  code: string;
  redirectUri: string;
}): Promise<{ access_token: string; id_token: string; expires_in: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     getEnv("GOOGLE_CLIENT_ID"),
      client_secret: getEnv("GOOGLE_CLIENT_SECRET"),
      code:          args.code,
      redirect_uri:  args.redirectUri,
      grant_type:    "authorization_code"
    })
  });
  if (!res.ok) {
    throw new Error(`google_token_exchange_failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function fetchGoogleUser(accessToken: string): Promise<GoogleUser> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    throw new Error(`google_userinfo_failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}
